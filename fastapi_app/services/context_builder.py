import re

import aiofiles
from fastapi_app.config import settings

# Грубое определение домена цели. Словесные маркеры — по границе слова со
# стеммингом (\b…\w*), чтобы «кодекс» не попадал в math_code из-за «код»,
# «многочисленный» — из-за «число» и т.п. Символьные — подстрокой.
_MATH_CODE_WORD_RE = re.compile(
    r"\b(?:формул|теорем|уравнени|производн|интеграл|матриц|вектор|график|"
    r"функци|геометр|алгебр|тригонометр|дифференциал|алгоритм|программ|"
    r"массив|рекурси|синус|косинус|логарифм)\w*",
    re.IGNORECASE,
)
_MATH_CODE_SYMBOLS = ("=", "^", "∫", "∑", "√", "\\frac", "\\sum", "\\int")


def _detect_domain(*texts: str) -> str:
    blob = " ".join(t for t in texts if t)
    if any(sym in blob for sym in _MATH_CODE_SYMBOLS) or _MATH_CODE_WORD_RE.search(blob):
        return "math_code"
    return "general"


_ANTI_ECHO = (
    "\nНЕ повторяй в начале ответа заголовок шага или тезис. "
    "Начинай сразу с существа. Без вводных оборотов и списков-перечислений примеров.\n"
)


def _reference_block(state: dict) -> str:
    """Справочный контекст (ru.wikipedia) для заземления фактов, если он был
    получен в state['reference'] (см. services/rag_tool_manager.py).

    Если справки нет (темы нет в вики) — вместо пустоты возвращаем ЗАПРЕТ на
    исторические детали: без опоры модель охотно выдумывает имена и даты
    («Жан Батист Кюри, 1824»). Это страховка под п. 2 главного промпта
    («история — только если прослеживается по реальным фактам»)."""
    ref = (state or {}).get("reference")
    if not ref:
        return (
            "\nСправочного контекста по теме нет. НЕ приводите конкретные "
            "исторические имена, даты и названия работ — их не на что опереть, "
            "выдумка недопустима. Отметьте одной фразой, что история темы не "
            "прослеживается, и ведите анализ логически (п. 2 главного промпта).\n"
        )
    return (
        "\nСПРАВОЧНЫЙ КОНТЕКСТ (реальные факты, даты и имена берите отсюда; "
        "дословно не пересказывайте, это опора для точности):\n" + ref + "\n"
    )


def _effective_goal(state: dict, skeleton: dict = None) -> str:
    """Цель как процесс: `goal_as_process` из скелета (переформулирование
    запроса по п. 5.1 главного промпта, см. 9_скелет_конспекта_промпт.md)
    при наличии, иначе — сырой `target_goal`."""
    if isinstance(skeleton, dict):
        gp = (skeleton.get("goal_as_process") or "").strip()
        if gp:
            return gp
    return state.get("target_goal", "")


def expected_step_keys(skeleton: dict) -> list:
    """Из скелета — упорядоченный список ключей шагов: "1", "2.1", "2.2", "3", ...
    Шаг 1 может быть 1 или 2 процесса, Шаг 2 — всегда 2+ (см. 9_скелет_конспекта_промпт.md).
    Шаги 3-5 всегда одним ключом. Пустой/отсутствующий skeleton -> дефолт "1".."5"."""
    keys = []
    for i in range(1, 6):
        plan = skeleton.get(f"step{i}", {}) if skeleton else {}
        sub_steps = (plan.get("sub_steps") or []) if isinstance(plan, dict) else []
        if not sub_steps:
            keys.append(str(i))
        else:
            keys.extend(f"{i}.{k}" for k in range(1, len(sub_steps) + 2))
    return keys


def thesis_for_key(skeleton: dict, key: str) -> str:
    """Тезис архитектора для конкретного ключа шага ("1", "2.1", "2.2", ...)."""
    if not skeleton:
        return ""
    parts = key.split(".")
    plan = skeleton.get(f"step{parts[0]}", {})
    if not isinstance(plan, dict):
        return str(plan) if len(parts) == 1 else ""
    if len(parts) == 1:
        return plan.get("thesis", "")
    k = int(parts[1])
    if k == 1:
        return plan.get("thesis", "")
    sub_steps = plan.get("sub_steps") or []
    idx = k - 2
    if 0 <= idx < len(sub_steps):
        entry = sub_steps[idx]
        return entry.get("thesis", "") if isinstance(entry, dict) else str(entry)
    return ""


