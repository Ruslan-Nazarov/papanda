
import sqlite3
import json
import os
from pathlib import Path

# Путь к базе данных
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "data" / "db" / "papanda.db"

def migrate():
    print(f"Starting migration for {DB_PATH}...")
    if not DB_PATH.exists():
        print(f"Error: Database file not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Добавляем новые колонки, если их нет
        print("Adding new columns 'translations' and 'knowledge_stats'...")
        try:
            cursor.execute("ALTER TABLE word_stats ADD COLUMN translations JSON")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("Column 'translations' already exists.")
            else:
                raise e

        try:
            cursor.execute("ALTER TABLE word_stats ADD COLUMN knowledge_stats JSON")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("Column 'knowledge_stats' already exists.")
            else:
                raise e

        # 2. Мигрируем данные
        print("Migrating data from columns to JSON...")
        cursor.execute("SELECT word, eng, it, de, ru, is_known_en, is_known_it, is_known_de FROM word_stats")
        rows = cursor.fetchall()

        for row in rows:
            word, eng, it, de, ru, k_en, k_it, k_de = row
            
            # Формируем объект переводов
            translations = {
                "en": eng if eng else "",
                "it": it if it else "",
                "de": de if de else "",
                "ru": ru if ru else ""
            }
            
            # Формируем объект статистики знаний
            knowledge = {
                "en": bool(k_en),
                "it": bool(k_it),
                "de": bool(k_de)
            }
            
            cursor.execute(
                "UPDATE word_stats SET translations = ?, knowledge_stats = ? WHERE word = ?",
                (json.dumps(translations), json.dumps(knowledge), word)
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
