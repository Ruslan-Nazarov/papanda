import sqlite3
import json
import os

db_path = os.path.join('data', 'db', 'papanda.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT word, translations FROM word_stats WHERE word='last'")
rows = cursor.fetchall()

for row in rows:
    print(f"Word: {row[0]}")
    print(f"Translations: {row[1]}")
    print("-" * 20)

conn.close()
