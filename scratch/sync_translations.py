import sqlite3
import json
import os

db_path = os.path.join('data', 'db', 'papanda.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("Synchronizing translations JSON field...")

cursor.execute("SELECT word, eng, it, de, ru, translations FROM word_stats")
rows = cursor.fetchall()

updated = 0
for row in rows:
    try:
        # Load existing or create new
        if row['translations']:
            trans = json.loads(row['translations'])
        else:
            trans = {}
        
        # Ensure standard keys are present from legacy columns if available
        # We use 'en' as standard for English in the new system
        if not trans.get('en') and row['eng']: trans['en'] = row['eng']
        if not trans.get('it') and row['it']: trans['it'] = row['it']
        if not trans.get('de') and row['de']: trans['de'] = row['de']
        if not trans.get('ru') and row['ru']: trans['ru'] = row['ru']
        
        # Also handle 'eng' vs 'en' just in case
        if 'eng' in trans and 'en' not in trans:
            trans['en'] = trans.pop('eng')

        new_json = json.dumps(trans)
        if new_json != row['translations']:
            cursor.execute("UPDATE word_stats SET translations = ? WHERE word = ?", (new_json, row['word']))
            updated += 1
    except Exception as e:
        print(f"Error processing {row['word']}: {e}")

conn.commit()
print(f"Update complete. Synchronized {updated} words.")
conn.close()
