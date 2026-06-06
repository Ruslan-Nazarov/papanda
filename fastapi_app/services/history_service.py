import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date
from typing import List, Tuple, Any, Type, Optional

from ..utils import normalize_date
from .. import models

logger = logging.getLogger(__name__)

class HistoryService:
    """Сервис для работы с историей и архивом данных."""
    
    def __init__(self, db: AsyncSession):
        """
        Инициализирует сервис.
        
        Args:
            db: Асинхронная сессия SQLAlchemy.
        """
        self.db = db

    async def get_recent_for_model(self, model_class: Type[Any], date_col_name: str, target_d: date, is_today_mode: bool, current_year: int) -> List[Any]:
        """
        Ищет записи для указанной модели: либо за конкретный день, либо ближайшие по дате.
        
        Args:
            model_class: Класс модели SQLAlchemy.
            date_col_name: Имя колонки с датой.
            target_d: Целевая дата.
            is_today_mode: Флаг режима "В этот день" (поиск за это же число в прошлые годы).
            current_year: Текущий год.
            
        Returns:
            List[Any]: Список найденных объектов модели.
        """
        date_col = getattr(model_class, date_col_name)

        if is_today_mode:
            # Режим "В этот день" — ищем за это число в прошлые годы
            md = target_d.strftime("%m-%d")
            year_str = str(current_year)

            res = await self.db.execute(select(model_class).where(
                func.strftime("%m-%d", date_col) == md,
                func.strftime("%Y", date_col) != year_str
            ).order_by(date_col.desc()))
            items = res.scalars().all()

            if not items:
                # Если за это число ничего нет — ищем ближайшую запись ВООБЩЕ в прошлом (до сегодняшнего дня)
                res = await self.db.execute(select(model_class).where(
                    func.date(date_col) < func.date(target_d)
                ).order_by(date_col.desc()).limit(1))
                last_item = res.scalar_one_or_none()
                if last_item:
                    last_d_raw = getattr(last_item, date_col_name)
                    # Нормализуем через нашу утилиту
                    last_d_dt = normalize_date(last_d_raw)
                    if last_d_dt:
                        last_d = last_d_dt.date() if isinstance(last_d_dt, datetime) else last_d_dt
                        start_dt = datetime.combine(last_d, datetime.min.time())
                        end_dt = datetime.combine(last_d, datetime.max.time())
                        res = await self.db.execute(select(model_class).where(
                            date_col >= start_dt, date_col <= end_dt
                        ).order_by(date_col.desc()))
                        items = res.scalars().all()
        else:
            # Режим конкретной даты
            start_dt = datetime.combine(target_d, datetime.min.time())
            end_dt = datetime.combine(target_d, datetime.max.time())

            res = await self.db.execute(select(model_class).where(
                date_col >= start_dt, date_col <= end_dt
            ).order_by(date_col.desc()))
            items = res.scalars().all()

            if not items:
                # Если за этот день пусто — ищем ближайшую запись (в прошлом или будущем)
                # 1. Ближайшая в прошлом
                res_past = await self.db.execute(select(model_class).where(
                    func.date(date_col) < func.date(target_d)
                ).order_by(date_col.desc()).limit(1))
                item_past = res_past.scalar_one_or_none()

                # 2. Ближайшая в будущем
                res_future = await self.db.execute(select(model_class).where(
                    func.date(date_col) > func.date(target_d)
                ).order_by(date_col.asc()).limit(1))
                item_future = res_future.scalar_one_or_none()

                best_item: Optional[Any] = None
                if item_past and item_future:
                    d_past_dt = normalize_date(getattr(item_past, date_col_name))
                    d_future_dt = normalize_date(getattr(item_future, date_col_name))

                    if d_past_dt and d_future_dt:
                        if isinstance(d_past_dt, date) and not isinstance(d_past_dt, datetime):
                            d_past_dt = datetime.combine(d_past_dt, datetime.min.time())
                        if isinstance(d_future_dt, date) and not isinstance(d_future_dt, datetime):
                            d_future_dt = datetime.combine(d_future_dt, datetime.min.time())

                        target_dt = datetime.combine(target_d, datetime.min.time())
                        if (target_dt - d_past_dt) <= (d_future_dt - target_dt):
                            best_item = item_past
                        else:
                            best_item = item_future
                    else:
                        best_item = item_past or item_future
                else:
                    best_item = item_past or item_future

                if best_item:
                    best_d_raw = getattr(best_item, date_col_name)
                    best_d_dt = normalize_date(best_d_raw)
                    if best_d_dt:
                        best_d = best_d_dt.date() if isinstance(best_d_dt, datetime) else best_d_dt
                        s_dt = datetime.combine(best_d, datetime.min.time())
                        e_dt = datetime.combine(best_d, datetime.max.time())
                        res = await self.db.execute(select(model_class).where(
                            date_col >= s_dt, date_col <= e_dt
                        ).order_by(date_col.desc()))
                        items = res.scalars().all()

        return items

    async def get_history_for_date(self, target_date: date, is_today_in_history: bool) -> Tuple[List[models.Event], List[models.Chronology], List[models.Notes], List[models.Wink]]:
        """
        Собирает историю за указанную дату для всех основных типов данных.
        
        Args:
            target_date: Целевая дата.
            is_today_in_history: Флаг режима "В этот день".
            
        Returns:
            Tuple: (события, хронология, заметки, мигалки).
        """
        current_year = datetime.now().date().year
        events = await self.get_recent_for_model(models.Event, "date", target_date, is_today_in_history, current_year)
        chronology = await self.get_recent_for_model(models.Chronology, "date", target_date, is_today_in_history, current_year)
        notes = await self.get_recent_for_model(models.Notes, "created_at", target_date, is_today_in_history, current_year)
        wink = await self.get_recent_for_model(models.Wink, "date", target_date, is_today_in_history, current_year)
        return events, chronology, notes, wink

    async def get_word_cloud_data(self, target_date: date, sources: List[str]) -> dict:
        """
        Агрегирует текстовые данные за период target_date +/- 15 дней по указанным источникам
        и возвращает частотную карту слов.
        """
        import re
        from collections import Counter
        from datetime import timedelta

        start_date = target_date - timedelta(days=15)
        end_date = target_date + timedelta(days=15)

        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())

        texts = []
        counts_by_source = {
            "chronology": 0,
            "calendar": 0,
            "notes": 0,
            "wink": 0,
            "stickers": 0,
            "tasks": 0,
            "habits": 0
        }

        # 1. Chronology
        if "chronology" in sources:
            res = await self.db.execute(select(models.Chronology).where(
                models.Chronology.date >= start_dt,
                models.Chronology.date <= end_dt
            ))
            for item in res.scalars().all():
                if item.title:
                    texts.append(item.title)
                    counts_by_source["chronology"] += 1

        # 2. Calendar / Event
        if "calendar" in sources:
            res = await self.db.execute(select(models.Event).where(
                models.Event.date >= start_dt,
                models.Event.date <= end_dt
            ))
            for item in res.scalars().all():
                if item.title:
                    texts.append(item.title)
                    counts_by_source["calendar"] += 1

        # 3. Notes
        if "notes" in sources:
            res = await self.db.execute(select(models.Notes).where(
                models.Notes.created_at >= start_dt,
                models.Notes.created_at <= end_dt
            ))
            for item in res.scalars().all():
                if item.note:
                    texts.append(item.note)
                    counts_by_source["notes"] += 1

        # 4. Wink
        if "wink" in sources:
            res = await self.db.execute(select(models.Wink).where(
                models.Wink.date >= start_dt,
                models.Wink.date <= end_dt
            ))
            for item in res.scalars().all():
                if item.title:
                    texts.append(item.title)
                    counts_by_source["wink"] += 1

        # 5. Stickers
        if "stickers" in sources:
            res = await self.db.execute(select(models.StickyNote).where(
                models.StickyNote.created_at >= start_dt,
                models.StickyNote.created_at <= end_dt
            ))
            for item in res.scalars().all():
                if item.title:
                    texts.append(item.title)
                if item.text:
                    texts.append(item.text)
                counts_by_source["stickers"] += 1

        # 6. Tasks
        if "tasks" in sources:
            res = await self.db.execute(select(models.Task).where(
                models.Task.created_at >= start_dt,
                models.Task.created_at <= end_dt
            ))
            for item in res.scalars().all():
                if item.name:
                    texts.append(item.name)
                    counts_by_source["tasks"] += 1

        # 7. Habits
        if "habits" in sources:
            res = await self.db.execute(select(models.Habit).where(
                models.Habit.start_date >= start_date,
                models.Habit.start_date <= end_date
            ))
            for item in res.scalars().all():
                if item.title:
                    texts.append(item.title)
                    counts_by_source["habits"] += 1

        # Stop words (exhaustively filtered to remove fillers, parasites, common verbs, and auxiliaries)
        stop_words = {
            # Russian stop words & filler words
            "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то", "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за", "бы", "по", "только", "ее", "мне", "было", "вот", "от", "меня", "еще", "ещё", "нет", "о", "из", "ему", "же", "им", "хотя", "ней", "для", "них", "тебя", "нас", "эти", "это", "этот", "этого", "чтобы", "даже", "вдруг", "через", "при", "после", "если", "или", "быть", "один", "два", "три", "могу", "будет", "были", "был", "была", "всех", "всего", "всеми", "всему", "эту", "над", "под", "перед", "тем", "тех", "чем", "сейчас", "тоже", "когда", "куда", "где", "тогда", "кто", "что-то", "какой", "какая", "какое", "какие", "очень", "уже", "раз", "своей", "своего", "свои", "своих", "своим", "своими", "себя", "себе", "собой", "ли", "лишь", "моя", "мой", "мое", "мои", "наш", "наша", "наше", "наши", "ваш", "ваша", "ваше", "ваши", "его", "ее", "их", "тот", "та", "те", "то", "эти", "этот", "эта", "это", "тут", "там", "здесь", "где", "куда", "откуда", "почему", "зачем", "как", "сколько", "какой", "каков", "чей", "около", "возле", "вдоль", "сквозь", "через", "вокруг", "после", "прежде", "сверх", "сзади", "спереди", "напротив", "посередине",
            "сегодня", "завтра", "вчера", "каждый", "день", "время", "просто", "потом", "также", "почему", "зачем", "хотя", "кто-то", "какой-то", "какая-то", "какое-то", "какие-то", "быть", "было", "были", "будет", "будут", "была", "надо", "нужно", "можно", "хочу", "могу", "может", "делать", "делаю", "делает", "делают", "сделать", "сделал", "сделала", "сделано", "сделали", "работает", "работать", "сказать", "говорить", "идти", "пойти", "прийти", "думать", "знать", "взять", "дать", "понять", "видеть", "смотреть", "писать", "записать", "читать", "прочитать", "написать", "вообще", "совсем", "прямо", "даже", "вдруг", "через", "после", "между", "перед", "около", "вокруг", "кроме", "вместо", "ввиду", "вдоль", "внутрь", "назад", "вперед", "вперёд", "пока", "лишь", "только", "почти", "снова", "опять", "назад", "короче", "типа", "вообще-то", "собственно", "значит", "понимаешь", "знаешь", "слушай", "реально", "фактически", "практически", "вероятно", "наверное", "конечно", "видимо", "кажется", "очевидно", "словом", "кстати", "например",
            # English stop words & fillers
            "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "would", "could", "should", "about", "above", "across", "after", "afterwards", "again", "against", "all", "almost", "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "amoungst", "amount", "an", "and", "another", "any", "anyhow", "anyone", "anything", "anyway", "anywhere", "are", "around", "as", "at", "back", "be", "became", "because", "become", "becomes", "becoming", "been", "before", "beforehand", "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both", "bottom", "but", "by", "call", "can", "cannot", "cant", "co", "con", "could", "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during", "each", "eg", "eight", "either", "eleven", "else", "elsewhere", "empty", "enough", "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except", "few", "fifteen", "fify", "fill", "find", "fire", "first", "five", "for", "former", "formerly", "forty", "found", "four", "from", "front", "full", "further", "get", "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself", "his", "how", "however", "hundred", "ie", "if", "in", "inc", "indeed", "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter", "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile", "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much", "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless", "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now", "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or", "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own", "part", "ltd", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem", "seemed", "seeming", "seems", "serious", "several", "she", "should", "show", "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "still", "such", "system", "take", "ten", "than", "that", "the", "their", "them", "themselves", "then", "thence", "there", "thereafter", "thereby", "therefor", "therein", "thereupon", "these", "they", "thickv", "thin", "third", "this", "those", "though", "three", "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward", "towards", "un", "under", "until", "up", "upon", "us", "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence", "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you", "your", "yours", "yourself", "yourselves",
            "today", "tomorrow", "yesterday", "every", "each", "some", "any", "other", "another", "such", "very", "just", "about", "above", "across", "after", "again", "against", "along", "already", "also", "although", "always", "among", "around", "before", "behind", "below", "beside", "between", "beyond", "during", "except", "inside", "outside", "under", "within", "without", "would", "could", "should", "might", "shall", "will", "going", "doing", "making", "taking", "getting", "having", "using", "working", "thinking", "knowing", "looking", "wanting", "telling", "saying", "coming"
        }

        words = []
        for text in texts:
            if not text:
                continue
            # Находим все русские и английские слова
            tokens = re.findall(r'[a-zA-Zа-яА-ЯёЁ]+', text.lower())
            for token in tokens:
                # Оставляем только значимые слова длиной более 3 символов
                if len(token) > 3 and token not in stop_words:
                    words.append(token)

        counter = Counter(words)
        top_words = [{"word": w, "count": c} for w, c in counter.most_common(50)]

        return {
            "words": top_words,
            "counts_by_source": counts_by_source,
            "total_words": len(words),
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }

