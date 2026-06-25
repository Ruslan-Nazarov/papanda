import sqlite3
conn = sqlite3.connect('data/db/papanda.db')
conn.execute("UPDATE alembic_version SET version_num='ede61c24ee1e'")
conn.commit()
conn.close()
print("Fixed")
