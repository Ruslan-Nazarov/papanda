import sqlite3
import os
from pathlib import Path

db_path = Path("fastapi_app/data/db/papanda.db")
if not db_path.exists():
    db_path = Path("data/db/papanda.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Checking is_learned count:")
cursor.execute("SELECT is_learned, count(*) FROM word_stats GROUP BY is_learned")
print(cursor.fetchall())

print("\nRecent words with is_learned=1:")
cursor.execute("SELECT word, is_learned, knowledge_stats FROM word_stats WHERE is_learned=1 LIMIT 5")
for row in cursor.fetchall():
    print(row)

print("\nWords that are partially known but not is_learned:")
cursor.execute("SELECT word, is_learned, knowledge_stats FROM word_stats WHERE is_learned=0 AND knowledge_stats IS NOT None AND knowledge_stats != '{}' LIMIT 5")
for row in cursor.fetchall():
    print(row)

conn.close()
