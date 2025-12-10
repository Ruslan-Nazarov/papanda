import os
import json
import random
from datetime import datetime, timedelta, date

from flask import Blueprint, render_template, request, redirect, url_for, current_app
from sqlalchemy import func

# Импорт моделей
from app.models import db, Event, Habits, Task, HabitsDone, Chronology, Notes, Wink, WordStats, Dashboard
# Импорт утилит
from app.utils.migration import run_migration
from app.utils.state_manager import get_runtime_context

main = Blueprint('main', __name__)

# --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

def get_external_path(filename):
    """Путь к папке данных (снаружи, для записи пользовательских данных)"""
    return os.path.join(str(current_app.config['JSON_DIR']), filename)

def get_internal_path(filename):
    """Путь к ресурсам приложения (внутри exe/app/json, для чтения заводских файлов)"""
    return os.path.join(str(current_app.config['APP_DIR']), 'json', filename)

def load_json_file(filename):
    """
    Умная загрузка:
    1. Сначала ищем во внешней папке (если пользователь уже сохранял свои настройки).
    2. Если нет — берем заводской файл из папки приложения (внутри EXE).
    """
    # 1. Проверяем внешнюю папку (User Override)
    ext_path = get_external_path(filename)
    if os.path.exists(ext_path):
        try:
            with open(ext_path, "r", encoding="utf-8") as f: 
                return json.load(f)
        except Exception as e:
            print(f"Error loading external {filename}: {e}")

    # 2. Если не нашли снаружи — ищем внутри (Factory Default)
    int_path = get_internal_path(filename)
    if os.path.exists(int_path):
        try:
            with open(int_path, "r", encoding="utf-8") as f: 
                return json.load(f)
        except Exception as e:
            print(f"Error loading internal {filename}: {e}")
            
    # 3. Если нигде нет - возвращаем пустоту
    return {}

def save_json(data, filename):
    """Сохраняем ВСЕГДА во внешнюю папку, чтобы настройки не стирались при обновлении EXE"""
    path = get_external_path(filename)
    try:
        # Убедимся, что папка существует (важно для первого запуска)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"Error saving {filename}: {e}")

def parse_date_input(d_str):
    if not d_str: return datetime.now().date()
    try:
        clean_str = str(d_str).split()[0]
        return datetime.strptime(clean_str, '%Y-%m-%d').date()
    except:
        return datetime.now().date()

def normalize_date(db_value):
    if not db_value: return None
    if isinstance(db_value, datetime): return db_value.date()
    if isinstance(db_value, date): return db_value
    if isinstance(db_value, str):
        try:
            clean_str = db_value.split(' ')[0] 
            return datetime.strptime(clean_str, '%Y-%m-%d').date()
        except: return None
    return None

def calculate_days(start_date):
    if not start_date: return 0
    d = normalize_date(start_date)
    if d:
        return (datetime.now().date() - d).days
    return 0

# --- РЕЕСТР МОДЕЛЕЙ ---
MODEL_MAP = {
    'Event': Event, 'Habits': Habits, 'Task': Task, 'HabitsDone': HabitsDone,
    'Chronology': Chronology, 'Notes': Notes, 'Wink': Wink
}

def get_model(name):
    return MODEL_MAP.get(name)


# --- РОУТЫ ---

