import re

_MIN_STEP_CHARS = 120

_NUMBER_UNIT_RE = re.compile(
    r"\d[\d\s.,]*\s*(°|%|км|м²|м³|мм|см|м\b|кг|г\b|мг|т\b|с\b|мс|мин|ч\b|сут|лет|год|дн|"
    r"руб|\$|€|Дж|кДж|Н\b|Вт|кВт|Гц|Па|В\b|А\b|Ом|К\b|моль|л\b|мл)",
    re.IGNORECASE,
)

def _sort_key(key: str) -> list:
    return [int(p) for p in key.split(".")]

def _base_of(key: str) -> str:
    return key.split(".")[0]

_CTRL_TO_BACKSLASH = {"\r": "\\r", "\f": "\\f", "\t": "\\t", "\x08": "\\b", "\x07": "\\a", "\x0b": "\\v"}

_NL_LATEX_RE = re.compile(r"\n(?=(?:abla|eq|otin|u|leq|geq|i|ni|par)\b)")

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

_MAX_TOKENS = {
    "step": 2600,
    "step5": 3800,
    # 700 хватало на low; medium-reasoning тратит часть бюджета на сами
    # рассуждения до JSON-ответа — подняли, чтобы вывод не обрезался.
    "judge": 1000,
    "history": 2000,
}

_MAX_GENERATION_ATTEMPTS = 2

_MAX_STAGE_RETRIES = 2

_STAGE_MAX_TOKENS = 6000

_MAX_PLAN_ATTEMPTS = 2
