import os
import json
import sqlite3
from datetime import datetime
from werkzeug.utils import secure_filename
# Импортируем все модели и объект db
from app.models import db, Event, Habits, Task, HabitsDone, Chronology, Notes, Wink, WordStats, Dashboard, AppSettings

def parse_date_str(d_str):
    """Преобразует строку даты из JSON/SQLite в объект python date."""
    try: 
        return datetime.strptime(str(d_str).split()[0], '%Y-%m-%d').date()
    except: 
        return datetime.now().date()

def process_json_learning(path):
    """Обработка статистики слов (count_learning_words.json)."""
    try:
        with open(path, 'r', encoding='utf-8') as f: 
            data = json.load(f)
        
        if isinstance(data, dict):
            for w, stats in data.items():
                if isinstance(stats, dict):
                    cnt = stats.get('count', 0)
                    # Если слова нет в базе - создаем
                    if not WordStats.query.get(w):
                        # Попытка достать переводы, если они есть в JSON
                        trans = stats.get('translations', {})
                        eng = trans.get('eng')
                        de = trans.get('de')
                        it = trans.get('it')
                        
                        db.session.add(WordStats(
                            word=w, 
                            count=cnt,
                            eng=eng, 
                            de=de, 
                            it=it
                        ))
                    else:
                        # Если есть - обновляем счетчик
                        ws = WordStats.query.get(w)
                        ws.count = cnt
        return True
    except Exception as e: 
        print(f"Error importing JSON learning: {e}")
        return False

def process_json_widgets(path, fname):
    """Обработка виджетов и настроек (one_thing, settings, wink и др.)."""
    try:
        with open(path, 'r', encoding='utf-8') as f: 
            data = json.load(f)
        
        # 1. WINK (Текущее состояние)
        if 'wink_events' in fname:
            title = data.get('title_random')
            if title:
                Dashboard.query.filter_by(key='wink_state').delete()
                # Сохраняем метаданные (длительность и время) как JSON-строку
                meta = json.dumps({
                    'duration': data.get('duration'), 
                    'time_change': data.get('time_change')
                })
                db.session.add(Dashboard(key='wink_state', title=title, extra_text=meta))
            return True

        # 2. ONE THING
        if 'one_thing' in fname and 'one_thing' in data:
            # Основная цель
            item = data['one_thing'][0] if data['one_thing'] else {}
            # Замена (replacement)
            rep_list = data.get('replacement', [{'title': ''}])
            rep_title = rep_list[0].get('title', '') if rep_list else ''
            
            Dashboard.query.filter_by(key='one_thing').delete()
            db.session.add(Dashboard(
                key='one_thing', 
                title=item.get('title'), 
                date=parse_date_str(item.get('date')), 
                extra_text=rep_title
            ))
            return True
        
        # 3. COUNT UNTIL / AFTER
        if 'count' in fname:
            if 'until' in data and data['until']:
                u = data['until'][0]
                Dashboard.query.filter_by(key='count_until').delete()
                db.session.add(Dashboard(
                    key='count_until', 
                    title=u.get('common_text'), 
                    date=parse_date_str(u.get('common_date'))
                ))
            if 'after' in data and data['after']:
                a = data['after'][0]
                Dashboard.query.filter_by(key='count_after').delete()
                db.session.add(Dashboard(
                    key='count_after', 
                    title=a.get('common_text'), 
                    date=parse_date_str(a.get('common_date'))
                ))
            return True
        
        # 4. SETTINGS
        if 'settings' in fname:
            for k, v in data.items():
                s = AppSettings.query.get(k)
                if not s: 
                    s = AppSettings(key=k)
                    db.session.add(s)
                s.value = str(v)
            return True
        return False
    except Exception as e: 
        print(f"Error importing JSON widgets ({fname}): {e}")
        return False

