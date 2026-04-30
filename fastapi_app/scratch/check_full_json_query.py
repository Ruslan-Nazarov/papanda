import sqlite3
import json

conn = sqlite3.connect("../data/db/papanda.db")
cur = conn.cursor()

def test_query(q):
    cur.execute(q)
    return cur.fetchone()[0]

print("Total WHERE json_extract(en)=1 AND json_extract(de)=1 AND json_extract(it)=1:")
print(test_query("SELECT COUNT(*) FROM word_stats WHERE json_extract(knowledge_stats, '$.en') = 1 AND json_extract(knowledge_stats, '$.de') = 1 AND json_extract(knowledge_stats, '$.it') = 1"))

print("Total words:", test_query("SELECT COUNT(*) FROM word_stats"))
print("Total words WHERE is_learned=1:", test_query("SELECT COUNT(*) FROM word_stats WHERE is_learned = 1"))

# Let's count how many have JSON empty vs not empty
print("Total with valid JSON knowledge_stats:", test_query("SELECT COUNT(*) FROM word_stats WHERE knowledge_stats IS NOT NULL AND knowledge_stats != '{}'"))

# Show a few records where is_learned = 1
cur.execute("SELECT eng, knowledge_stats FROM word_stats WHERE is_learned = 1 LIMIT 5")
print("\nSample of is_learned=1:")
for row in cur.fetchall():
    print(row)

conn.close()
