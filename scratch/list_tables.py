import sqlite3
db_path = r"d:\Библиотека\Исследования\Искусственный интеллект\papanda\papanda v 0.6 experiment\data\db\papanda.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
print(cursor.fetchall())
conn.close()
