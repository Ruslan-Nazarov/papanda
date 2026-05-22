import sqlite3

conn = sqlite3.connect('data/db/papanda.db')
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]
print('Tables:', tables)
print()

for t in tables:
    cur.execute(f"PRAGMA foreign_key_list('{t}')")
    fks = cur.fetchall()
    for fk in fks:
        ref_table = fk[2]
        if ref_table not in tables:
            print(f'[BROKEN FK] Table "{t}" has FK to "{ref_table}" which does NOT exist!')
        else:
            print(f'  OK: {t}.{fk[4]} -> {ref_table}.{fk[3]}')

conn.close()
