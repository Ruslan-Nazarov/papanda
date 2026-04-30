import sqlite3
import json

conn = sqlite3.connect(":memory:")
cur = conn.cursor()

# Test 1: JSON boolean 'true' comparison with 1
cur.execute("SELECT json_extract('{\"en\": true}', '$.en') = 1")
res1 = cur.fetchone()[0]
print(f"JSON true = 1: {res1}")

# Test 2: JSON boolean 'true' comparison with 'true' literal (using json_type)
cur.execute("SELECT json_type('{\"en\": true}', '$.en')")
res2 = cur.fetchone()[0]
print(f"JSON type: {res2}")

# Test 3: JSON boolean 'true' truthiness check
cur.execute("SELECT CASE WHEN json_extract('{\"en\": true}', '$.en') THEN 1 ELSE 0 END")
res3 = cur.fetchone()[0]
print(f"JSON true truthiness: {res3}")

# Test 4: JSON integer 1 comparison with 1
cur.execute("SELECT json_extract('{\"en\": 1}', '$.en') = 1")
res4 = cur.fetchone()[0]
print(f"JSON integer 1 = 1: {res4}")

conn.close()
