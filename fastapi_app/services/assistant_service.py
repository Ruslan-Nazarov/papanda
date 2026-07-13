import json
import os
from pathlib import Path
from typing import Dict, List, Set, Tuple
from groq import Groq, APIError, RateLimitError
from ..config import BASE_DIR
from ..logger import logger

MODEL_NAME = "llama-3.3-70b-versatile"
FALLBACK_MODEL_NAME = "llama-3.1-8b-instant"

GENERAL_OVERVIEW_RU = (
    "ОБЩАЯ СТРУКТУРА ПРИЛОЖЕНИЯ PAPANDA:\n"
    "papanda — это облачное SaaS-приложение, объединяющее три ключевые сферы: конспекты (диалектическая методология познания), изучение языков (через живые предложения и тройки слов) и тайм-менеджмент.\n"
    "• Главный экран (Дашборд / Хронология) содержит оперативные виджеты: «Сегодня» (календарь и расписание), «Задачи» (главная задача и декомпозиция целей), «Привычки» (трекер регулярности), «Хронология» (дневник воспоминаний), «Слова» (изучение иностранных языков) и «Заметки» (быстрые заметки).\n"
    "• Модуль «Конспекты» (Диалектика) основан на методологии развития: слева собираются абстракции (простейший процесс, противоположность, противоречие), справа — их конкретное развитие. В каждом блоке есть словарь, хаки понимания, стикеры, источники и Помощь ИИ.\n"
    "• «Стикеры» — это связующий элемент, доски с заметками, крепящимися к задачам, привычкам и календарю.\n"
    "• Верхнее меню (Top Menu) содержит быстрый ввод, счетчики «До/После», ненавязчивые напоминания Wink (Подмигивания) и переключение языков (RU/EN/KZ).\n"
)


