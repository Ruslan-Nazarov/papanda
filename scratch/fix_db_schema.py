import sqlite3
import os

db_path = "data/db/papanda.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check current columns
cursor.execute("PRAGMA table_info(sticky_notes)")
columns = [row[1] for row in cursor.fetchall()]
print(f"Current columns: {columns}")

needed_columns = ['task_id', 'habit_id', 'note_id']
for col in needed_columns:
    if col not in columns:
        print(f"Adding column {col}...")
        try:
            cursor.execute(f"ALTER TABLE sticky_notes ADD COLUMN {col} INTEGER")
            print(f"Column {col} added.")
        except Exception as e:
            print(f"Failed to add {col}: {e}")

conn.commit()
conn.close()
print("Done.")
