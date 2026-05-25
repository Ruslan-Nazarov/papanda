import sqlite3

conn = sqlite3.connect(':memory:')
conn.execute('CREATE TABLE t (data JSON);')
conn.execute("INSERT INTO t VALUES ('{\"en\": true}'), ('{\"en\": 1}'), ('{\"en\": \"true\"}');")
cur = conn.execute("SELECT data, JSON_EXTRACT(data, '$.en') = 1, JSON_EXTRACT(data, '$.en') = 'true' FROM t")
print(cur.fetchall())