def _load_knowledge_base() -> Dict[str, Dict[str, str]]:
    """Загружает базу знаний напрямую из Markdown-файлов в папке docs и промптов из папки prompts."""
    kb: Dict[str, Dict[str, str]] = {"ru": {}, "en": {}, "kz": {}, "kk": {}}
    
    # 1. Динамическое чтение актуальных Markdown-файлов из docs/
    dashboard_section_map = [
        (("1.", "Хронология", "Chronology"), "chronology"),
        (("2.", "Слова", "Words", "Сөздер"), "words"),
        (("3.", "Стикеры", "Stickers", "Стикерлер"), "stickers"),
        (("4.", "Сегодня", "Today", "Бүгін"), "today_calendar"),
        (("5.", "Обзор занятий", "Activity", "Белсенділік"), "activity_tree"),
        (("6.", "Заметки", "Notes", "Жазбалар"), "notes"),
        (("7.", "Привычки", "Habits", "Әдеттер"), "habits"),
        (("8.", "Задачи", "Tasks", "Тапсырмалар"), "tasks"),
        (("9.", "Верхнее", "Top", "Жоғарғы"), "top_menu"),
        (("10.", "Нижнее", "Bottom", "Төменгі"), "bottom_menu"),
    ]

    lang_files = {
        "ru": ("GUIDE_RU.md", "REFERENCE_RU.md"),
        "en": ("GUIDE_EN.md", "REFERENCE_EN.md"),
        "kz": ("GUIDE_KZ.md", "REFERENCE_KZ.md"),
        "kk": ("GUIDE_KZ.md", "REFERENCE_KZ.md"),
    }

    # Чтение промптов из папки prompts
    prompts_dir = BASE_DIR / "prompts"
    prompts_text = ""
    if prompts_dir.exists() and prompts_dir.is_dir():
        try:
            for p_file in sorted(prompts_dir.iterdir()):
                if p_file.is_file() and p_file.suffix in [".md", ".json", ".txt"]:
                    with open(p_file, "r", encoding="utf-8") as pf:
                        prompts_text += f"\n\n--- ПРОМПТ / АЛГОРИТМ: {p_file.name} ---\n{pf.read()}"
        except Exception as e:
            logger.error(f"Error reading prompts directory: {e}")

    for lang, (guide_name, ref_name) in lang_files.items():
        if lang not in kb:
            kb[lang] = {}

        if prompts_text:
            kb[lang]["prompts"] = prompts_text

        # Чтение руководства по дашборду по секциям
        dash_guide_path = BASE_DIR / "docs" / "about_dashboard" / guide_name
        if dash_guide_path.exists():
            try:
                with open(dash_guide_path, "r", encoding="utf-8") as f:
                    content = f.read()
                parts = content.split("\n## ")
                for part in parts[1:]:
                    lines = part.split("\n", 1)
                    header = lines[0]
                    body = lines[1].strip() if len(lines) > 1 else ""
                    for keywords, cat in dashboard_section_map:
                        if any(kw in header for kw in keywords):
                            kb[lang][cat] = body
                            break
            except Exception as e:
                logger.error(f"Error parsing dashboard guide {guide_name}: {e}")

        # Чтение руководства и справочника по конспектам (Диалектика)
        dial_guide_path = BASE_DIR / "docs" / "about_dialectics" / "guide" / guide_name
        dial_ref_path = BASE_DIR / "docs" / "about_dialectics" / "reference" / ref_name
        dial_text = ""
        if dial_guide_path.exists():
            try:
                with open(dial_guide_path, "r", encoding="utf-8") as gf:
                    dial_text += gf.read()
            except Exception as e:
                logger.error(f"Error reading dialectics guide {guide_name}: {e}")
        if dial_ref_path.exists():
            try:
                with open(dial_ref_path, "r", encoding="utf-8") as rf:
                    dial_text += f"\n\n--- СПРАВОЧНИК ПО ИНТЕРФЕЙСУ И КНОПКАМ ---\n{rf.read()}"
            except Exception as e:
                logger.error(f"Error reading dialectics reference {ref_name}: {e}")
        if dial_text:
            kb[lang]["dialectics_methodology"] = dial_text

        # Базовые описания страниц дашборда и настроек
        dashboard_ru = (
            "Вы находитесь на главной странице приложения papanda — Дашборде (или Хронологии). "
            "Здесь расположены оперативные виджеты: «Сегодня» (календарь и расписание на день), "
            "«Задачи» (управление главными целями и шагами), «Привычки» (трекер регулярных привычек), "
            "«Хронология» (лента событий и воспоминаний) и виджет изучения иностранных слов. "
            "С дашборда вы можете управлять всем своим временем и задачами. Если вам нужно перейти в модуль «Конспекты» (Диалектика), "
            "тапните по соответствующей кнопке в верхнем меню."
        )
        dashboard_en = (
            "You are on the main page of the papanda application — the Dashboard (or Chronology). "
            "Here you can manage your daily calendar ('Today' widget), track goals and tasks ('Tasks' widget), "
            "record events and memories ('Chronology'), monitor habits ('Habits'), and learn foreign words. "
            "You can also switch to the 'Notes' (Dialectics) module by tapping the corresponding button in the top menu."
        )
        dashboard_kz = (
            "Сіз papanda қосымшасының басты бетіндесіз — Дашборд (немесе Хронология). "
            "Мұнда «Бүгін» (күнтізбе), «Тапсырмалар», «Әдеттер», «Хронология» және шет тілін үйрену виджеттерімен жұмыс істеуге болады. "
            "Сондай-ақ, жоғарғы мәзірдегі тиісті түймені басу арқылы «Конспектілер» (Диалектика) модуліне өтуге болады."
        )
        settings_ru = (
            "Вы находитесь в разделе Настроек приложения papanda. Здесь вы можете управлять отображением и видимостью виджетов на дашборде, "
            "настраивать параметры изучения иностранных слов (например, частоту смены слов), а также выбирать язык интерфейса приложения."
        )
        settings_en = (
            "You are in the Settings section of the papanda application. Here you can manage widget visibility on the dashboard, "
            "configure foreign word learning parameters, and choose the application interface language."
        )
        settings_kz = (
            "Сіз papanda қосымшасының Реттеулер бөліміндесіз. Мұнда дашбордтағы виджеттердің көрінуін басқаруға, "
            "сөз үйрену параметрлерін реттеуге және интерфейс тілін таңдауға болады."
        )
        
        d_text = dashboard_ru if lang == "ru" else (dashboard_en if lang == "en" else dashboard_kz)
        s_text = settings_ru if lang == "ru" else (settings_en if lang == "en" else settings_kz)
        kb[lang].setdefault("dashboard", d_text)
        kb[lang].setdefault("settings", s_text)

    return kb


KNOWLEDGE_BASE: Dict[str, Dict[str, str]] = _load_knowledge_base()


