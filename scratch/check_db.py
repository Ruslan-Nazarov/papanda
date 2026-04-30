import sqlite3
import os

db_path = 'fastapi_app/word_stats.db'
if not os.path.exists(db_path):
    print(f"Database {db_path} does not exist")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", [t[0] for t in tables])
    
    for table in [t[0] for t in tables]:
        if table in ['smart_notes', 'sticky_notes']:
            cursor.execute(f"PRAGMA table_info({table});")
            columns = cursor.fetchall()
            print(f"Columns for {table}:", [c[1] for c in columns])
    conn.close()
