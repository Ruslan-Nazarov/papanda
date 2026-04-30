import sqlite3
import json
from pathlib import Path

db_path = Path("fastapi_app/data/db/papanda.db")
if not db_path.exists():
    db_path = Path("data/db/papanda.db")
    
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT word, knowledge_stats FROM word_stats")
rows = cursor.fetchall()
any_known = 0
all_known_count = 0
for word, k_json in rows:
    stats = json.loads(k_json) if k_json else {}
    if any(stats.values()):
        any_known += 1
    if all(stats.values()) and stats:
        all_known_count += 1

print(f"Total words: {len(rows)}")
print(f"At least one language known: {any_known}")
print(f"All languages known: {all_known_count}")

conn.close()
