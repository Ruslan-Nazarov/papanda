from flask import Blueprint, render_template, request, redirect, url_for
from app.models import db, Event, Book, Task, ReadBook, Chronology, Notes, Wink, WordStats, Dashboard, AppSettings
from datetime import datetime, timedelta, date
from sqlalchemy import func
import json
import os
import sys
import random
import openpyxl 
from werkzeug.utils import secure_filename
from config import Config
import shutil
import sqlite3
from app.utils.migration import run_migration

# --- 1. РЕЕСТР МОДЕЛЕЙ ---
MODEL_MAP = {
    'Event': Event, 'Book': Book, 'Task': Task, 'ReadBook': ReadBook,
    'Chronology': Chronology, 'Notes': Notes, 'Wink': Wink
}

def get_model(name):
    return MODEL_MAP.get(name)

# --- 2. ПУТИ (УНИВЕРСАЛЬНАЯ ЛОГИКА ДЛЯ СКРИПТА И .EXE) ---
if getattr(sys, 'frozen', False):
    if hasattr(sys, '_MEIPASS'):
        APP_ROOT = sys._MEIPASS
    else:
        APP_ROOT = os.path.dirname(sys.executable)
else:
    APP_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# --- [НОВОЕ] Пути к JSON и Excel ---
JSON_DIR = os.path.join(APP_ROOT, "app", "json")
EXCEL_PATH = os.path.join(APP_ROOT, "app", "excel", "translate.xlsx")

main = Blueprint('main', __name__)

# --- 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

def load_json_file(filename):
    path = os.path.join(JSON_DIR, filename)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f: return json.load(f)
        except: pass
    return {}

def save_json(data, filename):
    path = os.path.join(JSON_DIR, filename)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except: pass

def parse_date_input(d_str):
    if not d_str: return datetime.now().date()
    try:
        clean_str = str(d_str).split()[0]
        return datetime.strptime(clean_str, '%Y-%m-%d').date()
    except:
        return datetime.now().date()

def normalize_date(db_value):
    if not db_value:
        return None
    if isinstance(db_value, datetime):
        return db_value.date()
    if isinstance(db_value, date):
        return db_value
    if isinstance(db_value, str):
        try:
            clean_str = db_value.split(' ')[0] 
            return datetime.strptime(clean_str, '%Y-%m-%d').date()
        except:
            return None
    return None

def calculate_days(start_date):
    if not start_date: return 0
    d = normalize_date(start_date)
    if d:
        return (datetime.now().date() - d).days
    return 0

# --- 4. ГЛАВНАЯ СТРАНИЦА ---

