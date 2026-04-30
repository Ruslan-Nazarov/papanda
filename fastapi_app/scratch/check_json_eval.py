import sqlite3
import json

conn = sqlite3.connect("../data/db/papanda.db")
cur = conn.cursor()

def test_query(q):
    cur.execute(q)
    return cur.fetchone()[0]

print("Total WHERE json_extract(en) = 1:", test_query("SELECT COUNT(*) FROM word_stats WHERE json_extract(knowledge_stats, '$.en') = 1"))
print("Total WHERE json_extract(en) = 'true':", test_query("SELECT COUNT(*) FROM word_stats WHERE json_extract(knowledge_stats, '$.en') = 'true'"))
print("Total WHERE json_type(en) = 'true':", test_query("SELECT COUNT(*) FROM word_stats WHERE json_type(knowledge_stats, '$.en') = 'true'"))
print("Total WHERE json_extract(en) IS true:", test_query("SELECT COUNT(*) FROM word_stats WHERE json_extract(knowledge_stats, '$.en') IS true"))

conn.close()
