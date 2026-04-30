from datetime import datetime, date
from typing import Optional, Union

def parse_date_input(d_str: Optional[Union[str, date, datetime]]) -> Union[date, datetime]:
    """
    Парсит ввод даты от пользователя или из формы.
    
    Args:
        d_str: Входное значение даты (строка, date или datetime).
        
    Returns:
        Объект date или datetime. Если ввод пустой или некорректный, 
        возвращает текущую дату.
    """
    if not d_str:
        return datetime.now().date()
    
    if isinstance(d_str, (datetime, date)):
        return d_str
        
    try:
        s_val = str(d_str).strip()
        # Обработка ISO-8601 формата (например, 2023-11-21T14:30)
        if 'T' in s_val:
            try:
                return datetime.fromisoformat(s_val)
            except ValueError:
                # Если 'T' есть, но формат не идеальный ISO, пробуем взять только дату
                clean_str = s_val.split('T')[0]
                return datetime.strptime(clean_str, '%Y-%m-%d').date()
                
        # Обработка стандартной строки даты (например, 2023-11-21)
        clean_str = s_val.split()[0]
        return datetime.strptime(clean_str, '%Y-%m-%d').date()
    except (ValueError, IndexError):
        # Если все попытки провалились, возвращаем сегодня
        return datetime.now().date()


def normalize_date(db_value: Optional[Union[datetime, date, str]]) -> Optional[date]:
    """
    Нормализует значение даты из БД в объект date.
    
    Args:
        db_value: Значение из БД (объект datetime, date или строка).
        
    Returns:
        Объект date или None, если нормализация не удалась.
    """
    if not db_value:
        return None
    if isinstance(db_value, (datetime, date)):
        return db_value.date() if isinstance(db_value, datetime) else db_value
    
    # Используем parse_date_input для строк, но возвращаем None при ошибке (вместо "сегодня")
    try:
        res = parse_date_input(db_value)
        return res.date() if isinstance(res, datetime) else res
    except Exception:
        return None

from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, YEARLY, MO, TU, WE, TH, FR, SA, SU

# Горизонт генерации повторяющихся событий (дней вперёд от сегодня)
RECURRENCE_HORIZON_DAYS: int = 366 * 2

# Максимум экземпляров одного правила (защита от взрыва БД)
RECURRENCE_MAX_INSTANCES: int = 500

WEEKDAY_MAP: dict[str, int] = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
WEEKDAY_MAP_R = {"mon": MO, "tue": TU, "wed": WE, "thu": TH, "fri": FR, "sat": SA, "sun": SU}

FREQ_MAP = {
    "daily": DAILY,
    "weekly": WEEKLY,
    "monthly": MONTHLY,
    "yearly": YEARLY,
    "biweekly": WEEKLY, # biweekly handled by interval=2
}

def parse_recurrence_rule(rule: str) -> tuple[Optional[str], Optional[set[int]]]:
    """
    Парсит строку правила повторения.
    """
    if not rule:
        return None, None
    parts = rule.split(":", 1)
    freq = parts[0].strip().lower()
    weekdays: Optional[set[int]] = None
    if len(parts) == 2:
        weekdays = set()
        for d in parts[1].split(","):
            d = d.strip().lower()
            if d in WEEKDAY_MAP:
                weekdays.add(WEEKDAY_MAP[d])
    if freq == "weekdays":
        weekdays = {0, 1, 2, 3, 4}
        freq = "weekly"
    return freq, weekdays

def generate_dates_rrule(start_dt: datetime, rule_str: str, end_date: Optional[date] = None, horizon: date = None) -> list[datetime]:
    """
    Генерирует даты повторений через dateutil.rrule.
    """
    freq_str, weekdays_set = parse_recurrence_rule(rule_str)
    if not freq_str or freq_str not in FREQ_MAP:
        return []
        
    until_dt = None
    if end_date:
        until_dt = datetime.combine(end_date, datetime.max.time())
    if horizon:
        horizon_dt = datetime.combine(horizon, datetime.max.time())
        until_dt = min(until_dt, horizon_dt) if until_dt else horizon_dt

    interval = 2 if freq_str == "biweekly" else 1
    byweekday = None
    if weekdays_set is not None:
        # Преобразуем индексы 0-6 в константы MO-SU
        byweekday = [ [MO, TU, WE, TH, FR, SA, SU][i] for i in weekdays_set ]

    # dtstart — это дата начала (первое событие).
    rr = rrule(
        FREQ_MAP[freq_str],
        dtstart=start_dt,
        interval=interval,
        byweekday=byweekday,
        until=until_dt
    )
    
    # Первое событие (start_dt) обычно входит в список, если оно соответствует правилу.
    # Но в нашей системе Template — это и есть первое событие.
    # Мы вернем список начиная со ВТОРОГО события, так как первое уже в БД как Template.
    all_dates = list(rr)
    if all_dates and all_dates[0] == start_dt:
        return all_dates[1:]
    return all_dates
