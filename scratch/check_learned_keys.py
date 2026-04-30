import sqlite3
import os
from pathlib import Path

db_path = Path("fastapi_app/data/db/papanda.db")
if not db_path.exists():
    db_path = Path("data/db/papanda.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Words with is_learned=1 and their knowledge_stats:")
cursor.execute("SELECT word, is_learned, knowledge_stats FROM word_stats WHERE is_learned=1")
rows = cursor.fetchall()
for row in rows[:20]:
    print(row)

print("\nActive Languages in settings:")
cursor.execute("SELECT value FROM app_settings WHERE key='active_languages'")
row = cursor.fetchone()
print(row[0] if row else "Not found (default en,it,de)")

conn.close()