def _entry_for_key(skeleton: dict, key: str) -> dict:
    """Как thesis_for_key, но возвращает весь словарь узла (не только
    `thesis`) — нужен для полей перехода (см. transition_hint_for_key)."""
    if not skeleton:
        return {}
    parts = key.split(".")
    plan = skeleton.get(f"step{parts[0]}", {})
    if not isinstance(plan, dict):
        return {}
    if len(parts) == 1:
        return plan
    k = int(parts[1])
    if k == 1:
        return plan
    sub_steps = plan.get("sub_steps") or []
    idx = k - 2
    if 0 <= idx < len(sub_steps) and isinstance(sub_steps[idx], dict):
        return sub_steps[idx]
    return {}


# Название поля(ей) перехода в узле скелета — по базовому шагу (см.
# 9_скелет_конспекта_промпт.md, раздел "Поля перехода"). Шаг 1: разные поля
# для основного узла ("потенциально_содержит") и для второго простейшего
# процесса в sub_steps ("связь_с_основным") — обрабатывается отдельно ниже.
_TRANSITION_FIELDS = {
    "2": ("разворачивает", "обратный_ход"),
    "3": ("обходится_без",),
    "4": ("несовместимость",),
    "5": ("скачок",),
}


def transition_hint_for_key(skeleton: dict, key: str) -> str:
    """Поля перехода архитектора для ключа шага — план вывода для генератора
    шага (см. аудит 2026-09-12, пункт А: план из одних именных групп ничего
    не говорит генератору о самом становлении). Пустая строка, если
    архитектор их не заполнил (старый скелет / модель промолчала) — тогда
    генератор строит переход сам по правилу из 8_генератор_шага_промпт.md."""
    entry = _entry_for_key(skeleton, key)
    if not entry:
        return ""
    base, parts = key.split(".")[0], key.split(".")
    if base == "1":
        field = "потенциально_содержит" if len(parts) == 1 else "связь_с_основным"
        val = (entry.get(field) or "").strip()
        return val
    fields = _TRANSITION_FIELDS.get(base, ())
    vals = [str(entry.get(f) or "").strip() for f in fields]
    vals = [v for v in vals if v]
    return " / ".join(vals)


def _group_keys_by_base(keys: list) -> dict:
    """{"1": ["1"], "2": ["2.1","2.2"], ...} — для человекочитаемых блоков (план, судья)."""
    grouped = {}
    for key in keys:
        base = key.split(".")[0]
        grouped.setdefault(base, []).append(key)
    return grouped


# Пункты 1_главного, нужные для скелета и судьи (экономия токенов).
# Верхний уровень: 1 (цель разбора), 2 (историческая форма первой),
# 3 (переформулировка запроса в процесс), 4 (ядро алгоритма), 5 (развитие ≠ изменение).
_ALGO_CORE_KEEP = {"1", "2", "3", "4", "5"}
# Внутри п.3 отдельно исключается "3", чтобы вырезать преамбулу «Поступает запрос...»,
# но оставить пункт 3.1.
_ALGO_CORE_EXCLUDE_SUB = {"3"}
_NUM_LINE_RE = re.compile(r"^\s*(\d+(?:\.\d+)*)[.\s]")


def _extract_algo_core(main_prompt: str) -> str:
    """Из 1_главного — только рабочие пункты (см. _ALGO_CORE_KEEP /
    _ALGO_CORE_EXCLUDE_SUB). Строки без номера наследуют судьбу текущего
    пункта; преамбула (до первого номера) сохраняется. Результат
    детерминирован — важно для кеша префикса промпта."""
    out, keep_current = [], True
    for line in main_prompt.splitlines():
        m = _NUM_LINE_RE.match(line)
        if m:
            full = m.group(1)
            top = full.split(".")[0]
            keep_current = top in _ALGO_CORE_KEEP and full not in _ALGO_CORE_EXCLUDE_SUB
        if keep_current:
            out.append(line)
    # схлопываем тройные+ пустые строки, подчищаем хвост
    text = "\n".join(out)
    return re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"


