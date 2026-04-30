import sqlite3
import json
from pathlib import Path

db_path = Path("fastapi_app/data/db/papanda.db")
if not db_path.exists():
    db_path = Path("data/db/papanda.db")
    
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT word, eng, knowledge_stats, is_learned, ru, it, de FROM word_stats WHERE word LIKE '%ber%' OR de LIKE '%ber%'")
rows = cursor.fetchall()
with open("scratch/beruhmt_data.txt", "w", encoding="utf-8") as f:
    for row in rows:
        f.write(str(row) + "\n")

conn.close()