@main.route('/')
@main.route('/index')
def index():
    today_dt = datetime.now()
    today_obj = today_dt.date()
    tomorrow_obj = today_obj + timedelta(days=1)
    seven_days_future = today_obj + timedelta(days=7)

    all_events = Event.query.all()
    
    events_today = []
    events_tomorrow = []
    events_important = []

    for ev in all_events:
        db_date_value = ev.date
        
        if isinstance(db_date_value, (datetime, date)):
            ev_date = db_date_value.date() if isinstance(db_date_value, datetime) else db_date_value
        
        elif isinstance(db_date_value, str):
            try:
                ev_date = datetime.strptime(db_date_value, "%Y-%m-%d").date()
            except Exception:
                continue 
        else:
            continue

        if ev_date == today_obj:
            events_today.append(ev)
        elif ev_date == tomorrow_obj:
            events_tomorrow.append(ev)

        if ev.important and ev_date > today_obj and ev_date <= seven_days_future:
            events_important.append(ev)

        if ev.important and ev_date >= today_obj and ev_date <= seven_days_future:
            events_important.append(ev)

    events_important.sort(key=lambda x: normalize_date(x.date) or date.max)
    
    if events_important:
        date_important = [random.choice(events_important)]
    else:
        date_important = []

  #Словарь
    count_words_trahslate = 0
    words = []
    
    if os.path.exists(EXCEL_PATH):
        try:
            wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
            sheet = wb.active
            raw_rows = list(sheet.iter_rows(values_only=True))
            wb.close()

            if raw_rows: round(len(raw_rows) / 2)

            grouped_words = {}
            
            for row in raw_rows:
                if not row or len(row) < 3: continue                
                lang_val  = str(row[1]).lower() if row[1] else ""
                eng_key   = str(row[2]).strip() if row[2] else ""
                trans_val = str(row[3]).strip() if len(row) > 3 and row[3] else ""
                
                if not eng_key: continue

                if eng_key not in grouped_words:
                    grouped_words[eng_key] = {'eng': eng_key, 'de': '', 'it': ''}

                if 'немецкий' in lang_val:
                    grouped_words[eng_key]['de'] = trans_val
                elif 'итальянский' in lang_val:
                    grouped_words[eng_key]['it'] = trans_val

            all_generated_words = list(grouped_words.values())
            count_words_trahslate = len(all_generated_words) 
            if len(all_generated_words) > 3:
                words = random.sample(all_generated_words, 3)
            else:
                words = all_generated_words

        except Exception as e:
            print(f"Excel Error: {e}")
            pass
        count_words_trahslate = len(all_generated_words)

    # Загрузка JSON слов (остается без изменений)
    try:
        w_data = load_json_file('learning_words.json')
        if w_data: words = w_data.get('words', [])
    except: pass

    # Загрузка JSON слов (независимо от Excel)
    try:
        w_data = load_json_file('learning_words.json')
        if w_data: words = w_data.get('words', [])
    except: pass

    # Статистика
    avg = db.session.query(func.avg(ReadBook.countdays)).scalar()
    average_days = round(avg, 2) if avg else 0
    
    books_all = Book.query.all()
    tasks = Task.query.filter_by(done=False).all()
  
    # Загружаем все необходимые записи одним запросом
    dashboard_items = Dashboard.query.all()
    
    # Создаем словарь для удобного доступа по ключу (key: Dashboard_object)
    dashboard_map = {item.key: item for item in dashboard_items}

    one_thing = "..."
    one_thing_date = 0
    one_thing_replacement = "..."
    title_until, days_remaining = "...", 0
    title_after, days_passed = "...", 0

    # Обработка ONE THING
    if 'one_thing' in dashboard_map:
        item = dashboard_map['one_thing']
        one_thing = item.title
        d_obj = normalize_date(item.date)
        if d_obj: one_thing_date = (today_obj - d_obj).days

    # Обработка REPLACEMENT
    if 'replacement' in dashboard_map:
        item = dashboard_map['replacement']
        one_thing_replacement = item.title

    # Обработка COUNT UNTIL
    if 'count_until' in dashboard_map:
        item = dashboard_map['count_until']
        title_until = item.title
        dt_u = normalize_date(item.date)
        if dt_u: days_remaining = (dt_u - today_obj).days

    # Обработка COUNT AFTER
    if 'count_after' in dashboard_map:
        item = dashboard_map['count_after']
        title_after = item.title
        dt_a = normalize_date(item.date)
        if dt_a: days_passed = (today_obj - dt_a).days
        
    all_winks = Wink.query.all()
    wink = None
    if all_winks:
        chosen_wink = random.choice(all_winks)
        wink = chosen_wink.title
    # --- ПРАВИЛА (из JSON, не из БД) ---
    random_rule = {
        "language": "Info", 
        "rule_ru": "Нет правил / No rules", 
        "rule_en": "No rules available"
    }
    
    try:
        # Путь к файлу
        rules_path = os.path.join(APP_ROOT, 'app', 'json', 'language_rules.json')
        
        if os.path.exists(rules_path):
            with open(rules_path, 'r', encoding='utf-8') as f:
                rules_data = json.load(f)
            
            # rules_data = {"german": [...], "italian": [...]}
            if rules_data:
                # 1. Выбираем случайный язык (ключ)
                langs = list(rules_data.keys())
                chosen_lang = random.choice(langs)
                
                # 2. Выбираем случайное правило из списка этого языка
                rules_list = rules_data[chosen_lang]
                if rules_list:
                    item = random.choice(rules_list)
                    
                    # 3. Формируем объект
                    if isinstance(item, dict):
                        rule_ru = item.get('ru', '---')
                        rule_en = item.get('en', '---')
                    else:
                        # Поддержка старого формата (если вдруг)
                        rule_ru = str(item)
                        rule_en = "Translation not available"

                    random_rule = {
                        "language": chosen_lang,
                        "rule_ru": rule_ru,
                        "rule_en": rule_en
                    }
    except Exception as e:
        print(f"Error loading language rules: {e}")

    # 1. Считаем общее количество изученных слов (мощность множества WordStats)
    # Используем db.session.query для скорости
    learned_count = db.session.query(func.count(WordStats.word)).scalar() or 0
    
    # 2. Считаем сумму всех показов (накопленный опыт)
    total_shows = db.session.query(func.sum(WordStats.count)).scalar() or 0
    
    # 3. Расчет Coverage (Покрытие)
    # Если словарь пуст или не загрузился, избегаем деления на ноль
    if count_words_trahslate > 0:
        coverage_learning_words = round((learned_count / count_words_trahslate) * 100, 2)
    else:
        coverage_learning_words = 0

    # 4. Расчет iMW (Индекс Master Work)
    # Цель: каждое слово должно быть показано 80 раз (Target Shows)
    target_shows = count_words_trahslate * 80
    
    if target_shows > 0:
        iMW = round((total_shows / target_shows) * 100, 2)
    else:
        iMW = 0

    categories_data = load_json_file('note_categories.json')
    categories = categories_data.get('categories', [])

    return render_template('index.html',
                           today_for_calendar=today_obj,
                           events_today=events_today,
                           events_tomorrow=events_tomorrow,
                           date_important=date_important,
                           tasks=tasks, books_all=books_all, 
                           book_read_count=calculate_days,
                           words=words, random_rule=random_rule,
                           one_thing=one_thing, one_thing_date=one_thing_date, one_thing_replacement=one_thing_replacement,
                           average_days=average_days, count_words_trahslate=count_words_trahslate,
                           coverage_learning_words=coverage_learning_words, iMW=iMW,
                           title_until=title_until, days_remaining=days_remaining,
                           title_after=title_after, days_passed=days_passed,
                           wink=wink, categories=categories)

