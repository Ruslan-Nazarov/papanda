from datetime import datetime, date

def normalize_date(db_value):
    if not db_value: return None
    if isinstance(db_value, datetime): return db_value.date()
    if isinstance(db_value, date): return db_value
    if isinstance(db_value, str):
        try:
            # Handle ISO format and simple YYYY-MM-DD
            if 'T' in db_value:
                return datetime.fromisoformat(db_value).date()
            clean_str = db_value.split(' ')[0] 
            return datetime.strptime(clean_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return None
    return None

def parse_date_input(d_str):
    if not d_str: return datetime.now().date()
    try:
        # Handle ISO-8601 format (e.g. 2023-11-21T14:30)
        if 'T' in str(d_str):
            try:
                return datetime.fromisoformat(str(d_str))
            except ValueError:
                # If T is present but the rest is not perfectly ISO, try to take only the date part
                clean_str = str(d_str).split('T')[0]
                return datetime.strptime(clean_str, '%Y-%m-%d').date()
                
        # Handle standard date string (e.g. 2023-11-21)
        clean_str = str(d_str).split()[0]
        return datetime.strptime(clean_str, '%Y-%m-%d').date()
    except ValueError:
        # Fallback only if both attempts failed
        return datetime.now().date()
