import sqlite3
import sys
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = Path("fastapi_app/data/db/papanda.db")
if not db_path.exists():
    db_path = Path("data/db/papanda.db")

if db_path.exists():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    for table in ['event', 'task', 'habits', 'notes', 'smart_notes', 'observations', 'sticky_notes']:
        print(f"\nSearching table {table}:")
        try:
            cursor.execute(f"SELECT * FROM {table} LIMIT 0")
            cols = [description[0] for description in cursor.description]
            search_cols = [c for c in cols if c in ['title', 'name', 'text', 'content']]
            if search_cols:
                where_clause = " OR ".join([f"{c} LIKE '%Brain%'" for c in search_cols])
                cursor.execute(f"SELECT {', '.join(cols[:5])} FROM {table} WHERE {where_clause}")
                for row in cursor.fetchall():
                    print(row)
            else:
                print("No searchable columns.")
        except Exception as e:
            print(f"Error: {e}")

    conn.close()
