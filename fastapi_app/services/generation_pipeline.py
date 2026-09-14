"""Конвейер ИИ-генерации диалектического конспекта.

Один класс `GenerationPipeline` ведёт весь путь: заземление (вики) → скелет-
план → потоковая генерация всех шагов → судья → редакторский проход →
постпроцесс (заголовки-суть, исторические справки, имя конспекта, вывод для
якоря) → отчёт о качестве прогона. Маршрутизацию запросов и пошаговые
операции держит `ai_router_service.ConspectusRouter` поверх этого.
"""
import logging
import re
import time
from typing import Dict

from fastapi_app.config import settings
from fastapi_app.services.context_builder import (
    expected_step_keys, thesis_for_key, transition_hint_for_key, _detect_domain,
)
from fastapi_app.services.llm_provider import get_last_call_info
from fastapi_app.i18n import get_translator

logger = logging.getLogger(__name__)

# Провайдер, с которого ДОЛЖНА идти основная генерация (первый в TASK_ROUTES
# step_stream). Если фактический другой — значит упали на резерв, качество
# может просесть, и это надо показать пользователю (а не молчать).
_PRIMARY_GEN_PROVIDER = "GigaChat"
_MIN_STEP_CHARS = 120  # короче — процесс, похоже, оборвался

# Ключ шага: "1".."5" (один процесс) или "N.k" (несколько процессов на шаге,
# см. expected_step_keys/9_скелет_конспекта_промпт.md).
_STEP_MARK = re.compile(r"===\s*ШАГ\s*([1-5](?:\.\d+)?)\s*===")

# Этап 4.3 плана: на количественном домене Шаг 5 должен доходить до числа с
# единицей измерения, а не оставаться на уровне общей формулы/декларации.
# Список единиц не исчерпывающий (см. план_радикального_улучшения.md п. 4.3:
# "число с единицей" — достаточный, не обязательно ИСЧЕРПЫВАЮЩИЙ признак).
_NUMBER_UNIT_RE = re.compile(
    r"\d[\d\s.,]*\s*(°|%|км|м²|м³|мм|см|м\b|кг|г\b|мг|т\b|с\b|мс|мин|ч\b|сут|лет|год|дн|"
    r"руб|\$|€|Дж|кДж|Н\b|Вт|кВт|Гц|Па|В\b|А\b|Ом|К\b|моль|л\b|мл)",
    re.IGNORECASE,
)


def _sort_key(key: str) -> list:
    return [int(p) for p in key.split(".")]


def _base_of(key: str) -> str:
    return key.split(".")[0]


# gpt-oss-120b на Cerebras иногда роняет обратный слэш в LaTeX-командах, и
# управляющий символ (\r \f \t \b \a \v) уходит в текст как есть: \rho → CR+ho,
# \frac → FF+rac, \to → TAB+o, \bullet → BS+ullet. В нашем выводе этих символов
# быть не может (ни таблиц, ни переводов страниц), поэтому чиним 1:1 — символ
# обратно в \r/\f/… , и команда LaTeX восстанавливается.
_CTRL_TO_BACKSLASH = {"\r": "\\r", "\f": "\\f", "\t": "\\t", "\x08": "\\b", "\x07": "\\a", "\x0b": "\\v"}
# \n (0x0A) не трогаем как символ (это настоящие переводы строк), но чиним
# конкретные команды, где перед латинским хвостом стоит перенос.
_NL_LATEX_RE = re.compile(r"\n(?=(?:abla|eq|otin|u|leq|geq|i|ni|par)\b)")
# gpt-oss иногда пишет прямо неверную команду вместо \cdot — чиним отдельно.
_LATEX_TYPOS = ((r"\bdots", r"\cdots"), (r"\bdot", r"\cdot"))


def _fix_math(txt: str) -> str:
    if not txt:
        return txt
    for ctrl, rep in _CTRL_TO_BACKSLASH.items():
        if ctrl in txt:
            txt = txt.replace(ctrl, rep)
    txt = _NL_LATEX_RE.sub(r"\\n", txt)
    for bad, good in _LATEX_TYPOS:
        if bad in txt:
            txt = txt.replace(bad, good)
    return txt


# Потолки на длину ОТВЕТА по фазам (не размер входа).
# ВАЖНО (2026-09-07, пересмотр): раньше all_steps держали на 3400, чтобы
# вход+выход влезали в лимит Groq gpt-oss-120b (8000 токенов/мин на всё
# вместе) — это давало ~2500 символов на ВЕСЬ конспект (детский, обрубленный
# вывод). Теперь основная генерация идёт первой на Cerebras (см. TASK_ROUTES
# step_stream) — стены 8000 нет, поэтому потолки подняты под нормальный
# объём: развёрнутый переход на каждом шаге, а не 3 предложения.
_MAX_TOKENS = {
    # 1200 хватало на голые тезисы; поля вывода (что свёрнуто/что развёрнуто/
    # обратный ход/чем обходится/в чём несовместимость/что снимает — см.
    # аудит 2026-09-12, пункт А) занимают заметно больше места.
    # 2026-09-14: на high-effort 2600 не хватало вообще никогда — обрыв на
    # середине step1 ({} на выходе на всех трёх тестовых темах). Матрица
    # замеров показала: high+8000 и medium+2600 оба чинят обрыв; подняли
    # потолок, а не понизили effort — see план_радикального_улучшения.md п.1.1.
    "skeleton": 8000,
    # all_steps: до 4 развивающих процессов на Шаге 2 + вывод/доказательство
    # на каждом шаге (9_скелет + 8_генератор «показывай, а не рассказывай»)
    # — конспект стал длиннее; Cerebras стены 8000 не имеет.
    "all_steps": 13000,
    "step": 2600,
    "step5": 3800,
    # 700 хватало на low; medium-reasoning тратит часть бюджета на сами
    # рассуждения до JSON-ответа — подняли, чтобы вывод не обрезался.
    "judge": 1000,
    "history": 2000,
}



# Многопроходный поиск простейшего процесса (см. 1_главный_промпт.md п. 6.2.1):
# столько раз пробуем целиком пересобрать конспект с другим простейшим
# процессом, если судья отклоняет предыдущую попытку. 2 (не 3): каждый ретрай
# = скелет + все шаги + судья заново, а на бесплатных лимитах это дорого.
_MAX_GENERATION_ATTEMPTS = 2

