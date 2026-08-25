def normalize_locale(locale_code: str) -> str:
    """
    Normalizes a locale code (e.g. from a cookie or header) to its full language name
    as expected by the AI prompts.
    """
    if not locale_code:
        return "русском"
        
    locale_code = locale_code.lower()
    if "en" in locale_code:
        return "English"
    elif "kz" in locale_code:
        return "қазақша"
    else:
        return "русском"
