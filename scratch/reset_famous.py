import sqlite3
import json
from pathlib import Path

db_path = Path("fastapi_app/data/db/papanda.db")
if not db_path.exists():
    db_path = Path("data/db/papanda.db")
    
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Reset famous
cursor.execute("UPDATE word_stats SET knowledge_stats = ?, is_learned = 0 WHERE eng = ?", 
               (json.dumps({"en": False, "it": False, "de": False}), 'famous'))
conn.commit()
print("Reset knowledge stats for 'famous'")

conn.close()
