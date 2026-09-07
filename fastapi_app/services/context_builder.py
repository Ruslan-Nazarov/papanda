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


def _group_keys_by_base(keys: list) -> dict:
    """{"1": ["1"], "2": ["2.1","2.2"], ...} — для человекочитаемых блоков (план, судья)."""
    grouped = {}
    for key in keys:
        base = key.split(".")[0]
        grouped.setdefault(base, []).append(key)
    return grouped


class ContextBuilder:
    def __init__(self):
        self.prompts_dir = settings.PROMPTS_DIR
        self._cache = {}

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

    async def build_step_prompt(self, state: dict, target_step: int, question: str = None,
                                 skeleton: dict = None) -> str:
        """Сборка промпта для генерации конкретного шага (с учетом предыдущих).
        question — уточнение пользователя к этому конкретному шагу (кнопка ❓),
        учитывается при перегенерации именно этого шага.
        skeleton — если передан, из него берётся goal_as_process."""
        main_prompt = await self._load_file("1_главный_промпт.md")
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
        prompt += _ANTI_ECHO
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
        main_prompt = await self._load_file("1_главный_промпт.md")
        step_generator_prompt = await self._load_file("8_генератор_шага_промпт.md")
        goal = _effective_goal(state, skeleton)
        previous_context = self._compile_previous_steps(state, base_step)
        domain = _detect_domain(goal, previous_context)

        siblings = [k for k in expected_step_keys(skeleton) if k.split(".")[0] == str(base_step) and k != key]
        sibling_block = ""
        if siblings:
            sibling_lines = "\n".join(f"  - {thesis_for_key(skeleton, k)}" for k in siblings)
            sibling_block = f"\nДРУГИЕ ПРОЦЕССЫ ЭТОГО ЖЕ ШАГА (не повторяй их содержание, покажи связь):\n{sibling_lines}\n"

        prompt = f"{main_prompt}\n\n{step_generator_prompt}\n\n"
        prompt += f"ЦЕЛЬ ИССЛЕДОВАНИЯ: {goal}\n"
        prompt += f"ДОМЕН: {domain}\n"
        if domain == "math_code":
            prompt += ("Применяй правило домена math_code: цепочка операция → кризис записи/вычисления → новая операция. "
                       "Численные примеры реальные. Формулы ТОЛЬКО в долларах: $$…$$ для отдельной строки, $…$ внутри предложения. "
                       "НЕ используй \\[ \\], \\( \\), квадратные скобки [ ] или обратные кавычки для формул.\n")
        prompt += f"УЖЕ ЗАПОЛНЕННЫЙ КОНТЕКСТ:\n{previous_context}\n"
        prompt += f"ЗАДАЧА: Сгенерируй текст строго для Шага {base_step}, процесс «{thesis_for_key(skeleton, key)}».\n"
        prompt += sibling_block
        prompt += _ANTI_ECHO
        # Правила по каждому шагу (в т.ч. Шаг 3) — в 8_генератор_шага_промпт.md.

        if question:
            prompt += f"\nУТОЧНЕНИЕ ПОЛЬЗОВАТЕЛЯ к этому шагу: {question}\nУчти его при перегенерации.\n"

        prompt += "\nОбязательно верни результат строго в формате JSON: {\"process\": \"<текст>\"}."
        return prompt

    async def build_skeleton_prompt(self, state: dict, failed_attempts: list = None) -> str:
        """Сборка промпта для генерации скелета конспекта.
        failed_attempts — список прошлых попыток, отклонённых судьёй (см.
        build_judge_prompt/судья_противоречия.md): [{"thesis1": "...", "reason": "..."}].
        Передаётся, чтобы архитектор не повторял тот же неудачный простейший
        процесс на следующей попытке."""
        main_prompt = await self._load_file("1_главный_промпт.md")
        skeleton_prompt = await self._load_file("9_скелет_конспекта_промпт.md")
        goal = state.get("target_goal", "Не указана")
        domain = _detect_domain(goal)

        prompt = f"{main_prompt}\n\n"
        prompt += skeleton_prompt.replace("{goal}", goal)
        prompt += f"\nДОМЕН: {domain}."
        if domain == "math_code":
            prompt += " Для math_code подшаги допустимы только на Шаге 5 при выводе формулы."

        if failed_attempts:
            prompt += "\n\nПРЕДЫДУЩИЕ ПОПЫТКИ НЕ ПРОШЛИ ПРОВЕРКУ — выбери ДРУГОЙ простейший процесс, не повторяй их:\n"
            for i, attempt in enumerate(failed_attempts, 1):
                prompt += f"  Попытка {i}: простейший процесс «{attempt.get('thesis1', '')}» — отклонено, причина: {attempt.get('reason', '')}\n"

        return prompt

    async def build_judge_prompt(self, steps: dict) -> str:
        """Сборка промпта для судьи (см. судья_противоречия.md) — оценивает,
        настоящее ли противоречие получилось в сгенерированном конспекте.
        steps — {"1": "...", "2.1": "...", "2.2": "...", ...} (ключи как в
        expected_step_keys) — процессы одного шага группируются вместе."""
        main_prompt = await self._load_file("1_главный_промпт.md")
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
        return f"{main_prompt}\n\n{judge_prompt}\n\nКОНСПЕКТ ДЛЯ ОЦЕНКИ:\n" + "\n".join(lines)

    async def build_history_notes_prompt(self, state: dict, steps: dict, skeleton: dict = None) -> str:
        """Промпт для доп. прохода «короткие исторические справки по шагам»
        (см. историческая_справка_промпт.md). Модель возвращает JSON
        {"<номер шага>": "<справка>"} только по тем шагам, где она нужна.
        steps — {"1": "...", "2.1": "...", ...} (как в build_judge_prompt)."""
        hist_prompt = await self._load_file("историческая_справка_промпт.md")
        goal = _effective_goal(state, skeleton) or "Не указана"
        grouped = _group_keys_by_base(sorted(steps.keys(), key=lambda k: [int(p) for p in k.split(".")]))
        lines = []
        for base in ["1", "2", "3", "4", "5"]:
            keys = grouped.get(base, [])
            if not keys:
                continue
            if len(keys) == 1:
                lines.append(f"--- ШАГ {base} ---\n{steps.get(keys[0], '')}")
            else:
                parts = "\n".join(f"  Процесс {k.split('.')[1]}: {steps.get(k, '')}" for k in keys)
                lines.append(f"--- ШАГ {base} (несколько процессов) ---\n{parts}")
        return (
            f"{hist_prompt}\n\nЦЕЛЬ ИССЛЕДОВАНИЯ (как процесс): {goal}\n\n"
            "ГОТОВЫЙ КОНСПЕКТ (Шаги 1–5):\n" + "\n".join(lines)
        )

    async def build_all_steps_prompt(self, state: dict, skeleton: dict,
                                     pinned_step: int = None, question: str = None) -> str:
        """Один промпт для генерации всех 5 шагов сразу (экономит вызовы к LLM).
        Если pinned_step задан — этот шаг фиксируется (не переписывается), а
        остальные перегенерируются согласованно с ним и с уточнением question."""
        main_prompt = await self._load_file("1_главный_промпт.md")
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
        theses_block = "\n".join(theses)

        prompt = f"{main_prompt}\n\n{step_rules}\n\n"
        prompt += f"ЦЕЛЬ ИССЛЕДОВАНИЯ: {goal}\nДОМЕН: {domain}\n"
        if domain == "math_code":
            prompt += ("Для math_code: цепочка операция → кризис записи/вычисления → новая операция. "
                       "Формулы ТОЛЬКО в долларах ($$…$$ или $…$), без \\[ \\], без квадратных скобок, без обратных кавычек.\n")
        prompt += f"ПЛАН ОТ АРХИТЕКТОРА (тезисы шагов):\n{theses_block}\n\n"
        prompt += _ANTI_ECHO

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
            "Шаги 1-4 — коротко. Шаг 5 — вывод/синтез, можно развёрнуто.\n\n"
            "ФОРМАТ ВЫВОДА — ровно столько блоков, сколько строк в плане архитектора, каждый "
            "начинается со своей строки-маркера (маркер писать точно как показано, на отдельной "
            "строке, ничего вне блоков):\n" + marker_lines
        )
        return prompt

    def _compile_previous_steps(self, state: dict, current_step: int, include_substeps: bool = False) -> str:
        context = ""
        steps = state.get("steps", {})
        for i in range(1, current_step + 1):
            step_key = f"step{i}"
            step_data = steps.get(step_key, {})
            if step_data.get("status") in ["ready", "done"]:
                context += f"--- ШАГ {i} ---\n{step_data.get('content', '')}\n\n"
            elif i == current_step and include_substeps:
                # Включаем уже сгенерированные подшаги текущего шага
                context += f"--- ШАГ {i} (Частично сгенерировано) ---\n"
                for sub in step_data.get("sub_steps", []):
                    if sub.get("content"):
                        context += f"**{sub.get('subtitle')}**\n{sub.get('content')}\n\n"
        return context or "Контекст пуст. Это первый шаг."
