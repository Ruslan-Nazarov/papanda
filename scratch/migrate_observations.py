import sqlite3
import os

db_path = 'data/db/papanda.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Deleting logs...")
    cursor.execute('DELETE FROM observation_logs')
    print("Deleting observations...")
    cursor.execute('DELETE FROM observations')
    
    print("Adding task_id column...")
    try:
        cursor.execute('ALTER TABLE observations ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL')
    except sqlite3.OperationalError as e:
        print(f"Column might already exist: {e}")
        
    conn.commit()
    print("Success!")
except Exception as e:
    print(f"General error: {e}")
    conn.rollback()
finally:
    conn.close()
