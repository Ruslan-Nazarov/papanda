import sqlite3
import random
from datetime import datetime, timedelta, date, timezone
import os

db_path = r"C:\Users\zhkhv\Desktop\papanda\data\db\papanda.db"

def populate():
    if not os.path.exists(db_path):
        print(f"File not found: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Populating note_category...")
    categories = [('Учеба',), ('Проекты',), ('Личное',), ('Идеи',)]
    cursor.executemany("INSERT OR IGNORE INTO note_category (name) VALUES (?)", categories)

    print("Populating notes...")
    now_str = datetime.now(timezone.utc).isoformat()
    notes_data = [
        ('Учеба', 'Лекция 10: Трансформеры и механизмы внимания. Основные концепции: Self-Attention, Multi-head Attention. Transformer-архитектура произвела революцию в NLP.', now_str),
        ('Учеба', 'План диплома:\n1. Введение\n2. Обзор существующих решений\n3. Описание разработанной системы\n4. Тестирование и результаты.', now_str),
        ('Идеи', 'Идеи для Papanda:\n- Добавить интеграцию с Google Calendar\n- Сделать мобильное приложение\n- Добавить виджет с прогнозом погоды.', now_str),
        ('Личное', 'Список покупок: молоко, яйца, овсянка, кофе, куриное филе, протеин.', now_str)
    ]
    cursor.executemany("INSERT INTO notes (category, note, created_at) VALUES (?, ?, ?)", notes_data)

    print("Populating events...")
    today = datetime.now()
    # title, date, important, done, recurrence_id, recurrence_rule, recurrence_end, position
    events_data = [
        ('Лекция по ИИ', (today + timedelta(days=1)).replace(hour=10, minute=0).isoformat(), 1, 0, None, 'weekly_mon_wed', None, 0),
        ('Семинар по Лингвистике', (today + timedelta(days=3)).replace(hour=14, minute=30).isoformat(), 0, 0, None, None, None, 1),
        ('Защита преддипломной практики', (today + timedelta(days=7)).replace(hour=12, minute=0).isoformat(), 1, 0, None, None, None, 2),
        ('Тренировка (Ноги)', (today + timedelta(days=2)).replace(hour=18, minute=0).isoformat(), 0, 0, None, 'weekly_wed_sat', None, 3),
        ('Встреча с научруком', (today - timedelta(days=1)).replace(hour=11, minute=0).isoformat(), 1, 1, None, None, None, 4)
    ]
    cursor.executemany("INSERT INTO event (title, date, important, done, recurrence_id, recurrence_rule, recurrence_end, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", events_data)

    print("Populating tasks...")
    tasks_data = [
        ('Собрать данные для 3-й главы диплома', 0, (today - timedelta(days=2)).isoformat(), 0),
        ('Отправить черновик руководителю', 1, (today - timedelta(days=1)).isoformat(), 1),
        ('Купить кофе и овсянку', 1, (today - timedelta(days=3)).isoformat(), 2),
        ('Исправить баг в модуле авторизации', 0, today.isoformat(), 3),
        ('Подготовить презентацию для семинара', 0, today.isoformat(), 4)
    ]
    cursor.executemany("INSERT INTO task (name, done, created_at, position) VALUES (?, ?, ?, ?)", tasks_data)

    print("Populating habits...")
    habits_data = [
        ('Кодинг (минимум 1 коммит)', today.date(), 0),
        ('Чтение (минимум 20 стр)', today.date(), 0),
        ('Водный баланс (2л)', (today.date() - timedelta(days=1)), 0),
        ('Зарядка по утрам', (today.date() - timedelta(days=2)), 0)
    ]
    cursor.executemany("INSERT INTO habits (title, start_date, read) VALUES (?, ?, ?)", habits_data)

    print("Populating chronology...")
    chrono_data = [
        ('Закончил вступление к диплому. Теперь структура ясна.', (today - timedelta(hours=5)).isoformat()),
        ('Прошел промежуточный тест по английскому. Результат: 95/100.', (today - timedelta(days=1, hours=2)).isoformat()),
        ('Сходил в спортзал, пожал свой максимум.', (today - timedelta(days=2, hours=4)).isoformat()),
        ('Разобрался с архитектурой Transformer. Очень изящно.', (today - timedelta(days=3, hours=1)).isoformat())
    ]
    cursor.executemany("INSERT INTO chronology (title, date) VALUES (?, ?)", chrono_data)

    print("Populating sticky_notes...")
    stickies_data = [
        ('ВАЖНО!', 'Не забудь про экзамен в понедельник! Повторить регуляризацию.', '#ffcdd2', 'text', 0, now_str),
        ('Идея', 'Добавить стикеры в Papanda — DONE!', '#c8e6c9', 'text', 1, now_str),
        ('Девиз дня', 'The only way to do great work is to love what you do.', '#bbdefb', 'text', 2, now_str)
    ]
    cursor.executemany("INSERT INTO sticky_notes (title, text, color, type, position, created_at) VALUES (?, ?, ?, ?, ?, ?)", stickies_data)

    print("Simulating dictionary stats...")
    # 1. Randomly mark words as learned
    cursor.execute("SELECT word FROM word_stats ORDER BY RANDOM() LIMIT 124")
    learned_words = cursor.fetchall()
    for (word,) in learned_words:
        cursor.execute("UPDATE word_stats SET is_learned = 1, count = count + ? WHERE word = ?", (random.randint(5, 15), word))

    # 2. word_shows_daily (last 30 days)
    daily_shows = []
    base_date = date.today()
    for i in range(30):
        d = base_date - timedelta(days=i)
        count = random.randint(8, 28)
        daily_shows.append((d, count))
    
    cursor.executemany("INSERT OR REPLACE INTO word_shows_daily (date, shows_count) VALUES (?, ?)", daily_shows)

    # 3. Winks
    wink_data = []
    for i in range(10):
        d = today - timedelta(days=random.randint(0, 7), hours=random.randint(0, 12))
        wink_data.append(('Разминка для глаз', d.isoformat()))
    cursor.executemany("INSERT INTO wink (title, date) VALUES (?, ?)", wink_data)

    print("Populating observations...")
    obs_data = [
        ('Нагрузка на этой неделе высокая, но продуктивность радует.', 2, 1, 'periodic', now_str, 0),
        ('Нужно больше времени уделять сну (хотя бы 7 часов).', 1, 0, 'periodic', now_str, 0),
        ('Прогресс по диплому: ~20% выполнено.', 2, 0, 'periodic', now_str, 0)
    ]
    cursor.executemany("INSERT INTO observations (text, priority, is_main, status, created_at, no_time) VALUES (?, ?, ?, ?, ?, ?)", obs_data)

    conn.commit()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    populate()