# Поблочная архитектура скелета (см. gen_skeleton, обсуждение 2026-09-14):
# каждый Шаг 1-5 — отдельная пара вызовов генерация+независимая валидация,
# видящая ПОЛНЫЙ контекст уже построенных предыдущих шагов. Каждая стадия
# дешева (~1-3k токенов), но их до 5, и на "трудных" темах без явной
# оппозиции валидатор может честно отклонять несколько раз подряд — отсюда
# 3 попытки на стадию (при 2 иногда не хватало, см. тему "энтропия" в
# прототипировании). В худшем случае это 5 стадий × 3 попытки × 2 вызова
# (генерация+валидация) = до 30 коротких вызовов вместо одного вызова на
# 13k токенов — но большинство тем проходят стадии с 1-2 попыток.
_MAX_STAGE_RETRIES = 3
# 2026-09-14, прод-инцидент: на 3000 с reasoning_effort="high" GigaChat
# стабильно (не изредка — детерминированно на одном и том же промпте)
# тратил весь бюджет на рассуждения и возвращал валидный, но ПУСТОЙ
# "step1": {} — не обрыв JSON (тот случай уже ловится retry), а тихая
# порча содержимого, которая иногда проходит как "не распарсился" (если
# модель обрывается раньше), иногда как пустой валидный объект. Тот же
# класс проблемы, что чинили в Этапе 0 для старой схемы (см. _MAX_TOKENS
# ["skeleton"] выше) — только теперь на каждую стадию отдельно. Проверено:
# 6000 воспроизводимо чинит именно этот случай ("теорема пифагора").
_STAGE_MAX_TOKENS = 6000
# Если для выбранного Шага 1 не нашлось противоположного (Шаг 3) — или
# сломалась любая из следующих стадий — пробуем ДРУГОЙ простейший процесс,
# а не проваливаем весь скелет молча (см. gen_skeleton, наблюдение
# 2026-09-14: "теорема Пифагора" дважды подряд получала один и тот же
# Шаг 1 и там же застревала). 2 попытки плана — каждая уже сама по себе
# состоит из нескольких стадий с ретраями, дороже не поднимаем.
_MAX_PLAN_ATTEMPTS = 2


def _validate_skeleton(skeleton: dict, raw_goal: str) -> str:
    """Дешёвая детерминированная проверка структуры скелета до того, как на
    его основе потратятся 13k токенов на полный текст. Возвращает пустую
    строку, если всё в порядке, иначе — короткое описание первой найденной
    проблемы (уходит обратно в промпт архитектору на повторной попытке).
    Скелет с `applicable: false` не проверяется — он намеренно неполный."""
    if not isinstance(skeleton, dict) or not skeleton:
        return "пустой ответ"
    if skeleton.get("applicable") is False:
        return ""

    goal_as_process = (skeleton.get("goal_as_process") or "").strip()
    if not goal_as_process:
        return "goal_as_process пуст"
    if goal_as_process.strip().lower() == (raw_goal or "").strip().lower():
        return "goal_as_process совпадает с сырым запросом — цель не переформулирована в процесс"

    for i in range(1, 6):
        key = str(i)
        if not thesis_for_key(skeleton, key).strip():
            return f"шаг {i}: пустой thesis"
        if not transition_hint_for_key(skeleton, key).strip():
            return f"шаг {i}: не заполнено поле перехода"

    step2 = skeleton.get("step2", {})
    sub_steps = (step2.get("sub_steps") or []) if isinstance(step2, dict) else []
    if not sub_steps:
        return ("шаг 2: sub_steps пуст — развивающий процесс всего один, "
                "а нужно минимум два (см. 9_скелет_конспекта_промпт.md)")

    return ""


