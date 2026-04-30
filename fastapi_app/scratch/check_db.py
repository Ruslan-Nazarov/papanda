
import sqlite3
import os
from pathlib import Path

# Путь к базе данных
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "data" / "db" / "papanda.db"

def check():
    print(f"Checking columns for {DB_PATH}...")
    if not DB_PATH.exists():
        print(f"Error: Database file not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(word_stats);")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"Columns: {columns}")
    conn.close()

if __name__ == "__main__":
    check()
