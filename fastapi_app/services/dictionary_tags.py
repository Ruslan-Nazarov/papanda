"""Initial categories for existing glossaries. Applied once by migration 009."""
import re


CATEGORIES = {
    'math': ('Математика', 'Mathematics', '#2563eb'),
    'network-types': ('Виды нейронных сетей', 'Neural network types', '#7c3aed'),
    'network-layers': ('Слои и параметры сети', 'Network layers and parameters', '#9333ea'),
    'training': ('Обучение нейросетей', 'Neural network training', '#d97706'),
    'text': ('Текст и токены', 'Text and tokens', '#0891b2'),
    'attention': ('Механизм внимания', 'Attention', '#db2777'),
    'generation': ('Генерация текста', 'Text generation', '#059669'),
    'meaning': ('Смысл и познание', 'Meaning and knowledge', '#64748b'),
    'ecg': ('ЭКГ и физиология', 'ECG and physiology', '#dc2626'),
    'electronics': ('Электроника', 'Electronics', '#0284c7'),
    'signals': ('Измерения и сигналы', 'Measurements and signals', '#0d9488'),
    'software': ('Программирование и данные', 'Programming and data', '#4f46e5'),
}

# Classify the concept itself, avoiding incidental words in long definitions.
RULES = {
    'math': r'матриц|вектор|скалярн|экспонент|взвешенн|покоординат|процентн|аргумент функции|тангенс|размерност|синус|косинус|радиан|корень|конкатенац|средн|дисперси|стандартное отклонение|matrix|vector|scalar|exponen|weighted sum|sine|cosine|radian|square root|variance|standard deviation',
    'network-types': r'рекуррентн|^нейронная сеть$|^трансформер|сеть прямого распространения|neural network|^transformer|recurrent|feed.forward network',
    'network-layers': r'состояни|параметр|функция активации|логит|softmax|слой|кодер|декодер|остаточн|нормализац|масштаб и сдвиг|^relu$|layer|parameter|activation|state|^encoder|^decoder|residual|normalization|^ffn$',
    'training': r'прямой проход|forward pass|обучени|обучающ|потер|градиент|распространение ошибки|распространение во времени|teacher forcing|целевой токен|выходное смещение|training|learning|loss|gradient|backpropagation|target token',
    'text': r'текст|токен|эмбеддинг|словар|позиционн|^контекст$|token|embedding|vocabulary|positional|^context$',
    'attention': r'внимани|самовнимани|вектор контекста|attention|^query$|^key$|^value$',
    'generation': r'генераци|жадный выбор|авторегресси|generation|greedy|autoregress',
    'meaning': r'отражение действительности|содержание высказывания|reflection of reality|meaning of (an? )?(utterance|statement)',
    'ecg': r'экг|электрокарди|серд|^ион$|волна возбуждения|^ecg|electrocardio|heart|^ion$|excitation wave',
    'electronics': r'электрод|микроконтроллер|преобразователь|^spi|плата|память|развязк|сопротивлен|стабилизатор|напряжен|^регистр$|тренировочный стенд|microcontroller|electrode|converter|circuit|board|memory|isolation|impedance|voltage regulator|^register$',
    'signals': r'потенциал|период|частота|измерени|артефакт|фильтр|интервал|погрешност|potential|period|sampling|measurement|artifact|filter|interval|accuracy',
    'software': r'прошивк|буфер|^api|firmware|buffer|application programming interface',
}


def categorize_dictionary(words, catalog=None, locale='ru'):
    """Preserve explicit assignments (including empty lists) and custom categories."""
    catalog = list(catalog or [])
    known = {tag['id'] for tag in catalog}
    result = []
    for word in words or []:
        if 'tags' in word:
            result.append(word)
            continue
        name = word.get('word', '').casefold()
        tags = [key for key, pattern in RULES.items() if re.search(pattern, name)]
        result.append({**word, 'tags': tags})
        for key in tags:
            if key not in known:
                ru, en, color = CATEGORIES[key]
                catalog.append({'id': key, 'name': en if locale == 'en' else ru, 'color': color})
                known.add(key)
    return result, catalog
