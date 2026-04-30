
import asyncio
import os
import sys
import json
from datetime import datetime
import aiosqlite

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi_app.database import settings

BACKUP_PATH = r"D:\Библиотека\Исследования\Искусственный интеллект\papanda\резерв экспериментальной версии\papanda1.db"
TARGET_PATH = str(settings.db_path)

async def restore():
    print(f"Connecting to backup: {BACKUP_PATH}")
    print(f"Target database: {TARGET_PATH}")
    
    async with aiosqlite.connect(BACKUP_PATH) as src, aiosqlite.connect(TARGET_PATH) as dst:
        # 1. Restore word_shows_daily (Activity History)
        print("Restoring WordShowsDaily...")
        cursor = await src.execute("SELECT date, shows_count FROM word_shows_daily")
        rows = await cursor.fetchall()
        for date_str, count in rows:
            await dst.execute("INSERT OR REPLACE INTO word_shows_daily (date, shows_count) VALUES (?, ?)", (date_str, count))
        print(f"Restored {len(rows)} days of activity.")

        # 2. Restore word_stats_snapshot (Progress Trends)
        print("Restoring WordStatsSnapshot...")
        cursor = await src.execute("SELECT date, coverage, imw FROM word_stats_snapshot")
        rows = await cursor.fetchall()
        for date_str, coverage, imw in rows:
            await dst.execute("INSERT OR REPLACE INTO word_stats_snapshot (date, coverage, imw) VALUES (?, ?, ?)", (date_str, coverage, imw))
        print(f"Restored {len(rows)} snapshots.")

        # 3. Restore WordStats (Levels and Marks)
        print("Restoring WordStats learning progress...")
        # Old schema has individual columns
        cursor = await src.execute("SELECT word, count, last_shown, is_known_en, is_known_it, is_known_de, is_learned FROM word_stats")
        rows = await cursor.fetchall()
        restored_words = 0
        for row in rows:
            word, count, last_shown, is_known_en, is_known_it, is_known_de, is_learned = row
            
            # Build new JSON fields from old columns
            knowledge_stats = json.dumps({
                "en": bool(is_known_en),
                "it": bool(is_known_it),
                "de": bool(is_known_de)
            })
            # Since we don't have per-language shows in backup, assume global count for all three
            show_stats = json.dumps({
                "en": count,
                "it": count,
                "de": count
            })

            # Check if word exists in target
            check_cur = await dst.execute("SELECT count FROM word_stats WHERE word = ?", (word,))
            exists = await check_cur.fetchone()
            
            if exists:
                await dst.execute("""
                    UPDATE word_stats 
                    SET count = ?, last_shown = ?, is_known_en = ?, is_known_it = ?, 
                        is_known_de = ?, is_learned = ?, show_stats = ?, knowledge_stats = ?
                    WHERE word = ?
                """, (count, last_shown, is_known_en, is_known_it, is_known_de, is_learned, show_stats, knowledge_stats, word))
                restored_words += 1


            else:
                # If word doesn't exist, we might not want to insert it if it's not in the new base, 
                # but better to restore it as well if it's in the backup.
                pass 
        
        await dst.commit()
        print(f"Updated progress for {restored_words} words.")

if __name__ == "__main__":
    asyncio.run(restore())