class GenerationPipeline:
    def __init__(self, ai_service, context_builder, sanitizer, rag_manager):
        self.ai_service = ai_service
        self.context_builder = context_builder
        self.sanitizer = sanitizer
        self.rag_manager = rag_manager

    # ------------------------------------------------------------------ #
    #  Публичные помощники (нужны роутеру для пошаговых операций)          #
    # ------------------------------------------------------------------ #

    async def ground(self, state: dict) -> None:
        """Одноразово подтягивает справку по теме (ru.wikipedia) в state['reference']
        для заземления фактов. Тихо ничего не делает, если темы в вики нет."""
        if state.get("reference") is not None:
            return
        try:
            ref = await self.rag_manager.reference_for(state.get("target_goal", ""))
        except Exception:  # noqa: BLE001 — fail-open
            ref = ""
        state["reference"] = ref or ""

    async def gen_json(self, sys_prompt: str, user_msg: str, key: str, max_tokens: int) -> str:
        """Генерация JSON без строгого response_format (Groq gpt-oss часто валит его
        валидатор и уходит в медленный fallback). JSON вытаскиваем санитайзером,
        одна повторная попытка при провале."""
        for _attempt in range(2):
            raw = await self.ai_service._generate(
                sys_prompt, user_msg, None, max_tokens=max_tokens, temperature=0.4,
                use_cache=False, task="step_stream",
            )
            try:
                parsed = self.sanitizer.extract_json(raw)
                value = parsed.get(key) or parsed.get(key.replace("step", "step ")) or ""
                if isinstance(value, str) and value.strip():
                    return value.strip()
                if value:
                    return str(value)
            except ValueError:
                pass
        return ""

    async def _gen_stage_json(self, prompt: str, user_msg: str, max_tokens: int = _STAGE_MAX_TOKENS):
        """Один вызов + парсинг JSON для стадии поблочной архитектуры.
        None — провал (сеть/не-JSON), отличается от {} (валидный пустой)."""
        raw = await self.ai_service._generate(
            prompt, user_msg, None, max_tokens=max_tokens, temperature=0.3, fast=False,
            use_cache=False, task="skeleton", reasoning_effort=settings.LLM_REASONING_EFFORT_SKELETON,
        )
        try:
            parsed = self.sanitizer.extract_json(raw)
        except ValueError:
            return None
        return parsed if isinstance(parsed, dict) else None

    async def gen_skeleton(self, state: dict, locale: str, failed_attempts: list = None) -> dict:
        """План-скелет — поблочная архитектура (см. обсуждение 2026-09-14):
        каждый Шаг (1-5) строится ОТДЕЛЬНЫМ вызовом, видя ПОЛНОЕ содержимое
        уже построенных предыдущих шагов (не угадывая вслепую, как в
        откаченной двухфазной схеме — см. историю правок ниже), и сразу
        проверяется НЕЗАВИСИМЫМ вызовом-валидатором (промпты 11-20). Если
        валидатор отклонил — стадия перезапрашивается с явным перечислением
        отклонённых тезисов (иначе модель просто переформулирует тот же
        тезис другими словами, см. наблюдение на теме "энтропия").

        2026-09-14, история: сначала пробовали двухфазный поиск (фаза A —
        развёртывание кандидатов вслепую, фаза B — обнаружение оппозиции
        среди них) — откатили: честная фаза B находила оппозицию только в
        1 из 3 тестовых тем. Поблочная архитектура устраняет саму причину
        провала — каждая стадия видит полный конкретный контекст, а не
        список тезисов в одну строку. Проверено на 3 темах: теорема
        Пифагора прошла все 5 стадий с высоким качеством, "почему хлеб
        черствеет"/"энтропия" иногда упираются в честный отказ (валидатор
        не пропускает слабый Шаг 1 или ненайденную оппозицию) — это
        ожидаемо и предпочтительнее молчаливой деградации.

        Не критично — при провале любой стадии возвращаем {} (то же
        поведение, что и раньше: пустой скелет ловится дальше по конвейеру
        через report["reasons"] = "missing_blocks"/degraded, а не молча).
        failed_attempts — прошлые попытки, отклонённые судьёй ПО ГОТОВОМУ
        ТЕКСТУ (старый механизм на уровне всего конспекта, см.
        judge_conspect/п. 6.2.1 главного промпта) — добавляются к списку
        отклонённых тезисов Шага 1, чтобы архитектор не повторял тот же
        простейший процесс и на этом уровне ретрая тоже."""
        raw_goal = state.get("target_goal", "")
        rejected1 = [{"thesis": a.get("thesis1", ""), "reason": a.get("reason", "")} for a in (failed_attempts or [])]

        for plan_attempt in range(1, _MAX_PLAN_ATTEMPTS + 1):
            # --- Шаг 1: простейший процесс ---
            step1 = None
            goal_as_process = ""
            applicability_reason = ""
            for attempt in range(1, _MAX_STAGE_RETRIES + 1):
                prompt1 = await self.context_builder.build_step1_prompt(state, rejected=rejected1)
                result1 = await self._gen_stage_json(prompt1, f"Выполни Шаг 1. Верни только JSON. Язык: {locale}")
                if result1 is None:
                    logger.warning("gen_skeleton Шаг1: JSON не распарсился (попытка %d/%d), goal=%r",
                                    attempt, _MAX_STAGE_RETRIES, raw_goal)
                    rejected1.append({"thesis": "?", "reason": "предыдущий ответ не был валидным JSON"})
                    continue
                if result1.get("applicable") is False:
                    return result1  # намеренно неполный скелет — гейт применимости сработал
                goal_as_process = result1.get("goal_as_process", "")
                applicability_reason = result1.get("applicability_reason", "")
                candidate1 = result1.get("step1") or {}
                val1_prompt = await self.context_builder.build_step1_validation_prompt(goal_as_process, candidate1)
                val1 = await self._gen_stage_json(val1_prompt, f"Провалидируй Шаг 1. Верни только JSON. Язык: {locale}")
                if val1 and val1.get("valid"):
                    step1 = candidate1
                    break
                reason = (val1 or {}).get("reason", "валидатор не смог ответить")
                logger.warning("gen_skeleton Шаг1: отклонён (попытка %d/%d), goal=%r, thesis=%r: %s",
                                attempt, _MAX_STAGE_RETRIES, raw_goal, candidate1.get("thesis", ""), reason)
                rejected1.append({"thesis": candidate1.get("thesis", ""), "reason": reason})
            if not step1:
                logger.warning("gen_skeleton: Шаг1 не прошёл ни одной попытки, goal=%r", raw_goal)
                return {}

            # --- Шаг 2: развитие простейшего процесса ---
            blocks = None
            rejected2 = []
            for attempt in range(1, _MAX_STAGE_RETRIES + 1):
                prompt2 = await self.context_builder.build_step2_prompt(
                    step1.get("thesis", ""), goal_as_process, rejected=rejected2)
                result2 = await self._gen_stage_json(prompt2, f"Выполни Шаг 2. Верни только JSON. Язык: {locale}")
                if result2 is None:
                    rejected2.append({"blocks": [], "reason": "предыдущий ответ не был валидным JSON"})
                    continue
                candidate2 = [b for b in (result2.get("blocks") or []) if isinstance(b, dict) and b.get("id")]
                val2_prompt = await self.context_builder.build_step2_validation_prompt(
                    step1.get("thesis", ""), goal_as_process, candidate2)
                val2 = await self._gen_stage_json(val2_prompt, f"Провалидируй Шаг 2. Верни только JSON. Язык: {locale}")
                if val2 and val2.get("valid") and len(candidate2) >= 2:
                    blocks = candidate2
                    break
                reason = (val2 or {}).get("reason") or ("нужно минимум 2 блока" if len(candidate2) < 2 else "валидатор не смог ответить")
                logger.warning("gen_skeleton Шаг2: отклонён (попытка %d/%d), goal=%r: %s",
                                attempt, _MAX_STAGE_RETRIES, raw_goal, reason)
                rejected2.append({"blocks": [b.get("thesis", "") for b in candidate2], "reason": reason})
            if not blocks:
                logger.warning("gen_skeleton: Шаг2 не прошёл ни одной попытки (план %d/%d), goal=%r",
                                plan_attempt, _MAX_PLAN_ATTEMPTS, raw_goal)
                rejected1.append({"thesis": step1.get("thesis", ""),
                                  "reason": "развитие простейшего процесса не удалось построить"})
                continue

            # --- Шаг 3: противоположный процесс ---
            step3 = None
            rejected3 = []
            for attempt in range(1, _MAX_STAGE_RETRIES + 1):
                prompt3 = await self.context_builder.build_step3_prompt(step1.get("thesis", ""), blocks, rejected=rejected3)
                result3 = await self._gen_stage_json(prompt3, f"Выполни Шаг 3. Верни только JSON. Язык: {locale}")
                if result3 is None:
                    rejected3.append({"thesis": "?", "reason": "предыдущий ответ не был валидным JSON"})
                    continue
                candidate3 = result3.get("step3") or {}
                val3_prompt = await self.context_builder.build_step3_validation_prompt(
                    step1.get("thesis", ""), blocks, candidate3)
                val3 = await self._gen_stage_json(val3_prompt, f"Провалидируй Шаг 3. Верни только JSON. Язык: {locale}")
                if val3 and val3.get("valid"):
                    step3 = candidate3
                    break
                reason = (val3 or {}).get("reason", "валидатор не смог ответить")
                logger.warning("gen_skeleton Шаг3: отклонён (попытка %d/%d), goal=%r, thesis=%r: %s",
                                attempt, _MAX_STAGE_RETRIES, raw_goal, candidate3.get("thesis", ""), reason)
                rejected3.append({"thesis": candidate3.get("thesis", ""), "reason": reason})
            if not step3:
                # Именно эта развилка (п. 4.5) на практике самая ненадёжная:
                # честная фаза может не найти оппозицию для ВЫБРАННОГО Шага 1,
                # хотя для другого простейшего процесса она нашлась бы легко.
                # Вместо тихого провала всего скелета — помечаем этот Шаг 1
                # как отклонённый (с явной причиной) и пробуем ДРУГОЙ простейший
                # процесс на следующей итерации plan_attempt, а не тот же самый
                # (см. обсуждение 2026-09-14: "теорема Пифагора" дважды подряд
                # получала один и тот же Шаг 1 и там же и застревала).
                logger.warning("gen_skeleton: Шаг3 не найден для Шага1=%r (план %d/%d), goal=%r — пробуем другой Шаг1",
                                step1.get("thesis", ""), plan_attempt, _MAX_PLAN_ATTEMPTS, raw_goal)
                rejected1.append({"thesis": step1.get("thesis", ""),
                                  "reason": "для этого простейшего процесса не нашлось противоположного"})
                continue

            # --- Шаг 4: противоречие ---
            step4 = None
            rejected4 = []
            for attempt in range(1, _MAX_STAGE_RETRIES + 1):
                prompt4 = await self.context_builder.build_step4_prompt(step1.get("thesis", ""), step3, rejected=rejected4)
                result4 = await self._gen_stage_json(prompt4, f"Выполни Шаг 4. Верни только JSON. Язык: {locale}")
                if result4 is None:
                    rejected4.append({"thesis": "?", "reason": "предыдущий ответ не был валидным JSON"})
                    continue
                candidate4 = result4.get("step4") or {}
                val4_prompt = await self.context_builder.build_step4_validation_prompt(
                    step1.get("thesis", ""), step3.get("thesis", ""), candidate4)
                val4 = await self._gen_stage_json(val4_prompt, f"Провалидируй Шаг 4. Верни только JSON. Язык: {locale}")
                if val4 and val4.get("valid"):
                    step4 = candidate4
                    break
                reason = (val4 or {}).get("reason", "валидатор не смог ответить")
                logger.warning("gen_skeleton Шаг4: отклонён (попытка %d/%d), goal=%r: %s",
                                attempt, _MAX_STAGE_RETRIES, raw_goal, reason)
                rejected4.append({"thesis": candidate4.get("thesis", ""), "reason": reason})
            if not step4:
                logger.warning("gen_skeleton: Шаг4 не построен для Шага1=%r/Шага3=%r (план %d/%d), goal=%r — пробуем другой Шаг1",
                                step1.get("thesis", ""), step3.get("thesis", ""), plan_attempt, _MAX_PLAN_ATTEMPTS, raw_goal)
                rejected1.append({"thesis": step1.get("thesis", ""),
                                  "reason": "противоречие с найденным противоположным процессом не построилось"})
                continue

            # --- Шаг 5: разрешение ---
            step5 = None
            rejected5 = []
            for attempt in range(1, _MAX_STAGE_RETRIES + 1):
                prompt5 = await self.context_builder.build_step5_prompt(
                    step1.get("thesis", ""), step3.get("thesis", ""), step4, rejected=rejected5)
                result5 = await self._gen_stage_json(prompt5, f"Выполни Шаг 5. Верни только JSON. Язык: {locale}")
                if result5 is None:
                    rejected5.append({"thesis": "?", "reason": "предыдущий ответ не был валидным JSON"})
                    continue
                candidate5 = result5.get("step5") or {}
                val5_prompt = await self.context_builder.build_step5_validation_prompt(step4, candidate5)
                val5 = await self._gen_stage_json(val5_prompt, f"Провалидируй Шаг 5. Верни только JSON. Язык: {locale}")
                if val5 and val5.get("valid"):
                    step5 = candidate5
                    break
                reason = (val5 or {}).get("reason", "валидатор не смог ответить")
                logger.warning("gen_skeleton Шаг5: отклонён (попытка %d/%d), goal=%r: %s",
                                attempt, _MAX_STAGE_RETRIES, raw_goal, reason)
                rejected5.append({"thesis": candidate5.get("thesis", ""), "reason": reason})
            if not step5:
                logger.warning("gen_skeleton: Шаг5 не найден для Шага1=%r (план %d/%d), goal=%r — пробуем другой Шаг1",
                                step1.get("thesis", ""), plan_attempt, _MAX_PLAN_ATTEMPTS, raw_goal)
                rejected1.append({"thesis": step1.get("thesis", ""),
                                  "reason": "разрешение противоречия не найдено"})
                continue

            # --- Сборка в старом формате (step1..step5), совместимом с остальным конвейером ---
            main_block, sub_blocks = blocks[0], blocks[1:]
            # Сохраняем реальную иерархию (кто из кого растёт, п. 4.4.1) —
            # id→ключ, чтобы "растёт_из" можно было резолвить в конкретный
            # ключ шага ("2.2") при генерации ТЕКСТА, а не терять связь на
            # плоском списке sub_steps (см. обсуждение 2026-09-14, Этап 4.2
            # плана). "2.1" — главный тезис (blocks[0]), "2.2", "2.3", ... —
            # sub_steps по порядку (см. expected_step_keys/thesis_for_key).
            id_to_key = {main_block.get("id"): "2.1"}
            for idx, b in enumerate(sub_blocks, start=2):
                id_to_key[b.get("id")] = f"2.{idx}"

            sub_steps_out = []
            for b in sub_blocks:
                entry = {"thesis": b.get("thesis", ""), "разворачивает": b.get("разворачивает", ""),
                         "обратный_ход": b.get("обратный_ход", "")}
                parent_key = id_to_key.get(b.get("grows_from"))
                if parent_key:
                    entry["растёт_из"] = parent_key
                sub_steps_out.append(entry)

            skeleton = {
                "goal_as_process": goal_as_process,
                "applicable": True,
                "applicability_reason": applicability_reason,
                "step1": {"thesis": step1.get("thesis", ""), "sub_steps": [],
                          "потенциально_содержит": step1.get("потенциально_содержит", "")},
                "step2": {
                    "thesis": main_block.get("thesis", ""),
                    "sub_steps": sub_steps_out,
                    "разворачивает": main_block.get("разворачивает", ""),
                    "обратный_ход": main_block.get("обратный_ход", ""),
                },
                "step3": {"thesis": step3.get("thesis", ""), "sub_steps": [],
                          "обходится_без": step3.get("обходится_без", "")},
                "step4": {"thesis": step4.get("thesis", ""), "sub_steps": [],
                          "несовместимость": step4.get("несовместимость", "")},
                "step5": {"thesis": step5.get("thesis", ""), "sub_steps": [],
                          "скачок": step5.get("скачок", "")},
            }
            problem = _validate_skeleton(skeleton, raw_goal)
            if problem:
                logger.warning("gen_skeleton: собранный скелет не прошёл финальную проверку, goal=%r: %s",
                                raw_goal, problem)
                rejected1.append({"thesis": step1.get("thesis", ""), "reason": problem})
                continue
            return skeleton

        logger.warning("gen_skeleton: все %d попытки плана провалены, goal=%r", _MAX_PLAN_ATTEMPTS, raw_goal)
        return {}

    async def judge_conspect(self, collected: Dict[str, str], locale: str) -> tuple:
        """Оценка судьёй: настоящее ли противоречие получилось. Если судья
        сам не смог ответить (плохой JSON) — не блокируем пользователя,
        считаем валидным (см. судья_противоречия.md: "если сомневаетесь —
        засчитывайте как валидное" — тот же принцип и для сбоя самого судьи).

        Возвращает (is_valid, reason, bad_steps). bad_steps — опциональный
        список номеров шагов ("1".."5"), которые судья указал как разрушающие
        переход (поле `bad_transitions` в ответе судьи, если промпт его
        просит — см. аудит 2026-09-12, пункт Ж). Если поля нет или судья на
        старом формате ответа — bad_steps пуст, и вызывающий код падает
        обратно на полный пересбор конспекта (старое поведение)."""
        judge_prompt = await self.context_builder.build_judge_prompt(collected)
        raw = await self.ai_service._generate(
            judge_prompt, f"Оцени конспект. Верни только JSON. Язык: {locale}",
            None, max_tokens=_MAX_TOKENS["judge"], temperature=0.2, use_cache=False,
            task="judge", reasoning_effort=settings.LLM_REASONING_EFFORT_JUDGE,
        )
        try:
            parsed = self.sanitizer.extract_json(raw)
            is_valid = bool(parsed.get("is_valid", True))
            reason = str(parsed.get("reason", "") or "")
            bad_raw = parsed.get("bad_transitions") or []
            bad_steps = sorted({
                str(b).strip() for b in bad_raw
                if str(b).strip() in {"1", "2", "3", "4", "5"}
            }) if isinstance(bad_raw, list) else []
            return is_valid, reason, bad_steps
        except ValueError:
            return True, "", []

    async def regen_step(self, state: dict, step_idx: int, thesis: str, locale: str,
                         question: str = None, skeleton: dict = None) -> str:
        prompt = await self.context_builder.build_step_prompt(
            state, step_idx, question=question, skeleton=skeleton or None,
        )
        if thesis:
            prompt += f"\nРЕКОМЕНДУЕМЫЙ ТЕЗИС ОТ АРХИТЕКТОРА: {thesis}\n"
        max_tokens = _MAX_TOKENS["step5"] if step_idx == 5 else _MAX_TOKENS["step"]
        return await self.gen_json(
            prompt, f"Генерируй шаг {step_idx}. Язык: {locale}", f"step{step_idx}", max_tokens
        )

    async def regen_process(self, state: dict, key: str, skeleton: dict, locale: str) -> str:
        """Добор одного пропущенного процесса по ключу ("1", "2.2", ...) —
        для бесшовных (без точки) ключей просто зовёт regen_step, для
        составных использует build_process_prompt (несколько процессов на шаге)."""
        base = int(_base_of(key))
        if "." not in key:
            plan = skeleton.get(f"step{base}", {})
            thesis = plan.get("thesis", "") if isinstance(plan, dict) else ""
            return await self.regen_step(state, base, thesis, locale, skeleton=skeleton)

        prompt = await self.context_builder.build_process_prompt(state, key, skeleton)
        max_tokens = _MAX_TOKENS["step5"] if base == 5 else _MAX_TOKENS["step"]
        return await self.gen_json(
            prompt, f"Генерируй процесс. Язык: {locale}", "process", max_tokens
        )

    # ------------------------------------------------------------------ #
    #  Полная генерация                                                   #
    # ------------------------------------------------------------------ #

    async def _generate_full_attempt(self, state: dict, locale: str, use_skeleton: bool,
                                     failed_attempts: list, report: dict = None) -> tuple:
        """Одна полная попытка собрать все процессы всех шагов — ПОБЛОЧНО
        (см. обсуждение 2026-09-14, симметрично поблочной архитектуре
        скелета в gen_skeleton): каждый ключ ("1", "2.1", "2.2", "3", "4",
        "5" — см. expected_step_keys) генерируется ОТДЕЛЬНЫМ вызовом через
        regen_process, который видит ПОЛНЫЙ уже написанный текст предыдущих
        шагов (через build_step_prompt/build_process_prompt →
        _compile_previous_steps), а не только тезисы плана. Раньше весь
        текст шёл одним вызовом на 13k токенов — Шаг 4 (смысловой центр)
        оказывался в хвосте длинной генерации без своего сфокусированного
        контекста; теперь у каждого шага свой вызов с чистым контекстом.

        Используется внутри цикла судьи в stream_generate_full (без
        прогрессивной выдачи наружу — та по-прежнему одна пачка в конце,
        после того как судья одобрит попытку целиком). Возвращает
        (collected, skeleton): skeleton нужен вызывающему коду для точечного
        ретрая по ключам судьи (bad_transitions), без пересборки плана
        заново (см. judge_conspect).
        report (мутируется) — телеметрия: кто обслужил генерацию (провайдер
        первого блока), был ли фолбэк хоть у одного блока, сколько блоков
        потребовали повторной попытки."""
        report = report if report is not None else {}
        skeleton = await self.gen_skeleton(state, locale, failed_attempts=failed_attempts) if use_skeleton else {}
        if use_skeleton and not skeleton:
            # План запрашивался, но gen_skeleton честно провалил все стадии
            # (не "applicable: false" — тот случай отдельно проверяется
            # вызывающим кодом, а просто "не нашли" на Шаге 1/2/3/4/5). Это
            # НЕ повод писать текст без плана ("генератор без плана" — корень
            # проблемы из диагностики плана, раздел 1.3): такой текст обычно
            # проходит судью, потому что судья не видит, что план тихо
            # подменили импровизацией. Возвращаем провал явно — вызывающий
            # цикл (stream_generate_full) уйдёт на новую попытку gen_skeleton
            # с нуля, а не молча сгенерирует правдоподобный, но не проверенный
            # текст.
            logger.warning("_generate_full_attempt: план не построен, текст без плана НЕ генерируем, goal=%r",
                            state.get("target_goal"))
            return {}, {}
        # Вторая попытка заземления: сырой запрос мог быть вопросом («почему…»)
        # и не резолвиться в вики. Пробуем по порядку более «статейные»
        # формулировки: цель-как-процесс, потом название простейшего процесса
        # (часто это чистое понятие — «хлорофилл», «рассеяние Рэлея»).
        if not state.get("reference") and isinstance(skeleton, dict):
            step1 = skeleton.get("step1", {})
            candidates = [
                (skeleton.get("goal_as_process") or "").strip(),
                (step1.get("thesis", "") if isinstance(step1, dict) else "").strip(),
            ]
            for term in candidates:
                if not term:
                    continue
                try:
                    ref = await self.rag_manager.reference_for(term)
                except Exception:  # noqa: BLE001 — fail-open
                    ref = ""
                if ref:
                    state["reference"] = ref
                    break

        # Отдельное "рабочее" состояние с собственным ["steps"]: каждый блок,
        # как только сгенерирован, кладётся сюда, чтобы следующий блок видел
        # его через _compile_previous_steps. В реальный state["steps"] всё
        # уходит одной пачкой в конце stream_generate_full (после судьи) —
        # так повторные попытки (другой простейший процесс) не засоряют
        # состояние пользователя промежуточным текстом отклонённой попытки.
        scratch_state = dict(state)
        scratch_state["steps"] = {}
        # Полный текст каждого уже сгенерированного процесса по его ключу
        # ("2.1", "2.2", ...) — отдельно от scratch_state["steps"] (там
        # только АГРЕГАТ по базовому шагу). Нужен build_process_prompt,
        # чтобы конкретный процесс мог получить РЕАЛЬНЫЙ текст своего
        # конкретного родителя (поле "растёт_из" в скелете), а не тезис в
        # одну строку — иначе иерархия абстрактное→конкретное (п. 4.4.1)
        # передаётся в текст только по названию, а не по содержанию.
        scratch_state["_process_texts"] = {}

        keys = expected_step_keys(skeleton) if skeleton else [str(i) for i in range(1, 6)]
        bases_order = []
        for k in keys:
            b = _base_of(k)
            if b not in bases_order:
                bases_order.append(b)

        collected: Dict[str, str] = {}
        providers: list = []
        fell_back_any = False
        regen = 0
        for base in bases_order:
            base_keys = [k for k in keys if _base_of(k) == base]
            parts = []
            for key in base_keys:
                content = await self.regen_process(scratch_state, key, skeleton, locale)
                if not content:
                    # Одна дополнительная попытка сверх внутреннего ретрая
                    # gen_json — на случай транзиентного сбоя провайдера.
                    content = await self.regen_process(scratch_state, key, skeleton, locale)
                    if content:
                        regen += 1
                info = get_last_call_info() or {}
                if info.get("provider"):
                    providers.append(info["provider"])
                fell_back_any = fell_back_any or bool(info.get("fell_back"))
                if content and base == "5":
                    # Этап 4.3 плана: на количественном домене Шаг 5 должен
                    # довести разрешение до конкретного числа с единицей, а
                    # не остаться декларацией/голой формулой. Проверяем
                    # только здесь (не весь текст) — это дешевле и точнее,
                    # чем гадать по всему конспекту постфактум.
                    goal_for_domain = ((skeleton.get("goal_as_process") if skeleton else "")
                                       or state.get("target_goal", ""))
                    domain = _detect_domain(goal_for_domain, *collected.values(), content)
                    if domain == "math_code" and not _NUMBER_UNIT_RE.search(content):
                        logger.info("Шаг5: нет числового примера на количественном домене, "
                                    "перегенерирую с явным требованием, goal=%r", state.get("target_goal"))
                        prompt5 = await self.context_builder.build_step_prompt(scratch_state, 5, skeleton=skeleton)
                        prompt5 += ("\n\nОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ: доведи разрешение до конкретного "
                                    "числового примера с единицей измерения (не общая формула, а число).")
                        retry = await self.gen_json(
                            prompt5, f"Генерируй шаг 5 с числовым примером. Язык: {locale}",
                            "step5", _MAX_TOKENS["step5"],
                        )
                        if retry:
                            content = retry
                            regen += 1
                if content:
                    content = _fix_math(content)
                    collected[key] = content
                    parts.append(content)
                    scratch_state["_process_texts"][key] = content
            if parts:
                scratch_state["steps"][f"step{base}"] = {
                    "content": "\n\n".join(parts), "status": "ready", "author": "ai", "sub_steps": [],
                }

        report["gen_provider"] = providers[0] if providers else None
        report["gen_fell_back"] = fell_back_any
        report["regen"] = regen

        return collected, skeleton

    @staticmethod
    def _complete_steps(buf: str, final: bool) -> Dict[str, str]:
        """Из накопленного буфера с маркерами ===ШАГN=== / ===ШАГN.k=== достаёт
        тексты тех процессов, которые уже полностью получены (есть следующий
        маркер, либо поток завершён)."""
        marks = list(_STEP_MARK.finditer(buf))
        out: Dict[str, str] = {}
        for i, m in enumerate(marks):
            key = m.group(1)
            start = m.end()
            if i + 1 < len(marks):
                end, done = marks[i + 1].start(), True
            else:
                end, done = len(buf), final
            if done:
                text = buf[start:end].strip().strip("`").strip()
                if text:
                    out[key] = text
        return out

    async def stream_generate_full(self, state: dict, locale: str, use_skeleton: bool = False,
                                   pinned_step: int = None, question: str = None):
        """Генератор (step_key, content) плюс служебные события ("__status__", текст)
        для UI-индикатора долгих операций.
        pinned_step + question (кнопка ❓ «перегенерировать с уточнением»):
        сначала сам зафиксированный шаг ПЕРЕПИСЫВАЕТСЯ с учётом уточнения
        (а не остаётся как есть), и только после этого остальные шаги
        перегенерируются согласованно с его ОБНОВЛЁННЫМ текстом. Для этого
        пути судья НЕ используется — это точечная правка, не поиск простейшего
        процесса заново.
        Без pinned_step — обычная полная генерация: до _MAX_GENERATION_ATTEMPTS
        попыток, судья (см. judge_conspect) проверяет каждую попытку целиком;
        при отклонении — новая попытка с ДРУГИМ простейшим процессом, прошлые
        отклонённые попытки передаются архитектору, чтобы не повторялись
        (1_главный_промпт.md п. 6.2.1)."""
        if "steps" not in state:
            state["steps"] = {}

        await self.ground(state)

        try:
            pinned = int(pinned_step) if pinned_step else None
        except (TypeError, ValueError):
            pinned = None

        if pinned:
            async for event in self._stream_pinned_regeneration(state, locale, pinned, question):
                yield event
            return

        _ = get_translator(locale)

        t0 = time.time()
        report: Dict = {"attempts": 0, "regen": 0, "judge": "skipped",
                        "gen_provider": None, "gen_fell_back": False}
        failed_attempts = []
        collected: Dict[str, str] = {}
        for attempt in range(1, _MAX_GENERATION_ATTEMPTS + 1):
            report["attempts"] = attempt
            if attempt > 1:
                yield ("__status__", _("gen_status_retry").format(n=attempt, total=_MAX_GENERATION_ATTEMPTS))
            elif use_skeleton:
                yield ("__status__", _("gen_status_planning"))

            collected, skeleton = await self._generate_full_attempt(
                state, locale, use_skeleton or attempt > 1, failed_attempts, report)
            
            if skeleton and skeleton.get("applicable") is False:
                logger.info("applicability gate: NOT applicable — %r", state.get("target_goal"))
                verdict = {
                    "applicable": False,
                    "reason": skeleton.get("applicability_reason", ""),
                }
                state["applicability"] = verdict
                yield ("__not_applicable__", verdict)
                return

            if not collected:
                continue

            yield ("__status__", _("gen_status_judging"))
            is_valid, reason, bad_steps = await self.judge_conspect(collected, locale)
            report["judge"] = "passed" if is_valid else "failed"
            if is_valid:
                break

            # Точечный ретрай (см. аудит 2026-09-12, пункт Ж): если судья
            # указал КОНКРЕТНЫЕ переходы (bad_transitions в его ответе — поле
            # опциональное, старый формат ответа просто не заполняет его) и
            # среди них нет Шага 1 (значит сам простейший процесс не под
            # вопросом, пересобирать план незачем) — переписываем только эти
            # шаги на том же скелете, не открывая новую полную попытку.
            if bad_steps and "1" not in bad_steps and skeleton:
                yield ("__status__", _("gen_status_fix_transition"))
                targeted = 0
                for base in bad_steps:
                    for key in expected_step_keys(skeleton):
                        if _base_of(key) != base:
                            continue
                        content = await self.regen_process(state, key, skeleton, locale)
                        if content:
                            collected[key] = _fix_math(content)
                            targeted += 1
                report["regen"] = report.get("regen", 0) + targeted
                if targeted:
                    is_valid, reason, bad_steps = await self.judge_conspect(collected, locale)
                    report["judge"] = "passed" if is_valid else "failed"
                    if is_valid:
                        break

            if attempt == _MAX_GENERATION_ATTEMPTS:
                break
            step1_summary = " / ".join(c for k, c in collected.items() if _base_of(k) == "1")[:200]
            failed_attempts.append({"thesis1": step1_summary, "reason": reason})

        for key in sorted(collected.keys(), key=_sort_key):
            content = collected.get(key)
            if content:
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)

        # Доп. проход: заголовки-суть по шагам + имя конспекта и итоговый
        # вывод для блока-якоря.
        if collected:
            yield ("__status__", _("gen_status_postprocess"))
            titles, meta = await self._gen_postprocess(state, collected, locale)
            if titles:
                state["step_titles"] = titles
                yield ("__titles__", titles)
            if meta:
                state["note_meta"] = meta
                yield ("__note_meta__", meta)

        yield ("__report__", self._finalize_report(report, collected, t0))

    @staticmethod
    def _finalize_report(report: dict, collected: Dict[str, str], t0: float) -> dict:
        """Достроить отчёт (degraded/reasons/метрики) и залогировать. Общий для
        основного пути и pinned-регенерации."""
        short_steps = sum(1 for v in collected.values() if len(v) < _MIN_STEP_CHARS)
        expected_min = 6  # 1 + 2 развивающих + 3 + 4 + 5
        report.setdefault("attempts", 1)
        report.setdefault("regen", 0)
        report.setdefault("judge", "skipped")
        report["expected_blocks"] = expected_min
        report["got_blocks"] = len(collected)
        report["short_blocks"] = short_steps
        report["duration_s"] = round(time.time() - t0, 1)

        reasons = []
        if report.get("gen_provider") and report["gen_provider"] != _PRIMARY_GEN_PROVIDER:
            reasons.append("fallback_provider")
        if report["attempts"] >= _MAX_GENERATION_ATTEMPTS and report["judge"] == "failed":
            reasons.append("judge_gave_up")
        if len(collected) < expected_min:
            reasons.append("missing_blocks")
        if short_steps:
            reasons.append("truncated_blocks")
        if report["regen"] >= 3:
            reasons.append("many_regens")
        report["degraded"] = bool(reasons)
        report["reasons"] = reasons

        logger.info(
            "conspect gen: provider=%s fell_back=%s attempts=%d judge=%s regen=%d "
            "blocks=%d/%d short=%d dur=%.1fs degraded=%s%s",
            report.get("gen_provider"), report.get("gen_fell_back"), report["attempts"],
            report["judge"], report["regen"], report["got_blocks"], expected_min,
            short_steps, report["duration_s"], report["degraded"],
            (" reasons=" + ",".join(reasons)) if reasons else "",
        )
        return report

    async def _gen_postprocess(self, state: dict, collected: Dict[str, str], locale: str):
        """Один проход поверх готовых Шагов 1–5: (titles, meta).
        titles — короткий заголовок-суть на каждый ключ шага ("1","2.1",...),
        для схемы-сворачивания. meta — {note_title, anchor_title,
        anchor_summary}: имя конспекта и итоговый вывод для блока-якоря
        («Теперь вы поняли»)."""
        prompt = await self.context_builder.build_titles_meta_prompt(state, collected)
        raw = await self.ai_service._generate(
            prompt, f"Верни JSON {{titles, note_title, anchor_title, anchor_summary}}. Язык: {locale}",
            {"type": "json_object"}, max_tokens=_MAX_TOKENS["history"], temperature=0.4,
            use_cache=False, fast=True, task="history",
        )
        raw = (raw or "").strip()
        if not raw or raw.startswith(("Error calling AI:", "AI disabled")):
            return {}, {}
        try:
            parsed = self.sanitizer.extract_json(raw)
        except ValueError:
            return {}, {}
        parsed = parsed or {}

        def _norm_key(k):
            k = re.sub(r"[^\d.]", "", str(k))
            return k if re.fullmatch(r"[1-5](\.\d+)?", k or "") else None

        titles: Dict[str, str] = {}
        for k, v in (parsed.get("titles") or {}).items():
            nk = _norm_key(k)
            if nk and isinstance(v, str) and v.strip():
                titles[nk] = v.strip()

        meta: Dict[str, str] = {}
        for fld in ("note_title", "anchor_title", "anchor_summary"):
            v = parsed.get(fld)
            if isinstance(v, str) and v.strip():
                meta[fld] = v.strip()
        return titles, meta

    async def _stream_pinned_regeneration(self, state: dict, locale: str, pinned: int,
                                          question: str):
        """Часть stream_generate_full для кнопки ❓ — вынесено отдельно, без судьи."""
        _ = get_translator(locale)
        t0 = time.time()
        report: Dict = {"attempts": 1, "regen": 0, "judge": "skipped"}
        if question:
            updated_pinned = await self.regen_step(state, pinned, "", locale, question=question)
            if updated_pinned:
                state["steps"][f"step{pinned}"] = {
                    "content": updated_pinned, "status": "ready", "author": "ai", "sub_steps": [],
                }
                yield (f"step{pinned}", updated_pinned)
            # Если перегенерация зафиксированного шага не удалась — продолжаем
            # со старым его текстом, чем прерывать весь запрос пользователя.

        prompt_all = await self.context_builder.build_all_steps_prompt(
            state, {}, pinned_step=pinned, question=None,
        )

        pinned_str = str(pinned)
        emitted: Dict[str, str] = {}
        # Нестримовый ответ — как в _generate_full_attempt: SSE Cerebras коверкает
        # LaTeX. Прогресс-индикатор даёт stream_generate_full через __status__.
        buf = await self.ai_service._generate(
            prompt_all, f"Сгенерируй шаги в указанном формате. Язык: {locale}",
            None, max_tokens=_MAX_TOKENS["all_steps"], temperature=0.5, use_cache=False,
            task="step_stream", reasoning_effort=settings.LLM_REASONING_EFFORT_GEN,
            timeout=settings.LLM_TIMEOUT_GEN,
        )
        if not buf or buf.startswith(("Error calling AI:", "AI disabled")):
            buf = ""
        for key, content in self._complete_steps(buf, final=True).items():
            if _base_of(key) == pinned_str:
                continue
            if len(content) >= 20:
                content = _fix_math(content)
                emitted[key] = content
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)
        info = get_last_call_info() or {}
        report["gen_provider"] = info.get("provider")
        report["gen_fell_back"] = bool(info.get("fell_back"))

        # Добор пропущенных шагов (обычно 0). Путь без судьи -> всегда по одному
        # процессу на шаг (см. ограничение специфики в build_all_steps_prompt).
        for i in range(1, 6):
            key = str(i)
            if key == pinned_str or emitted.get(key):
                continue
            content = await self.regen_step(state, i, "", locale)
            if content:
                emitted[key] = content
                report["regen"] += 1
                step_key = f"step{key}"
                state["steps"][step_key] = {"content": content, "status": "ready", "author": "ai", "sub_steps": []}
                yield (step_key, content)

        # Шаги изменились — пересобираем заголовки и имя/вывод конспекта.
        base_steps = {str(i): (state["steps"].get(f"step{i}", {}) or {}).get("content", "").strip()
                      for i in range(1, 6)}
        base_steps = {k: v for k, v in base_steps.items() if len(v) >= 20}
        if len(base_steps) >= 3:
            yield ("__status__", _("gen_status_postprocess_upd"))
            titles, meta = await self._gen_postprocess(state, base_steps, locale)
            if titles:
                state["step_titles"] = titles
                yield ("__titles__", titles)
            if meta:
                state["note_meta"] = meta
                yield ("__note_meta__", meta)

        if base_steps:
            yield ("__report__", self._finalize_report(report, base_steps, t0))