def _get_categories() -> List[str]:
    """Динамически формирует список доступных категорий из базы знаний."""
    categories: Set[str] = set()
    for lang_dict in KNOWLEDGE_BASE.values():
        if isinstance(lang_dict, dict):
            categories.update(lang_dict.keys())
    categories.add("unknown")
    return sorted(list(categories))


AVAILABLE_CATEGORIES: List[str] = _get_categories()

_groq_client = None

def get_groq_client() -> Groq:
    """Возвращает инициализированный клиент Groq с ленивой загрузкой ключа."""
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            # На случай, если .env еще не загружен (хотя config.py уже должен был это сделать)
            from dotenv import load_dotenv
            from ..config import BASE_DIR
            load_dotenv(dotenv_path=BASE_DIR / ".env")
            api_key = os.getenv("GROQ_API_KEY")
        
        if not api_key or api_key == "your_groq_api_key_here":
            api_key = "dummy_key_if_not_set"
            
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def classify_query(user_query: str, page: str = None, history: List[Dict[str, str]] = None) -> Tuple[str, str]:
    """
    Классифицирует запрос пользователя по категории и языку с учетом истории диалога.
    Возвращает кортеж (ключ категории, код языка).
    """
    if not user_query or not user_query.strip(): return "unknown", "ru"

    full_query = user_query
    if history and isinstance(history, list):
        last_user_msgs = [m.get("content", "") for m in history if isinstance(m, dict) and m.get("role") == "user" and m.get("content")]
        if last_user_msgs:
            full_query = f"{last_user_msgs[-1]} {user_query}"

    q_lower = full_query.lower()
    lang_code = "kz" if any(c in q_lower for c in "әіңғүұқөһ") else ("ru" if any(c in q_lower for c in "абвгдеёжзийклмнопрстуфхцчшщъыьэюя") else "en")
    
    if any(w in q_lower for w in ["конспект", "диалектик", "противоположн", "әдістеме", "conspect", "dialectic", "хаки понимания", "простейший процесс"]):
        return "dialectics_methodology", lang_code
    if any(w in q_lower for w in ["слов", "слово", "слова", "словам", "словами", "словах", "word", "words", "сөз", "сөздер", "иностранн"]):
        return "words", lang_code
    if any(w in q_lower for w in ["хронологи", "chronology", "воспоминани", "лента событий"]):
        return "chronology", lang_code
    if any(w in q_lower for w in ["сегодня", "календар", "today", "calendar", "бүгін", "күнтізбе", "расписание"]):
        return "today_calendar", lang_code
    if any(w in q_lower for w in ["привычк", "habit", "habits", "әдет"]):
        return "habits", lang_code
    if any(w in q_lower for w in ["дерев", "активност", "activity", "tree", "белсенділік"]):
        return "activity_tree", lang_code
    if any(w in q_lower for w in ["задач", "цель", "цели", "task", "tasks", "тапсырма"]):
        return "tasks", lang_code
    if any(w in q_lower for w in ["стикер", "sticker", "stickers"]):
        return "stickers", lang_code
    if any(w in q_lower for w in ["заметк", "жазбалар", "notes widget", "виджет заметки"]):
        return "notes", lang_code
    if any(w in q_lower for w in ["wink", "подмигиван", "до и после", "верхн", "top menu"]):
        return "top_menu", lang_code
    if any(w in q_lower for w in ["футер", "обратная связь", "changelog", "разработчик", "bottom menu", "нижн", "о проекте"]):
        return "bottom_menu", lang_code
    if any(w in q_lower for w in ["промпт", "промт", "prompt", "алгоритм", "формул", "восстановлен", "статьи", "статья", "метапромпт", "генераци", "инструкци", "prompts"]):
        return "prompts", lang_code
    if any(w in q_lower for w in ["настройк", "setting", "settings", "реттеу", "смена языка", "язык интерфейса"]):
        return "settings", lang_code
    if any(w in q_lower for w in ["дашборд", "главная страница", "dashboard", "басты бет"]):
        return "dashboard", lang_code

    categories_str = ", ".join(AVAILABLE_CATEGORIES)
    page_hint = ""
    if page:
        p = page.lower().strip()
        if p == "/dashboard" or "/history" in p or "/dashboard/" in p:
            page_hint = "\nRULE: Пользователь сейчас находится на странице Дашборда (страница с виджетами задач, календарем, словами и привычками). Если он задает общий вопрос про текущее место ('что тут делают', 'что это за страница', 'что здесь делать', 'где я', 'как тут работать', 'что тут можно делать', 'что тут'), ОБЯЗАТЕЛЬНО выбери категорию: dashboard."
        elif p == "/" or p == "" or "/dialectics" in p or "/notes" in p or "/?" in page or p.startswith("/?"):
            page_hint = "\nRULE: Пользователь сейчас находится на странице Конспектов (Диалектика, умные конспекты, создание заметок). Если он задает общий вопрос про текущее место ('что тут делают', 'что это за страница', 'что здесь делать', 'где я', 'как тут работать', 'что тут можно делать', 'что тут'), ОБЯЗАТЕЛЬНО выбери категорию: dialectics_methodology."
        elif "/settings" in p:
            page_hint = "\nRULE: Пользователь сейчас находится на странице Настроек. Если он задает общий вопрос про текущее место ('что тут делают', 'что это за страница', 'что здесь делать', 'где я', 'как тут работать', 'что тут можно делать', 'что тут'), ОБЯЗАТЕЛЬНО выбери категорию: settings."

    system_prompt = (
        "You are a classification assistant for the papanda application.\n"
        f"Available categories: {categories_str}.{page_hint}\n"
        "Your task is to classify the user query into exactly one category from the list and determine the language of the query (ru, kz, or en).\n"
        "CRITICAL RULE: В приложении papanda категория 'notes' — это ТОЛЬКО виджет «Заметки» (быстрые заметки на дашборде). Если вопрос про «Конспекты» (умные конспекты, диалектика, методология) — ОБЯЗАТЕЛЬНО выбирай категорию 'dialectics_methodology', НИ В КОЕМ СЛУЧАЕ НЕ 'notes'!\n"
        "RULE: If the query does not match any category, use 'unknown'.\n"
        "Output format: strictly two words separated by a comma: category_key, language_code (e.g. 'words, ru' or 'chronology, en'). Do not output anything else."
    )

    try:
        response = get_groq_client().chat.completions.create(
            model=FALLBACK_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_query}
            ],
            temperature=0.1,
            max_tokens=10,
        )
        content = response.choices[0].message.content or ""
        content = content.strip().lower().replace("category:", "").replace("lang:", "").replace("language:", "")
        
        parts = [part.strip("'\" ") for part in content.split(",") if part.strip()]
        if len(parts) >= 2: category, lang = parts[0], parts[1]
        elif len(parts) == 1: category, lang = parts[0], "ru"
        else: category, lang = "unknown", "ru"
            
        if category not in AVAILABLE_CATEGORIES: category = "unknown"
        if lang not in ["ru", "kz", "en"]: lang = "ru"
            
        return category, lang
    except (RateLimitError, APIError):
        raise
    except Exception as e:
        logger.warning(f"Error in classify_query: {e}")
        return "unknown", "ru"


