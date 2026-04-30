
import sqlite3
import json
import os
from pathlib import Path

# Путь к базе данных
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "data" / "db" / "papanda.db"

def migrate():
    print(f"Starting show_stats migration for {DB_PATH}...")
    if not DB_PATH.exists():
        print(f"Error: Database file not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Добавляем новую колонку 'show_stats', если её нет
        print("Adding new column 'show_stats'...")
        try:
            cursor.execute("ALTER TABLE word_stats ADD COLUMN show_stats JSON")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("Column 'show_stats' already exists.")
            else:
                raise e

        # 2. Мигрируем данные: инициализируем show_stats текущим значением count для базовых языков
        print("Initializing show_stats from global count...")
        cursor.execute("SELECT word, count, translations FROM word_stats")
        rows = cursor.fetchall()

        for row in rows:
            word, count, trans_json = row
            trans = json.loads(trans_json) if trans_json else {}
            
            # Для базовой тройки и русского ставим текущий count
            # Для всех остальных языков в translations ставим 0
            show_stats = {}
            for lang in trans.keys():
                if lang in ['en', 'it', 'de', 'ru']:
                    show_stats[lang] = int(count) if count else 0
                else:
                    show_stats[lang] = 0
            
            cursor.execute(
                "UPDATE word_stats SET show_stats = ? WHERE word = ?",
                (json.dumps(show_stats), word)
            )

        conn.commit()
        print(f"Successfully migrated {len(rows)} words.")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
