import sqlite3
import os

db_path = r"d:\Библиотека\Исследования\Искусственный интеллект\papanda\papanda v 0.6 experiment\data\db\papanda.db"

def migrate(path):
    print(f"Migrating {path}...")
    if not os.path.exists(path):
        print("File not found.")
        return
    
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    
    # 1. Create smart_notes table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS smart_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT DEFAULT 'Untitled Note',
        content_json TEXT DEFAULT '[]',
        is_pinned BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    )
    """)
    print("Table 'smart_notes' verified/created.")
    
    # 2. Add smart_note_id to sticky_notes
    try:
        cursor.execute("ALTER TABLE sticky_notes ADD COLUMN smart_note_id INTEGER REFERENCES smart_notes(id)")
        print("Column 'smart_note_id' added to 'sticky_notes'.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'smart_note_id' already exists.")
        else:
            print(f"Error adding column: {e}")
            
    conn.commit()
    conn.close()
    print("Migration finished.")

if __name__ == "__main__":
    migrate(db_path)
    # Also migrate sandbox if exists
    sandbox_path = r"d:\Библиотека\Исследования\Искусственный интеллект\papanda\papanda v 0.6 experiment\data\db\sandbox_demo.db"
    if os.path.exists(sandbox_path):
        migrate(sandbox_path)