@main.route('/submit_form', methods=['POST'])
def submit_form():
    text = request.form.get('common_text')
    d_str = request.form.get('common_date')
    cat = request.form.get('common_category')
    
    if not text: return redirect(url_for('main.index'))
    dt = parse_date_input(d_str)

    if cat == 'event':
        db.session.add(Event(title=text, date=dt, important=False))
        db.session.commit()
        
    elif cat == 'important':
        db.session.add(Event(title=text, date=dt, important=True))
        db.session.commit()
        
    elif cat == 'book':
        db.session.add(Book(title=text, start_date=dt, read=False))
        db.session.commit()
        
    elif cat == 'task':
        db.session.add(Task(name=text, done=False))
        db.session.commit()
        
    elif cat == 'wink':
        db.session.add(Wink(title=text, date=dt))
        db.session.commit()
    
    elif cat in ['count until', 'count after', 'one_thing', 'replacement']:
        
        # Определяем ключ для БД (count_until, count_after, one_thing, replacement)
        if cat == 'count until':
            db_key = 'count_until'
        elif cat == 'count after':
            db_key = 'count_after'
        else:
            db_key = cat # one_thing или replacement
        
        # 1. Удаляем старую запись по уникальному ключу
        old_item = Dashboard.query.filter_by(key=db_key).first()
        if old_item:
            db.session.delete(old_item)
            
        # 2. Создаем и добавляем новую запись
        db.session.add(Dashboard(
            key=db_key, 
            title=text, 
            date=dt
        ))
        db.session.commit()
    
    return redirect(url_for('main.index'))

@main.route('/submit_chrono', methods=['POST'])
def submit_chrono():
    txt = request.form.get('chrono_text')
    dt = parse_date_input(request.form.get('chrono_date'))
    cat = request.form.get('chrono_category')
    if txt:
        db.session.add(Chronology(title=txt, date=dt, category=cat))
        db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/add_note', methods=['POST'])
def add_note():
    cat = request.form.get('category')
    note = request.form.get('note')
    if note:
        full = f"{note} (added: {datetime.now().date()})"
        db.session.add(Notes(category=cat, note=full))
        db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/mark_as_read/<int:book_id>', methods=['POST'])
def mark_as_read(book_id):
    book = Book.query.get(book_id)
    if book:
        days = calculate_days(book.start_date)
        db.session.add(ReadBook(countdays=days))
        book.read = True
        db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/mark_done/<int:task_id>', methods=['POST'])
def mark_done(task_id):
    t = Task.query.get(task_id)
    if t:
        t.done = True
        db.session.commit()
    return redirect(url_for('main.index'))

