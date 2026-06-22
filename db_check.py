import sqlite3

conn = sqlite3.connect('data/db/papanda.db')
cursor = conn.cursor()
cursor.execute('SELECT id, title, content_json FROM dialectics WHERE title IN ("Example Note", "Пример конспекта", "Конспект мысалы")')
rows = cursor.fetchall()
for row in rows:
    print("ID:", row[0], "Title:", row[1], "Content Len:", len(str(row[2])))
    print("Preview:", str(row[2])[:200])
