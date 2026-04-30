import sqlite3
import json
from pathlib import Path

db_path = Path("fastapi_app/data/db/papanda.db")
if not db_path.exists():
    db_path = Path("data/db/papanda.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get active languages to know what "fully learned" means
cursor.execute("SELECT value FROM app_settings WHERE key='active_languages'")
row = cursor.fetchone()
active_langs = row[0].split(',') if row else ['en', 'it', 'de']
active_langs = [l.strip() for l in active_langs]

print(f"Active languages for sync: {active_langs}")

cursor.execute("SELECT word, knowledge_stats FROM word_stats")
rows = cursor.fetchall()

updated = 0
for word, k_json in rows:
    try:
        stats = json.loads(k_json) if k_json else {}
        
        # A word is fully learned if ALL active languages are marked as true in knowledge_stats
        is_fully_known = True
        for lang in active_langs:
            if not stats.get(lang):
                is_fully_known = False
                break
        
        cursor.execute("UPDATE word_stats SET is_learned = ? WHERE word = ?", (1 if is_fully_known else 0, word))
        updated += 1
    except Exception as e:
        print(f"Error updating {word}: {e}")

conn.commit()
print(f"Successfully synced {updated} words.")

# Final check
cursor.execute("SELECT is_learned, count(*) FROM word_stats GROUP BY is_learned")
print(f"New counts: {cursor.fetchall()}")

conn.close()