class ContextBuilder:
    def __init__(self):
        self.prompts_dir = settings.PROMPTS_DIR
        self._cache = {}
        self._algo_core = None  # (mtime, extracted) — кэш ядра 1_главного

    async def _load_file(self, filename: str) -> str:
        file_path = self.prompts_dir / filename
        if not file_path.exists():
            return f"Instruction for {filename}"

        # Кэш по mtime — правка промпта видна без рестарта сервера.
        mtime = file_path.stat().st_mtime
        cached = self._cache.get(filename)
        if cached and cached[0] == mtime:
            return cached[1]

        async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
            content = await f.read()
        self._cache[filename] = (mtime, content)
        return content

    async def _load_algo_core(self) -> str:
        """Ядро 1_главного (только рабочие пункты) — для скелета и судьи."""
        fp = self.prompts_dir / "1_главный_промпт.md"
        if not fp.exists():
            return await self._load_file("1_главный_промпт.md")
        mtime = fp.stat().st_mtime
        if self._algo_core and self._algo_core[0] == mtime:
            return self._algo_core[1]
        core = _extract_algo_core(await self._load_file("1_главный_промпт.md"))
        self._algo_core = (mtime, core)
        return core

    async def build_step_prompt(self, state: dict, target_step: int, question: str = None,
                                 skeleton: dict = None) -> str:
        """Сборка промпта для генерации конкретного шага (с учетом предыдущих).
        question — уточнение пользователя к этому конкретному шагу (кнопка ❓),
        учитывается при перегенерации именно этого шага.
        skeleton — если передан, из него берётся goal_as_process."""
        main_prompt = await self._load_algo_core()
        step_generator_prompt = await self._load_file("8_генератор_шага_промпт.md")
        goal = _effective_goal(state, skeleton)
        previous_context = self._compile_previous_steps(state, target_step)
        domain = _detect_domain(goal, previous_context)

        prompt = f"{main_prompt}\n\n{step_generator_prompt}\n\n"
        prompt += f"ЦЕЛЬ ИССЛЕДОВАНИЯ: {goal}\n"
        prompt += f"ДОМЕН: {domain}\n"
        if domain == "math_code":
            prompt += ("Применяй правило домена math_code: цепочка операция → кризис записи/вычисления → новая операция. "
                       "Численные примеры реальные. Формулы ТОЛЬКО в долларах: $$…$$ для отдельной строки, $…$ внутри предложения. "
                       "НЕ используй \\[ \\], \\( \\), квадратные скобки [ ] или обратные кавычки для формул.\n")
        prompt += f"УЖЕ ЗАПОЛНЕННЫЙ КОНТЕКСТ:\n{previous_context}\n"
        prompt += f"ЗАДАЧА: Сгенерируй текст строго для Шага {target_step}.\n"
        hint = transition_hint_for_key(skeleton or {}, str(target_step))
        if hint:
            prompt += f"ПЛАН ПЕРЕХОДА ОТ АРХИТЕКТОРА (провести на материале, не называть): {hint}\n"
        prompt += _ANTI_ECHO
        prompt += _reference_block(state)
        # Пошаговые правила по каждому шагу (в т.ч. Шаг 3) регулирует
        # 8_генератор_шага_промпт.md — отдельного хардкода здесь больше нет.

        if question:
            prompt += f"\nУТОЧНЕНИЕ ПОЛЬЗОВАТЕЛЯ к этому шагу: {question}\nУчти его при перегенерации.\n"

        prompt += f"\nОбязательно верни результат строго в формате JSON, где ключ - это 'step{target_step}', а значение - сгенерированный текст для этого шага."
        return prompt

    async def build_process_prompt(self, state: dict, key: str, skeleton: dict,
                                    question: str = None) -> str:
        """Промпт для ОДНОГО процесса шага, у которого их несколько (Шаг 1: 1-2,
        Шаг 2: всегда 2+) — используется в "доборе" пропущенных ключей после
        основного потока. key вида "2.2"."""
        base_step = int(key.split(".")[0])
        main_prompt = await self._load_algo_core()
        step_generator_prompt = await self._load_file("8_генератор_шага_промпт.md")
        goal = _effective_goal(state, skeleton)
        previous_context = self._compile_previous_steps(state, base_step)
        domain = _detect_domain(goal, previous_context)

        # Иерархия абстрактное→конкретное (п. 4.4.1): если у этого процесса
        # есть КОНКРЕТНЫЙ родитель среди соседних процессов того же шага
        # (поле "растёт_из" в скелете — см. gen_skeleton), даём генератору
        # его РЕАЛЬНЫЙ уже написанный текст (не тезис в одну строку) — иначе
        # текст пишется без знания, из кого именно он растёт, и связь между
        # соседними процессами остаётся угаданной, а не выстроенной.
        parent_key = _entry_for_key(skeleton, key).get("растёт_из") if skeleton else None
        parent_text = (state.get("_process_texts") or {}).get(parent_key) if parent_key else None

        siblings = [k for k in expected_step_keys(skeleton) if k.split(".")[0] == str(base_step) and k != key]
        sibling_block = ""
        if siblings:
            sibling_lines = "\n".join(
                f"  - {thesis_for_key(skeleton, k)}" + (" (это твой родитель, см. ниже)" if k == parent_key else "")
                for k in siblings
            )
            sibling_block = f"\nДРУГИЕ ПРОЦЕССЫ ЭТОГО ЖЕ ШАГА (не повторяй их содержание, покажи связь):\n{sibling_lines}\n"

        prompt = f"{main_prompt}\n\n{step_generator_prompt}\n\n"
        prompt += f"ЦЕЛЬ ИССЛЕДОВАНИЯ: {goal}\n"
        prompt += f"ДОМЕН: {domain}\n"
        if domain == "math_code":
            prompt += ("Применяй правило домена math_code: цепочка операция → кризис записи/вычисления → новая операция. "
                       "Численные примеры реальные. Формулы ТОЛЬКО в долларах: $$…$$ для отдельной строки, $…$ внутри предложения. "
                       "НЕ используй \\[ \\], \\( \\), квадратные скобки [ ] или обратные кавычки для формул.\n")
        prompt += f"УЖЕ ЗАПОЛНЕННЫЙ КОНТЕКСТ:\n{previous_context}\n"
        if parent_text:
            prompt += (f"\nЭТОТ ПРОЦЕСС — ПРЯМОЕ ПРОДОЛЖЕНИЕ уже написанного процесса «{thesis_for_key(skeleton, parent_key)}» "
                       f"(конкретнее его, а не простейшего процесса напрямую):\n{parent_text}\n")
        prompt += f"ЗАДАЧА: Сгенерируй текст строго для Шага {base_step}, процесс «{thesis_for_key(skeleton, key)}».\n"
        hint = transition_hint_for_key(skeleton, key)
        if hint:
            prompt += f"ПЛАН ПЕРЕХОДА ОТ АРХИТЕКТОРА (провести на материале, не называть): {hint}\n"
        prompt += sibling_block
        prompt += _ANTI_ECHO
        prompt += _reference_block(state)
        # Правила по каждому шагу (в т.ч. Шаг 3) — в 8_генератор_шага_промпт.md.

        if question:
            prompt += f"\nУТОЧНЕНИЕ ПОЛЬЗОВАТЕЛЯ к этому шагу: {question}\nУчти его при перегенерации.\n"

        prompt += "\nОбязательно верни результат строго в формате JSON: {\"process\": \"<текст>\"}."
        return prompt

    # ------------------------------------------------------------------ #
    #  Поблочная архитектура скелета (см. gen_skeleton в generation_       #
    #  pipeline.py, обсуждение 2026-09-14): каждая стадия (Шаг 1-5) видит  #
    #  ПОЛНОЕ содержимое уже построенных предыдущих шагов, не угадывает    #
    #  вслепую по списку кандидатов (как в откаченной двухфазной схеме),   #
    #  и проверяется независимым вызовом-валидатором.                     #
    # ------------------------------------------------------------------ #

    async def build_step1_prompt(self, state: dict, rejected: list = None) -> str:
        """Стадия 1 прототипа: найти простейший процесс.
        rejected — прошлые отклонённые попытки этой стадии: [{"thesis":.., "reason":..}].
        Тезисы называются явно и их повтор запрещается — иначе модель просто
        переформулирует обоснование того же тезиса вместо реального поиска
        другого (см. наблюдение на теме "энтропия": 3 попытки подряд один и
        тот же тезис "неопределённость состояния", только другими словами)."""
        algo_core = await self._load_algo_core()
        step1_prompt = await self._load_file("11_шаг1_простейший_промпт.md")
        goal = state.get("target_goal", "Не указана")
        prompt = f"{algo_core}\n\n" + step1_prompt.replace("{goal}", goal)
        prompt += _reference_block(state)
        if rejected:
            prompt += "\n\nПРЕДЫДУЩИЕ ПОПЫТКИ ОТКЛОНЕНЫ независимой проверкой:\n"
            for i, r in enumerate(rejected, 1):
                prompt += f"  Попытка {i}: тезис «{r.get('thesis', '')}» — отклонено: {r.get('reason', '')}\n"
            prompt += ("ВЫБЕРИ СУЩЕСТВЕННО ДРУГОЙ тезис простейшего процесса — не тот же самый другими "
                       "словами и не косметическую правку формулировки отклонённых. Если задача в самой "
                       "трактовке (например, простейший процесс должен быть конкретнее/абстрактнее) — "
                       "возьми другой уровень, а не тот же самый узел.")
        return prompt

    async def build_step1_validation_prompt(self, goal_as_process: str, step1: dict) -> str:
        """Независимая валидация простейшего процесса (п. 4.3, три условия одновременно)."""
        algo_core = await self._load_algo_core()
        val_prompt = await self._load_file("12_валидация_шаг1_промпт.md")
        tc = step1.get("three_conditions") or {}
        tc_lines = "\n".join(f"  - {k}: {v}" for k, v in tc.items()) or "  (не заполнено)"
        prompt = f"{algo_core}\n\n" + val_prompt.replace(
            "{goal_as_process}", goal_as_process).replace(
            "{step1_thesis}", step1.get("thesis", "")).replace(
            "{three_conditions_block}", tc_lines)
        return prompt

    async def build_step2_prompt(self, step1_thesis: str, goal_as_process: str, rejected: list = None) -> str:
        """Стадия 2 прототипа: развернуть развитие простейшего процесса,
        видя его целиком (не список кандидатов вслепую, как в откаченной
        двухфазной схеме).
        rejected — прошлые отклонённые попытки: [{"blocks": [thesis,...], "reason":..}]."""
        algo_core = await self._load_algo_core()
        step2_prompt = await self._load_file("13_шаг2_развитие_промпт.md")
        prompt = f"{algo_core}\n\n" + step2_prompt.replace(
            "{step1_thesis}", step1_thesis).replace("{goal_as_process}", goal_as_process)
        if rejected:
            prompt += "\n\nПРЕДЫДУЩИЕ ПОПЫТКИ ОТКЛОНЕНЫ независимой проверкой:\n"
            for i, r in enumerate(rejected, 1):
                blocks_str = ", ".join(r.get("blocks", []))
                prompt += f"  Попытка {i}: блоки [{blocks_str}] — отклонено: {r.get('reason', '')}\n"
            prompt += ("Построй развитие ЗАНОВО с учётом этого — не повторяй те же блоки с косметическими "
                       "правками, при необходимости возьми другие узлы или другую иерархию.")
        return prompt

    async def build_step2_validation_prompt(self, step1_thesis: str, goal_as_process: str, blocks: list) -> str:
        """Независимая валидация развития (иерархия абстрактное→конкретное, п. 4.4.1)."""
        algo_core = await self._load_algo_core()
        val_prompt = await self._load_file("14_валидация_шаг2_промпт.md")
        lines = []
        for b in blocks:
            lines.append(f"- {b.get('id', '?')} (растёт из {b.get('grows_from', 'step1')}): {b.get('thesis', '')}")
        blocks_block = "\n".join(lines)
        prompt = f"{algo_core}\n\n" + val_prompt.replace(
            "{step1_thesis}", step1_thesis).replace(
            "{goal_as_process}", goal_as_process).replace(
            "{blocks_block}", blocks_block)
        return prompt

    @staticmethod
    def _blocks_block(blocks: list) -> str:
        lines = [f"- {b.get('id', '?')} (растёт из {b.get('grows_from', 'step1')}): {b.get('thesis', '')}"
                 for b in blocks]
        return "\n".join(lines)

    async def build_step3_prompt(self, step1_thesis: str, step2_blocks: list, rejected: list = None) -> str:
        """Стадия 3 прототипа: найти противоположный процесс, видя Шаг 1 и
        весь уже провалидированный Шаг 2 целиком (не угадывая по списку
        кандидатов, как в откаченной двухфазной схеме)."""
        algo_core = await self._load_algo_core()
        step3_prompt = await self._load_file("15_шаг3_противоположный_промпт.md")
        prompt = f"{algo_core}\n\n" + step3_prompt.replace(
            "{step1_thesis}", step1_thesis).replace("{step2_block}", self._blocks_block(step2_blocks))
        if rejected:
            prompt += "\n\nПРЕДЫДУЩИЕ ПОПЫТКИ ОТКЛОНЕНЫ независимой проверкой:\n"
            for i, r in enumerate(rejected, 1):
                prompt += f"  Попытка {i}: «{r.get('thesis', '')}» — отклонено: {r.get('reason', '')}\n"
            prompt += "Найди СУЩЕСТВЕННО ДРУГОЙ процесс — не тот же самый другими словами."
        return prompt

    async def build_step3_validation_prompt(self, step1_thesis: str, step2_blocks: list, step3: dict) -> str:
        """Независимая валидация противоположного процесса (тест исключения, п. 4.5.1–4.5.2)."""
        algo_core = await self._load_algo_core()
        val_prompt = await self._load_file("16_валидация_шаг3_промпт.md")
        prompt = f"{algo_core}\n\n" + val_prompt.replace(
            "{step1_thesis}", step1_thesis).replace(
            "{step2_block}", self._blocks_block(step2_blocks)).replace(
            "{step3_thesis}", step3.get("thesis", "")).replace(
            "{step3_obhoditsya}", step3.get("обходится_без", ""))
        return prompt

    async def build_step4_prompt(self, step1_thesis: str, step3: dict, rejected: list = None) -> str:
        """Стадия 4 прототипа: построить противоречие (единство Шага 1 и Шага 3, п. 4.6)."""
        algo_core = await self._load_algo_core()
        step4_prompt = await self._load_file("17_шаг4_противоречие_промпт.md")
        prompt = f"{algo_core}\n\n" + step4_prompt.replace(
            "{step1_thesis}", step1_thesis).replace(
            "{step3_thesis}", step3.get("thesis", "")).replace(
            "{step3_obhoditsya}", step3.get("обходится_без", ""))
        if rejected:
            prompt += "\n\nПРЕДЫДУЩИЕ ПОПЫТКИ ОТКЛОНЕНЫ независимой проверкой:\n"
            for i, r in enumerate(rejected, 1):
                prompt += f"  Попытка {i}: «{r.get('thesis', '')}» — отклонено: {r.get('reason', '')}\n"
            prompt += "Построй противоречие ЗАНОВО, устранив именно эту проблему."
        return prompt

    async def build_step4_validation_prompt(self, step1_thesis: str, step3_thesis: str, step4: dict) -> str:
        """Независимая валидация противоречия (тест двусторонней необходимости, п. 4.6)."""
        algo_core = await self._load_algo_core()
        val_prompt = await self._load_file("18_валидация_шаг4_промпт.md")
        prompt = f"{algo_core}\n\n" + val_prompt.replace(
            "{step1_thesis}", step1_thesis).replace(
            "{step3_thesis}", step3_thesis).replace(
            "{step4_thesis}", step4.get("thesis", "")).replace(
            "{step4_nesovmestimost}", step4.get("несовместимость", "")).replace(
            "{step4_neobhodimost_a}", step4.get("необходимость_A", "")).replace(
            "{step4_neobhodimost_b}", step4.get("необходимость_B", ""))
        return prompt

    async def build_step5_prompt(self, step1_thesis: str, step3_thesis: str, step4: dict, rejected: list = None) -> str:
        """Стадия 5 прототипа: найти разрешение противоречия (п. 4.7–4.7.2)."""
        algo_core = await self._load_algo_core()
        step5_prompt = await self._load_file("19_шаг5_разрешение_промпт.md")
        prompt = f"{algo_core}\n\n" + step5_prompt.replace(
            "{step1_thesis}", step1_thesis).replace(
            "{step3_thesis}", step3_thesis).replace(
            "{step4_thesis}", step4.get("thesis", "")).replace(
            "{step4_nesovmestimost}", step4.get("несовместимость", ""))
        if rejected:
            prompt += "\n\nПРЕДЫДУЩИЕ ПОПЫТКИ ОТКЛОНЕНЫ независимой проверкой:\n"
            for i, r in enumerate(rejected, 1):
                prompt += f"  Попытка {i}: «{r.get('thesis', '')}» — отклонено: {r.get('reason', '')}\n"
            prompt += "Найди ЗАНОВО разрешение, устранив именно эту проблему."
        return prompt

    async def build_step5_validation_prompt(self, step4: dict, step5: dict) -> str:
        """Независимая валидация разрешения (тест типа разрешения, п. 4.7.2)."""
        algo_core = await self._load_algo_core()
        val_prompt = await self._load_file("20_валидация_шаг5_промпт.md")
        prompt = f"{algo_core}\n\n" + val_prompt.replace(
            "{step4_thesis}", step4.get("thesis", "")).replace(
            "{step4_nesovmestimost}", step4.get("несовместимость", "")).replace(
            "{step5_thesis}", step5.get("thesis", "")).replace(
            "{step5_tip}", step5.get("тип_разрешения", "")).replace(
            "{step5_skachok}", step5.get("скачок", ""))
        return prompt

    async def build_judge_prompt(self, steps: dict) -> str:
        """Сборка промпта для судьи (см. судья_противоречия.md) — оценивает,
        настоящее ли противоречие получилось в сгенерированном конспекте.
        steps — {"1": "...", "2.1": "...", "2.2": "...", ...} (ключи как в
        expected_step_keys) — процессы одного шага группируются вместе."""
        algo_core = await self._load_algo_core()
        judge_prompt = await self._load_file("судья_противоречия.md")
        grouped = _group_keys_by_base(sorted(steps.keys(), key=lambda k: [int(p) for p in k.split(".")]))
        lines = []
        for base in ["1", "2", "3", "4", "5"]:
            keys = grouped.get(base, [])
            if not keys:
                lines.append(f"--- ШАГ {base} ---\n(пусто)")
                continue
            if len(keys) == 1:
                lines.append(f"--- ШАГ {base} ---\n{steps.get(keys[0], '(пусто)')}")
            else:
                parts = "\n".join(f"  Процесс {k.split('.')[1]}: {steps.get(k, '(пусто)')}" for k in keys)
                lines.append(f"--- ШАГ {base} (несколько процессов) ---\n{parts}")
        return f"{algo_core}\n\n{judge_prompt}\n\nКОНСПЕКТ ДЛЯ ОЦЕНКИ:\n" + "\n".join(lines)

    async def build_titles_meta_prompt(self, state: dict, steps: dict, skeleton: dict = None) -> str:
        """Промпт для доп. прохода — заголовки-суть + имя конспекта + вывод
        (см. заголовки_и_итог_промпт.md). Модель возвращает JSON
        {"titles": {ключ: заголовок}, "note_title", "anchor_title", "anchor_summary"}.
        steps — {"1": "...", "2.1": "...", ...} (как в build_judge_prompt)."""
        titles_prompt = await self._load_file("заголовки_и_итог_промпт.md")
        goal = _effective_goal(state, skeleton) or "Не указана"
        raw_goal = (state.get("target_goal") or "").strip() or goal
        order = sorted(steps.keys(), key=lambda k: [int(p) for p in k.split(".")])
        lines = [f"[{k}] {steps.get(k, '')}" for k in order]
        return (
            f"{titles_prompt}\n\nИСХОДНЫЙ ЗАПРОС ПОЛЬЗОВАТЕЛЯ (для anchor_title/note_title): {raw_goal}\n"
            f"ЦЕЛЬ ИССЛЕДОВАНИЯ (как процесс): {goal}\n\n"
            f"ГОТОВЫЙ КОНСПЕКТ (в квадратных скобках — ключ шага, его и используйте в titles):\n"
            + "\n\n".join(lines)
        )

    async def build_all_steps_prompt(self, state: dict, skeleton: dict,
                                     pinned_step: int = None, question: str = None) -> str:
        """Один промпт для генерации всех 5 шагов сразу (экономит вызовы к LLM).
        Если pinned_step задан — этот шаг фиксируется (не переписывается), а
        остальные перегенерируются согласованно с ним и с уточнением question."""
        main_prompt = await self._load_algo_core()
        step_rules = await self._load_file("8_генератор_шага_промпт.md")
        goal = _effective_goal(state, skeleton) or "Не указана"
        domain = _detect_domain(goal)
        steps_state = state.get("steps", {}) or {}

        def _step_content(i: int) -> str:
            s = steps_state.get(f"step{i}")
            if isinstance(s, dict):
                return (s.get("content") or "").strip()
            return s.strip() if isinstance(s, str) else ""

        keys = expected_step_keys(skeleton) if skeleton else [str(i) for i in range(1, 6)]
        theses = []
        for key in keys:
            base = key.split(".")[0]
            label = f"Шаг {base}" if "." not in key else f"Шаг {base}, процесс {key.split('.')[1]}"
            theses.append(f"  {label}: {thesis_for_key(skeleton, key)}")
            hint = transition_hint_for_key(skeleton, key)
            if hint:
                theses.append(f"    план перехода (провести на материале, не называть): {hint}")
        theses_block = "\n".join(theses)

        prompt = f"{main_prompt}\n\n{step_rules}\n\n"
        prompt += f"ЦЕЛЬ ИССЛЕДОВАНИЯ: {goal}\nДОМЕН: {domain}\n"
        if domain == "math_code":
            prompt += ("Для math_code: цепочка операция → кризис записи/вычисления → новая операция. "
                       "Формулы ТОЛЬКО в долларах ($$…$$ или $…$), без \\[ \\], без квадратных скобок, без обратных кавычек.\n")
        prompt += f"ПЛАН ОТ АРХИТЕКТОРА (тезисы шагов):\n{theses_block}\n\n"
        prompt += _ANTI_ECHO
        prompt += _reference_block(state)

        if pinned_step and 1 <= int(pinned_step) <= 5:
            # ПРЕДЕЛ СПЕЦИФИКАЦИИ: у pinned-регенерации (кнопка ❓) пока нет своего
            # скелета на этот вызов, поэтому она всегда работает по одному блоку
            # на шаг — не учитывает, что Шаг 1/2 у уже собранного конспекта мог
            # состоять из нескольких процессов. Если это станет проблемой на
            # практике — нужно протаскивать актуальную форму скелета через state.
            p = int(pinned_step)
            current = "\n".join(f"  Шаг {i}: {_step_content(i) or '—'}" for i in range(1, 6))
            targets = [str(i) for i in range(1, 6) if i != p]
            prompt += (
                f"ТЕКУЩИЙ КОНСПЕКТ (для согласованности):\n{current}\n\n"
                f"ШАГ {p} ЗАФИКСИРОВАН пользователем — его НЕ переписывать:\n{_step_content(p) or '(пусто)'}\n\n"
            )
            if question:
                prompt += f"УТОЧНЕНИЕ ПОЛЬЗОВАТЕЛЯ к шагу {p}: {question}\n\n"
            prompt += (
                f"ЗАДАЧА: перегенерируй ТОЛЬКО шаги {', '.join(targets)} так, чтобы они были "
                f"согласованы с зафиксированным шагом {p} и учитывали уточнение. "
                f"Шаг {p} НЕ выводи.\n\n"
                "ФОРМАТ ВЫВОДА — блоки только для перегенерированных шагов, каждый со своей "
                "строки-маркера (точно как показано, ничего вне блоков):\n"
                + "\n".join(f"===ШАГ{i}===\n<текст шага {i}>" for i in targets)
            )
            return prompt

        marker_lines = "\n".join(f"===ШАГ{key}===\n<текст процесса>" for key in keys)
        prompt += (
            "ЗАДАЧА: Сгенерируй связный текст для ВСЕХ шагов диалектического конспекта по плану "
            "архитектора выше — если у шага несколько процессов, для КАЖДОГО отдельный блок. "
            "Объём — по разделу «Объём» генератора шага: каждый шаг ПОЛНОСТЬЮ показывает свой "
            "переход, краткость — за счёт плотности, а не обрыва мысли. Шаг 4 — смысловой центр, "
            "Шаг 5 — развёрнутый вывод.\n\n"
            "ФОРМАТ ВЫВОДА — ровно столько блоков, сколько строк в плане архитектора, каждый "
            "начинается со своей строки-маркера (маркер писать точно как показано, на отдельной "
            "строке, ничего вне блоков):\n" + marker_lines
        )
        return prompt

    # Непосредственно предыдущий шаг даём почти целиком (из него растёт
    # текущий), более ранние — сжимаем до сути. Сжатие смысловое: заявка
    # (первое предложение) + передача дальше (последнее), а не обрезка
    # префикса — так виден переход, а не только начало мысли.
    _PREV_STEP_CAP = 750
    _PREV_STEP_OLDER_CAP = 340

    @staticmethod
    def _condense_step(txt: str, cap: int) -> str:
        txt = (txt or "").strip()
        if len(txt) <= cap:
            return txt
        sents = [s.strip() for s in re.split(r"(?<=[.!?…])\s+", txt) if s.strip()]
        if len(sents) >= 3:
            combo = sents[0] + " […] " + sents[-1]
            if len(combo) <= cap * 1.4:
                return combo
        return txt[:cap].rsplit(" ", 1)[0] + " […]"

    def _compile_previous_steps(self, state: dict, current_step: int, include_substeps: bool = False) -> str:
        context = ""
        steps = state.get("steps", {})
        for i in range(1, current_step + 1):
            step_key = f"step{i}"
            step_data = steps.get(step_key, {})
            if step_data.get("status") in ["ready", "done"]:
                txt = (step_data.get("content", "") or "").strip()
                cap = self._PREV_STEP_CAP if i == current_step - 1 else self._PREV_STEP_OLDER_CAP
                txt = self._condense_step(txt, cap)
                context += f"--- ШАГ {i} ---\n{txt}\n\n"
            elif i == current_step and include_substeps:
                # Включаем уже сгенерированные подшаги текущего шага
                context += f"--- ШАГ {i} (Частично сгенерировано) ---\n"
                for sub in step_data.get("sub_steps", []):
                    if sub.get("content"):
                        context += f"**{sub.get('subtitle')}**\n{sub.get('content')}\n\n"
        return context or "Контекст пуст. Это первый шаг."