@main.route('/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'POST':
        data = load_json_file('settings.json')
        if 'max_duration' in request.form:
            data['max_duration'] = int(request.form.get('max_duration'))
        if 'max_random_minutes' in request.form:
            data['max_random_minutes'] = int(request.form.get('max_random_minutes'))
        save_json(data, 'settings.json')
        return redirect(url_for('main.settings'))

    s_data = load_json_file('settings.json')
    max_dur = s_data.get('max_duration', 360)
    max_rand = s_data.get('max_random_minutes', 1000)

    today = datetime.now().date()
    end_date = today + timedelta(days=90)
    
    all_events = Event.query.all()
    events_next_three_months = []
    
    for e in all_events:
        d = normalize_date(e.date)
        if d and today <= d <= end_date:
            events_next_three_months.append(e)
            
    events_next_three_months.sort(key=lambda x: normalize_date(x.date) or date.max)

    last_chrono = Chronology.query.order_by(Chronology.id.desc()).first()
    
    all_winks = Wink.query.all()
    wink_last = [w for w in all_winks if normalize_date(w.date) > today]

    max_id = db.session.query(func.max(Notes.id)).scalar()
    notes_last = Notes.query.filter_by(id=max_id).first()

    return render_template('settings.html', 
                           events_next_three_months=events_next_three_months, 
                           max_duration=max_dur,
                           max_random_minutes=max_rand, 
                           last_chrono=last_chrono, 
                           wink_last=wink_last, 
                           notes_last=notes_last)

@main.route('/delete_event_settings/<int:event_id>', methods=['POST'])
def delete_event_settings(event_id):
    e = Event.query.get(event_id)
    if e: db.session.delete(e); db.session.commit()
    return redirect(url_for('main.settings'))

@main.route('/db_view/<string:model_name>')
def db_view(model_name):
    Model = get_model(model_name)
    if not Model: return redirect(url_for('main.index'))
    try: records = Model.query.order_by(Model.id.desc()).all()
    except: records = Model.query.all()
    columns = [c.name for c in Model.__table__.columns]
    return render_template('db_view.html', records=records, columns=columns, model_name=model_name)

@main.route('/edit_record/<string:model_name>/<int:record_id>', methods=['GET', 'POST'])

@main.route('/edit_record/<string:model_name>/<int:record_id>', methods=['GET', 'POST'])
def edit_record(model_name, record_id):
    Model = get_model(model_name)
    if not Model:
        return redirect(url_for('main.index'))

    record = Model.query.get_or_404(record_id)
    columns = [c.name for c in Model.__table__.columns]

    if request.method == 'POST':
        for col in columns:
            if col in ['id', 'created_at']:
                continue

            if col not in request.form:
                continue

            val = request.form[col]

            if val and ('date' in col.lower() or 'time' in col.lower()):
                val = parse_date_input(val)

            col_type = getattr(Model, col).type.python_type
            if col_type == bool:
                val = str(val).lower() in ['true', '1', 'on']

            setattr(record, col, val)

        db.session.commit()
        return redirect(url_for('main.db_view', model_name=model_name))

    return render_template('db_edit.html', record=record, columns=columns, model_name=model_name)

@main.route('/delete_record/<string:model_name>/<int:record_id>', methods=['POST'])
def delete_record(model_name, record_id):
    Model = get_model(model_name)
    if Model:
        rec = Model.query.get(record_id)
        if rec: db.session.delete(rec); db.session.commit()
    return redirect(url_for('main.db_view', model_name=model_name))



@main.route('/import_folder', methods=['POST'])
def import_folder():
    # Получаем файлы из формы
    files = request.files.getlist('files')
    
    # Запускаем миграцию, передавая APP_ROOT (который определен в начале routes.py)
    run_migration(files, APP_ROOT)
    
    return redirect(url_for('main.settings'))



@main.route('/factory_reset', methods=['POST'])
def factory_reset():
    """Удаляет все таблицы и создает их заново (Сброс до заводских настроек)"""
    db.drop_all()
    db.create_all()
    return redirect(url_for('main.settings'))

@main.route('/settings/categories', methods=['GET'])
def show_categories():
    """Показывает список категорий для редактирования."""
    categories_data = load_json_file('note_categories.json')
    categories = categories_data.get('categories', [])
    return render_template('edit_categories.html', categories=categories)

@main.route('/settings/categories/edit', methods=['POST'])
def edit_categories():
    new_categories_text = request.form.get('categories_list')
    new_categories = [
        c.strip() 
        for c in new_categories_text.split('\n') 
        if c.strip()
    ]
    
    data_to_save = {"categories": new_categories}
    save_json(data_to_save, 'note_categories.json')
    return redirect(url_for('main.settings'))