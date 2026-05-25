import sqlite3
conn = sqlite3.connect(r'd:\Библиотека\Исследования\Искусственный интеллект\papanda\papanda v 0.6 experiment\data\db\papanda.db')
cur = conn.cursor()
cur.execute("SELECT count(*) FROM word_stats WHERE JSON_EXTRACT(knowledge_stats, '$.en') = 1 AND is_learned = 0")
print('Known EN but not fully learned:', cur.fetchone()[0])