def process_db(path, fname):
    """Обработка SQLite баз данных."""
    try:
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        
        # Хелпер для безопасного выбора (пробует разные имена таблиц)
        def fetch(tbls, cols):
            for t in tbls:
                try: 
                    cur.execute(f"SELECT {cols} FROM {t}")
                    return cur.fetchall()
                except: continue
            return []

        # -- Events --
        if 'event' in fname:
            for r in fetch(['events', 'event'], 'title, date, important'):
                d = parse_date_str(r[1])
                # Преобразование 1/0 или 'True'/'False' в булево
                imp = True if str(r[2]).lower() in ['1', 'true', 't'] else False
                
                if not Event.query.filter_by(title=r[0], date=d).first():
                    db.session.add(Event(title=r[0], date=d, important=imp))
        
        # -- Habits --
        elif 'habits' in fname and 'done' not in fname:
            for r in fetch(['habits', 'habit'], 'title, start_date, done'):
                d = parse_date_str(r[1])
                rd = True if str(r[2]).lower() in ['1', 'true', 't'] else False
                if not Habits.query.filter_by(title=r[0]).first():
                    db.session.add(Habits(title=r[0], start_date=d, read=rd))

        # -- Tasks --
        elif 'task' in fname:
            for r in fetch(['tasks', 'task'], 'name, done'):
                dn = True if str(r[1]).lower() in ['1', 'true', 't'] else False
                if not Task.query.filter_by(name=r[0]).first():
                    db.session.add(Task(name=r[0], done=dn))

        # -- Chronology --
        elif 'chrono' in fname:
            for r in fetch(['chronology'], 'title, date, category'):
                d = parse_date_str(r[1])
                if not Chronology.query.filter_by(title=r[0], date=d).first():
                    db.session.add(Chronology(title=r[0], date=d, category=r[2]))

        # -- Notes --
        elif 'note' in fname:
            # В старой базе: category, note. В новой есть created_at (будет default)
            for r in fetch(['notes', 'note'], 'category, note'):
                # Простейшая проверка на дубликаты по тексту
                if not Notes.query.filter_by(note=r[1]).first():
                    db.session.add(Notes(category=r[0], note=r[1]))

        # -- Wink --
        elif 'wink' in fname:
            for r in fetch(['wink'], 'title, date'):
                d = parse_date_str(r[1])
                if not Wink.query.filter_by(title=r[0], date=d).first():
                    db.session.add(Wink(title=r[0], date=d))

        # -- Habits Stats --
        elif 'done' in fname:
            for r in fetch(['habits_done', 'habits_stats', 'done_habits'], 'countdays'):
                db.session.add(HabitsDone(countdays=r[0]))

        conn.close()
        return True
    except Exception as e: 
        print(f"Error importing DB ({fname}): {e}")
        return False

def run_migration(files, app_root):
    """
    Главная функция запуска миграции.
    :param files: список объектов файлов из request.files.getlist()
    :param app_root: путь к корню приложения (для временных файлов)
    """
    if not files: return False

    # Создаем временную папку внутри instance
    temp_dir = os.path.join(app_root, 'instance', 'temp_migration')
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    processed_count = 0

    for file in files:
        if not file.filename: continue
        
        safe_name = secure_filename(file.filename)
        file_path = os.path.join(temp_dir, safe_name)
        
        try:
            file.save(file_path)
            fname = file.filename.lower()
            
            print(f"Processing migration for: {fname}")

            if fname.endswith('.json'):
                # learning_words (если это статистика)
                if 'count_learning' in fname: 
                    process_json_learning(file_path)
                # Обычный learning_words.json (кэш) пропускаем или обрабатываем по желанию
                elif 'learning_words' in fname:
                    pass 
                else: 
                    process_json_widgets(file_path, fname)
            
            elif fname.endswith('.db'):
                process_db(file_path, fname)
            
            processed_count += 1

        except Exception as e:
            print(f"Failed to process file {safe_name}: {e}")
        finally:
            # Удаляем файл сразу после обработки
            if os.path.exists(file_path): 
                os.remove(file_path)

    # Удаляем временную папку
    try: 
        os.rmdir(temp_dir)
    except: pass
    
    # Фиксируем транзакцию
    try:
        db.session.commit()
        print("MIGRATION COMMIT SUCCESSFUL")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"MIGRATION COMMIT FAILED: {e}")
        return False