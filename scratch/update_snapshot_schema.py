import sqlite3
import os

db_path = "data/db/papanda.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Update word_stats_snapshot
cursor.execute("PRAGMA table_info(word_stats_snapshot)")
columns = [row[1] for row in cursor.fetchall()]
print(f"Current columns in word_stats_snapshot: {columns}")

needed = {
    'fully_learned_count': 'INTEGER DEFAULT 0',
    'test_total': 'INTEGER DEFAULT 0',
    'test_success': 'INTEGER DEFAULT 0'
}

for col, type_def in needed.items():
    if col not in columns:
        print(f"Adding column {col} to word_stats_snapshot...")
        try:
            cursor.execute(f"ALTER TABLE word_stats_snapshot ADD COLUMN {col} {type_def}")
            print(f"Column {col} added.")
        except Exception as e:
            print(f"Failed to add {col}: {e}")

conn.commit()
conn.close()
print("Done.")