def generate_assistant_response(user_query: str, page: str = None, history: List[Dict[str, str]] = None) -> str:
    """
    Генерирует ответ ИИ-помощника на основе базы знаний приложения с учетом истории диалога и мультиконтекста.
    """
    if not user_query or not user_query.strip(): return "Пожалуйста, задайте вопрос по функционалу приложения papanda."

    try:
        category, lang = classify_query(user_query, page=page, history=history)
        
        if category == "unknown" and page:
            q_lower = user_query.lower()
            general_keywords = ["что тут", "что делать", "что здесь", "где я", "что это", "как работать", "тут делают", "здесь делают", "эта страница", "для чего", "как пользоваться", "что можно делать"]
            if any(kw in q_lower for kw in general_keywords):
                p = page.lower().strip()
                if p == "/dashboard" or "/history" in p or "/dashboard/" in p:
                    category = "dashboard"
                elif p == "/" or p == "" or "/dialectics" in p or "/notes" in p or "/?" in page or p.startswith("/?"):
                    category = "dialectics_methodology"
                elif "/settings" in p:
                    category = "settings"

        lang_dict = KNOWLEDGE_BASE.get(lang) or KNOWLEDGE_BASE.get("ru", {})
        context_text = lang_dict.get(category, "")
        if not context_text and lang != "ru": context_text = KNOWLEDGE_BASE.get("ru", {}).get(category, "")

        # Мультиконтекстная загрузка связанных разделов
        related_cats = []
        if category == "words": related_cats = ["dashboard", "settings"]
        elif category == "tasks": related_cats = ["stickers", "today_calendar", "activity_tree"]
        elif category == "stickers": related_cats = ["tasks", "habits", "today_calendar"]
        elif category == "today_calendar": related_cats = ["tasks", "activity_tree", "stickers"]
        elif category == "activity_tree": related_cats = ["today_calendar", "tasks"]
        elif category == "dashboard": related_cats = ["today_calendar", "tasks", "habits", "chronology", "words", "notes"]
        elif category == "dialectics_methodology": related_cats = ["top_menu", "prompts"]
        elif category == "prompts": related_cats = ["dialectics_methodology"]

        for r_cat in related_cats:
            r_text = lang_dict.get(r_cat) or KNOWLEDGE_BASE.get("ru", {}).get(r_cat, "")
            if r_text:
                context_text += f"\n\n--- ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ ({r_cat}) ---\n{r_text}"

        if category == "unknown" or not context_text:
            if lang in ["kz", "kk"]:
                return "Өкінішке орай, мен бұл ақпаратты анықтамалықтан таппадым."
            elif lang == "en":
                return "Unfortunately, I could not find this information in the reference guide."
            return "К сожалению, я не нашел этой информации в справочнике."

        system_prompt = (
            "Вы — интеллектуальный гид и служба поддержки SaaS-приложения papanda.\n"
            "Ваша цель — давать точные, развернутые, понятные и полезные ответы на основе предоставленного справочника и философии приложения.\n\n"
            f"{GENERAL_OVERVIEW_RU}\n"
            f"ДЕТАЛЬНАЯ СПРАВКА ПО ТЕМЕ:\n{context_text}\n\n"
            "ПРАВИЛА ОТВЕТА:\n"
            "1. Отвечайте подробно, связно и по существу. Если вопрос касается методологии (например, как писать диалектический конспект или как учить слова без зубрежки) — объясняйте логику и философию papanda, приводите примеры.\n"
            "2. Учитывайте контекст диалога (историю сообщений), чтобы понимать отсылки пользователя (например, «а как этим пользоваться?», «где эта кнопка?»).\n"
            "3. ЗАПРЕЩЕНО выдумывать функции, модули или кнопки, которых нет в приложении papanda. Модуль диалектики называется строго «Конспекты» (никаких «дневниковых записей»), а быстрые заметки на дашборде — «Заметки».\n"
            "4. Если в справочнике совсем нет информации по вопросу, вежливо сообщите об этом, но если вопрос связан с общими принципами тайм-менеджмента, языков или конспектов — постарайтесь помочь на основе общей философии papanda.\n"
            f"5. Всегда обращайтесь к пользователю на вы (вежливо и формально) и строго на том языке, на котором задан вопрос (код языка: '{lang}').\n"
            "6. Название приложения papanda всегда пишите строго с маленькой буквы (никогда не используйте заглавную букву P)."
        )

        messages_payload = [{"role": "system", "content": system_prompt}]
        if history and isinstance(history, list):
            for msg in history[-6:]:
                if isinstance(msg, dict):
                    role = msg.get("role", "user")
                    if role not in ["user", "assistant"]: role = "user"
                    content = msg.get("content", "").strip()
                    if content:
                        messages_payload.append({"role": role, "content": content})
        messages_payload.append({"role": "user", "content": user_query})

        try:
            response = get_groq_client().chat.completions.create(
                model=MODEL_NAME,
                messages=messages_payload,
                temperature=0.3,
                max_tokens=800,
            )
            return response.choices[0].message.content or ""
        except (RateLimitError, APIError) as e:
            logger.warning(f"Groq API error on 70B ({e}), falling back to 8B")
            response = get_groq_client().chat.completions.create(
                model=FALLBACK_MODEL_NAME,
                messages=messages_payload,
                temperature=0.3,
                max_tokens=800,
            )
            return response.choices[0].message.content or ""

    except RateLimitError as e:
        logger.warning(f"Groq API RateLimitError: {e}")
        return "Извините, система сейчас испытывает высокую нагрузку (слишком много запросов). Пожалуйста, подождите немного и повторите ваш запрос позже."
    except APIError as e:
        logger.error(f"Groq APIError: {e}")
        return "Извините, в данный момент ИИ-помощник временно недоступен из-за технических неполадок сервиса. Пожалуйста, попробуйте позже."
    except Exception as e:
        logger.error(f"Unexpected error in generate_assistant_response: {e}", exc_info=True)
        return "Произошла непредвиденная ошибка при обработке вашего запроса. Пожалуйста, попробуйте немного позже."