@main.route('/')
@main.route('/index')
def index():
    today_dt = datetime.now()
    today_obj = today_dt.date()
    tomorrow_obj = today_obj + timedelta(days=1)
    seven_days_future = today_obj + timedelta(days=7)

    # ПОЛУЧЕНИЕ КОНТЕКСТА (State Manager)
    # Передаем корень данных (где лежит папка json и instance)
   # Берем точные пути из конфига, который знает, где лежат файлы в EXE
    json_dir = str(current_app.config['JSON_DIR'])
    excel_path = str(current_app.config['EXCEL_FILE'])
    
    # Передаем оба пути, как теперь требует state_manager
    ctx = get_runtime_context(json_dir, excel_path)
    
    words = ctx['words']
    wink = ctx['wink']
    count_words_trahslate = ctx['count']

    # --- События ---
    all_events = Event.query.all()
    events_today = []
    events_tomorrow = []
    events_important = []

    for ev in all_events:
        ev_date = normalize_date(ev.date)
        if not ev_date: continue

        if ev_date == today_obj:
            events_today.append(ev)
        elif ev_date == tomorrow_obj:
            events_tomorrow.append(ev)

        if ev.important and ev_date >= today_obj and ev_date <= seven_days_future:
            events_important.append(ev)

    events_important.sort(key=lambda x: normalize_date(x.date) or date.max)
    date_important = [random.choice(events_important)] if events_important else []

    # --- Статистика ---
    avg = db.session.query(func.avg(HabitsDone.countdays)).scalar()
    average_days = round(avg, 2) if avg else 0
    
    habits_all = Habits.query.all()
    tasks = Task.query.filter_by(done=False).all()
  
    # --- Dashboard ---
    dashboard_items = Dashboard.query.all()
    dashboard_map = {item.key: item for item in dashboard_items}

    one_thing = "..."
    one_thing_date = 0
    one_thing_replacement = "..."
    title_until, days_remaining = "...", 0
    title_after, days_passed = "...", 0

    if 'one_thing' in dashboard_map:
        item = dashboard_map['one_thing']
        one_thing = item.title
        d_obj = normalize_date(item.date)
        if d_obj: one_thing_date = (today_obj - d_obj).days

    if 'replacement' in dashboard_map:
        one_thing_replacement = dashboard_map['replacement'].title

    if 'count_until' in dashboard_map:
        item = dashboard_map['count_until']
        title_until = item.title
        dt_u = normalize_date(item.date)
        if dt_u: days_remaining = (dt_u - today_obj).days

    if 'count_after' in dashboard_map:
        item = dashboard_map['count_after']
        title_after = item.title
        dt_a = normalize_date(item.date)
        if dt_a: days_passed = (today_obj - dt_a).days
        
    # --- Правила ---
    # ВАЖНО: language_rules.json читаем через наш хелпер, который знает путь
    random_rule = {"language": "Info", "rule_ru": "Нет правил", "rule_en": "No rules available"}
    
    try:
        rules_data = load_json_file('language_rules.json')
        if rules_data:
            langs = list(rules_data.keys())
            if langs:
                chosen_lang = random.choice(langs)
                rules_list = rules_data[chosen_lang]
                if rules_list:
                    item = random.choice(rules_list)
                    if isinstance(item, dict):
                        random_rule = {
                            "language": chosen_lang,
                            "rule_ru": item.get('ru', '---'),
                            "rule_en": item.get('en', '---')
                        }
                    else:
                        random_rule = {
                            "language": chosen_lang,
                            "rule_ru": str(item),
                            "rule_en": "Translation not available"
                        }
    except Exception as e:
        print(f"Error rules: {e}")

    # --- Метрики ---
    learned_count = db.session.query(func.count(WordStats.word)).scalar() or 0
    total_shows = db.session.query(func.sum(WordStats.count)).scalar() or 0
    
    if count_words_trahslate > 0:
        coverage_learning_words = round((learned_count / count_words_trahslate) * 100, 2)
    else:
        coverage_learning_words = 0

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
                           tasks=tasks, 
                           habits_all=habits_all, 
                           habits_count=calculate_days, # Функция для шаблона
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
    elif cat == 'important':
        db.session.add(Event(title=text, date=dt, important=True))
    elif cat == 'habits':
        db.session.add(Habits(title=text, start_date=dt, read=False))
    elif cat == 'task':
        db.session.add(Task(name=text, done=False))
    elif cat == 'wink':
        db.session.add(Wink(title=text, date=dt))
    
    elif cat in ['count until', 'count after', 'one_thing', 'replacement']:
        if cat == 'count until': db_key = 'count_until'
        elif cat == 'count after': db_key = 'count_after'
        else: db_key = cat 
        
        old_item = Dashboard.query.filter_by(key=db_key).first()
        if old_item: db.session.delete(old_item)
            
        db.session.add(Dashboard(key=db_key, title=text, date=dt))
    
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

# --- ИСПРАВЛЕННЫЙ РОУТ ДЛЯ ГАЛОЧКИ ---
@main.route('/mark_as_read/<int:habits_id>', methods=['POST'])
def mark_as_read(habits_id):
    habits = Habits.query.get(habits_id)
    if habits:
        days = calculate_days(habits.start_date)
        # Сохраняем статистику
        db.session.add(HabitsDone(countdays=days))
        # Помечаем как выполнено
        habits.read = True
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
def edit_record(model_name, record_id):
    Model = get_model(model_name)
    if not Model: return redirect(url_for('main.index'))

    record = Model.query.get_or_404(record_id)
    columns = [c.name for c in Model.__table__.columns]

    if request.method == 'POST':
        for col in columns:
            if col in ['id', 'created_at']: continue
            if col not in request.form: continue

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
    files = request.files.getlist('files')
    # Берем путь для миграции из конфига (это путь к папке с данными)
    data_root = str(current_app.config['EXTERNAL_DIR'])
    run_migration(files, data_root)
    return redirect(url_for('main.settings'))

@main.route('/factory_reset', methods=['POST'])
def factory_reset():
    db.drop_all()
    db.create_all()
    return redirect(url_for('main.settings'))

@main.route('/settings/categories', methods=['GET'])
def show_categories():
    categories_data = load_json_file('note_categories.json')
    categories = categories_data.get('categories', [])
    return render_template('edit_categories.html', categories=categories)

@main.route('/settings/categories/edit', methods=['POST'])
def edit_categories():
    new_categories_text = request.form.get('categories_list')
    new_categories = [c.strip() for c in new_categories_text.split('\n') if c.strip()]
    data_to_save = {"categories": new_categories}
    save_json(data_to_save, 'note_categories.json')
    return redirect(url_for('main.settings'))