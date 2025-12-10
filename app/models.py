from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# --- 1. EVENTS (События) ---
class Event(db.Model):
    __tablename__ = 'event'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    date = db.Column(db.DateTime, nullable=False, index=True)
    important = db.Column(db.Boolean, default=False)

    def __repr__(self): return f'<Event {self.title}>'

# --- 2. Habits ---
class Habits(db.Model):
    __tablename__ = 'habits'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    start_date = db.Column(db.Date, default=datetime.utcnow)
    read = db.Column(db.Boolean, default=False)

# --- 3. TASKS (Задачи) ---
class Task(db.Model):
    __tablename__ = 'task'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    done = db.Column(db.Boolean, default=False)

# --- 4. HabitsDone (Статистика привычек) ---
class HabitsDone(db.Model):
    __tablename__ = 'habits_done'
    id = db.Column(db.Integer, primary_key=True)
    countdays = db.Column(db.Integer, nullable=False)

# --- 5. CHRONOLOGY (Хронология) ---
class Chronology(db.Model):
    __tablename__ = 'chronology'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    category = db.Column(db.String(50), nullable=False)

# --- 6. NOTES (Заметки) ---
class Notes(db.Model):
    __tablename__ = 'notes'
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    note = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- 7. WINK (Архив досуга) ---
class Wink(db.Model):
    __tablename__ = 'wink'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    date = db.Column(db.DateTime, nullable=False)

# --- 8. СТАТИСТИКА СЛОВ (из count_learning_words.json) ---
class WordStats(db.Model):
    __tablename__ = 'word_stats'
    word = db.Column(db.String(100), primary_key=True)
    count = db.Column(db.Integer, default=0)
    last_shown = db.Column(db.DateTime, default=datetime.utcnow)
    eng = db.Column(db.String(100))
    de = db.Column(db.String(100))
    it = db.Column(db.String(100))

# --- 9. ДАШБОРД (из one_thing.json, count_until_after.json, wink_events.json) ---
class Dashboard(db.Model):
    __tablename__ = 'dashboard'
    key = db.Column(db.String(50), primary_key=True) 
    title = db.Column(db.String(255))
    date = db.Column(db.Date, nullable=True) 
    extra_text = db.Column(db.Text, nullable=True) 

# --- 10. НАСТРОЙКИ (из settings.json) ---
class AppSettings(db.Model):
    __tablename__ = 'app_settings'
    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.String(255))
