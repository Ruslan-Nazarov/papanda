import aiofiles
from fastapi_app.config import settings

# Маркеры для грубого определения домена цели исследования.
_MATH_CODE_MARKERS = (
    "формул", "теорем", "уравнени", "производн", "интеграл", "предел", "матриц",
    "вектор", "график", "функци", "число", "геометр", "алгебр", "тригонометр",
    "дифференциал", "код", "алгоритм", "программ", "класс ", "массив", "рекурси",
    "=", "^", "∫", "∑", "√", "\\frac", "\\sum", "\\int",
)


def _detect_domain(*texts: str) -> str:
    blob = " ".join(t for t in texts if t).lower()
    if any(marker in blob for marker in _MATH_CODE_MARKERS):
        return "math_code"
    return "general"


_ANTI_ECHO = (
    "\nНЕ повторяй в начале ответа заголовок шага или тезис. "
    "Начинай сразу с существа. Без вводных оборотов и списков-перечислений примеров.\n"
)


class ContextBuilder:
    def __init__(self):
        self.prompts_dir = settings.PROMPTS_DIR
        self._cache = {}

    async def _load_file(self, filename: str) -> str:
        if filename in self._cache:
            return self._cache[filename]
            
        file_path = self.prompts_dir / filename
        if file_path.exists():
            async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
                content = await f.read()
                self._cache[filename] = content
                return content
        return f"Instruction for {filename}"

    async def build_step_prompt(self, state: dict, target_step: int) -> str:
        """Сборка промпта для генерации конкретного шага (с учетом предыдущих)"""
        step_generator_prompt = await self._load_file("13_генератор_шага_промпт.md")
        goal = state.get("target_goal", "")
        previous_context = self._compile_previous_steps(state, target_step)
        domain = _detect_domain(goal, previous_context)

        prompt = f"{step_generator_prompt}\n\n"
        prompt += f"ЦЕЛЬ ИССЛЕДОВАНИЯ: {goal}\n"
        prompt += f"ДОМЕН: {domain}\n"
        if domain == "math_code":
            prompt += "Применяй правило домена math_code: цепочка операция → кризис записи/вычисления → новая операция. Формулы в LaTeX, численные примеры реальные.\n"
        prompt += f"УЖЕ ЗАПОЛНЕННЫЙ КОНТЕКСТ:\n{previous_context}\n"
        prompt += f"ЗАДАЧА: Сгенерируй текст строго для Шага {target_step}.\n"
        prompt += _ANTI_ECHO

        if target_step == 3:
            prompt += (
                "\nЭто шаг поиска противоположности. Назови процесс B и в одной фразе объясни, "
                "почему его развитие исключает развитие A. Кратко: 1 предложение или короткий абзац. "
                "НЕ выписывай списки из 10 утверждений — только итоговую противоположность и обоснование.\n"
            )

        prompt += f"\nОбязательно верни результат строго в формате JSON, где ключ - это 'step{target_step}', а значение - сгенерированный текст для этого шага."
        return prompt

    async def build_assistant_prompt(self, state: dict, target_step: int, user_prompt: str) -> str:
        """Сборка промпта для ручного режима (советы от ИИ)"""
        assistant_prompt = await self._load_file("7 помощник_промпт.md")
        goal = state.get("target_goal", "")
        previous_context = self._compile_previous_steps(state, target_step)
        
        prompt = f"{assistant_prompt}\n\n"
        prompt += f"{{GOAL}}: {goal}\n"
        prompt += f"{{CONTEXT}}:\n{previous_context}\n"
        prompt += f"{{CURRENT_STEP}}: step{target_step}\n\n"
        prompt += f"ЗАПРОС ПОЛЬЗОВАТЕЛЯ: {user_prompt}\n"
        return prompt

    async def build_skeleton_prompt(self, state: dict) -> str:
        """Сборка промпта для генерации скелета конспекта"""
        main_prompt = await self._load_file("1 главный промпт.md")
        skeleton_prompt = await self._load_file("14_скелет_конспекта_промпт.md")
        goal = state.get("target_goal", "Не указана")
        domain = _detect_domain(goal)

        prompt = f"{main_prompt}\n\n"
        prompt += skeleton_prompt.replace("{goal}", goal)
        prompt += f"\nДОМЕН: {domain}."
        if domain == "math_code":
            prompt += " Для math_code подшаги допустимы только на Шаге 5 при выводе формулы."
        return prompt

    async def build_all_steps_prompt(self, state: dict, skeleton: dict,
                                     pinned_step: int = None, question: str = None) -> str:
        """Один промпт для генерации всех 5 шагов сразу (экономит вызовы к LLM).
        Если pinned_step задан — этот шаг фиксируется (не переписывается), а
        остальные перегенерируются согласованно с ним и с уточнением question."""
        main_prompt = await self._load_file("1 главный промпт.md")
        step_rules = await self._load_file("13_генератор_шага_промпт.md")
        goal = state.get("target_goal", "Не указана")
        domain = _detect_domain(goal)
        steps_state = state.get("steps", {}) or {}

        def _step_content(i: int) -> str:
            s = steps_state.get(f"step{i}")
            if isinstance(s, dict):
                return (s.get("content") or "").strip()
            return s.strip() if isinstance(s, str) else ""

        theses = []
        for i in range(1, 6):
            plan = skeleton.get(f"step{i}", {})
            thesis = plan.get("thesis", "") if isinstance(plan, dict) else str(plan)
            theses.append(f"  Шаг {i}: {thesis}")
        theses_block = "\n".join(theses)

        prompt = f"{main_prompt}\n\n{step_rules}\n\n"
        prompt += f"ЦЕЛЬ ИССЛЕДОВАНИЯ: {goal}\nДОМЕН: {domain}\n"
        if domain == "math_code":
            prompt += "Для math_code: цепочка операция → кризис записи/вычисления → новая операция. Формулы в LaTeX.\n"
        prompt += f"ПЛАН ОТ АРХИТЕКТОРА (тезисы шагов):\n{theses_block}\n\n"
        prompt += _ANTI_ECHO

        if pinned_step and 1 <= int(pinned_step) <= 5:
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

        prompt += (
            "ЗАДАЧА: Сгенерируй связный текст для ВСЕХ пяти шагов диалектического конспекта, "
            "следуя плану и правилам объёма по шагам. Шаги 1-4 — коротко. Шаг 5 — вывод/синтез, можно развёрнуто.\n\n"
            "ФОРМАТ ВЫВОДА — ровно пять блоков, каждый начинается со своей строки-маркера "
            "(маркер писать точно как показано, на отдельной строке, ничего вне блоков):\n"
            "===ШАГ1===\n<текст шага 1>\n===ШАГ2===\n<текст шага 2>\n===ШАГ3===\n<текст шага 3>\n"
            "===ШАГ4===\n<текст шага 4>\n===ШАГ5===\n<текст шага 5>"
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
