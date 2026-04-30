import sqlite3
import os

db_path = "data/db/papanda.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current columns in smart_notes
cursor.execute("PRAGMA table_info(smart_notes)")
columns = [row[1] for row in cursor.fetchall()]
print(f"Current columns in smart_notes: {columns}")

if 'is_pinned' not in columns:
    print("Adding is_pinned to smart_notes...")
    try:
        # 0 is the default for False in SQLite
        cursor.execute("ALTER TABLE smart_notes ADD COLUMN is_pinned INTEGER DEFAULT 0")
        print("is_pinned added.")
    except Exception as e:
        print(f"Failed to add is_pinned: {e}")

conn.commit()
conn.close()
print("Migration completed.")
