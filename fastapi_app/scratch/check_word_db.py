import sqlite3
import json

conn = sqlite3.connect("word_stats.db")
cur = conn.cursor()

# 1. Check active languages setting
cur.execute("SELECT value FROM app_settings WHERE key = 'active_languages'")
res = cur.fetchone()
active_langs = res[0] if res else "en,it,de"
print(f"Active Languages Setting: {active_langs}")

# 2. Total words count
cur.execute("SELECT COUNT(*) FROM word_stats")
total = cur.fetchone()[0]
print(f"Total Words: {total}")

# 3. Words where is_learned = True
cur.execute("SELECT COUNT(*) FROM word_stats WHERE is_learned = 1")
learned_col = cur.fetchone()[0]
print(f"Words with is_learned=True: {learned_col}")

# 4. Sample knowledge_stats for some words
cur.execute("SELECT eng, knowledge_stats, is_learned FROM word_stats WHERE knowledge_stats IS NOT NULL LIMIT 5")
rows = cur.fetchall()
print("\nSample Word Stats:")
for r in rows:
    print(f"Word: {r[0]}, Stats: {r[1]}, is_learned: {r[2]}")

# 5. Check specific query for Fully Learned
langs = [l.strip() for l in active_langs.split(',')]
conds = [f"json_extract(knowledge_stats, '$.{l}') = 1" for l in langs]
query = f"SELECT COUNT(*) FROM word_stats WHERE {' AND '.join(conds)}"
try:
    cur.execute(query)
    query_res = cur.fetchone()[0]
    print(f"\nQuery Result for Fully Learned ({langs}): {query_res}")
except Exception as e:
    print(f"\nQuery Failed: {e}")

conn.close()
