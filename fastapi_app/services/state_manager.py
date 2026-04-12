import os
import json


import openpyxl
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from .. import models
from .settings_service import get_setting, set_settings_batch

from ..logger import logger

def clean_excel_val(val):
    if val is None:
        return ""
    return str(val).strip()

async def import_excel_to_db(db: AsyncSession, excel_path: str):
    """Импортирует слова из Excel в таблицу WordStats базы данных с проверкой конфликтов."""
    if not os.path.exists(excel_path):
        return {
            "success": False,
            "message": f"Файл Excel не найден по пути: {excel_path}",
            "counts": {"new": 0, "updated": 0, "skipped": 0, "conflicts": 0},
            "conflicts_list": []
        }

    try:
        # openpyxl is synchronous, so we run it in a threadpool to avoid blocking the event loop
        import asyncio
        loop = asyncio.get_event_loop()

        def read_excel():
            wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
            sheet = wb.active
            rows = list(sheet.iter_rows(values_only=True))
            wb.close()
            return rows

        rows = await loop.run_in_executor(None, read_excel)

        if not rows:
            return {
                "success": False,
                "message": "Файл пуст",
                "counts": {"new": 0, "updated": 0, "skipped": 0, "conflicts": 0},
                "conflicts_list": []
            }

        counts = {"new": 0, "updated": 0, "skipped": 0, "conflicts": 0}
        conflicts_list = []

        for r in rows:
            if not r or len(r) < 3: continue

            eng = clean_excel_val(r[0]) if r[0] else ""
            if not eng or eng.lower() in ['английский', 'english', 'word', 'eng']:
                continue

            de = clean_excel_val(r[1]) if len(r) > 1 and r[1] else ""
            it = clean_excel_val(r[2]) if len(r) > 2 and r[2] else ""
            ru = clean_excel_val(r[3]) if len(r) > 3 and r[3] else ""
            meaning = clean_excel_val(r[4]) if len(r) > 4 and r[4] else ""

            # Use await select() for async session
            existing_res = await db.execute(select(models.WordStats).where(models.WordStats.word == eng))
            existing = existing_res.scalar_one_or_none()

            if existing:
                # Очищаем значения из БД на случай если туда попали грязные формулы
                db_it = clean_excel_val(existing.it) if existing.it else ""
                db_de = clean_excel_val(existing.de) if existing.de else ""
                db_ru = clean_excel_val(existing.ru) if existing.ru else ""
                db_meaning = clean_excel_val(existing.meaning) if existing.meaning else ""

                # Если в БД были грязные данные — молча чистим их
                if existing.it != db_it or existing.de != db_de or existing.ru != db_ru or existing.meaning != db_meaning:
                    existing.it = db_it
                    existing.de = db_de
                    existing.ru = db_ru
                    existing.meaning = db_meaning

                # Сравниваем поля (уже очищенные)
                field_diffs = {}
                if db_it != it:
                    field_diffs['it'] = {'db': db_it, 'file': it}
                if db_de != de:
                    field_diffs['de'] = {'db': db_de, 'file': de}
                if db_ru != ru:
                    field_diffs['ru'] = {'db': db_ru, 'file': ru}
                if db_meaning != meaning:
                    field_diffs['meaning'] = {'db': db_meaning, 'file': meaning}

                if field_diffs:
                    # Есть отличия - конфликт
                    counts["conflicts"] += 1
                    conflicts_list.append({
                        "word": eng,
                        "field_diffs": field_diffs
                    })
                else:
                    # Совпадает - пропускаем
                    counts["skipped"] += 1
            else:
                # Новое слово
                db.add(models.WordStats(
                    word=eng, eng=eng, it=it, de=de, ru=ru, meaning=meaning
                ))
                counts["new"] += 1

        await db.commit()
        logger.info(f"Import summary: {counts}")

        message = f"Импорт завершен. Новых: {counts['new']}, Пропущено (совпадает): {counts['skipped']}, Конфликтов: {counts['conflicts']}"
        if counts["conflicts"] > 0:
            message += ". Проверьте конфликты перед повторным импортом."

        return {
            "success": True,
            "message": message,
            "counts": counts,
            "conflicts_list": conflicts_list
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Excel import error: {e}", exc_info=True)
        return {
            "success": False,
            "message": f"Ошибка при импорте: {str(e)}",
            "counts": {"new": 0, "updated": 0, "skipped": 0, "conflicts": 0},
            "conflicts_list": []
        }

async def sync_conflicts(db: AsyncSession, excel_path: str, resolutions: dict):
    """Применяет разрешения конфликтов: записывает данные в БД или изменяет файл Excel."""
    if not os.path.exists(excel_path):
        return {"success": False, "message": "Файл Excel не найден."}

    try:
        words_to_sync = list(resolutions.keys())
        if not words_to_sync:
            return {"success": True, "message": "Нет данных для синхронизации.", "updated_db": 0, "updated_file": 0}

        db_records_res = await db.execute(select(models.WordStats).where(models.WordStats.word.in_(words_to_sync)))
        db_records = db_records_res.scalars().all()
        db_dict = {
            r.word: {"it": r.it or "", "de": r.de or "", "ru": r.ru or "", "meaning": r.meaning or ""}
            for r in db_records
        }

        db_updates = {}

        import asyncio
        loop = asyncio.get_event_loop()

        def process_excel():
            wb = openpyxl.load_workbook(excel_path)
            sheet = wb.active
            needs_save = False
            updated_file_count = 0

            for row_idx, row in enumerate(sheet.iter_rows(), start=1):
                if not row or row[0].value is None: continue
                eng = clean_excel_val(row[0].value)
                if not eng or eng.lower() in ['английский', 'english', 'word', 'eng']: continue

                if eng in resolutions:
                    action = resolutions[eng]
                    if action == 'to_file' and eng in db_dict:
                        db_vals = db_dict[eng]
                        sheet.cell(row=row_idx, column=2, value=db_vals['de'])
                        sheet.cell(row=row_idx, column=3, value=db_vals['it'])
                        sheet.cell(row=row_idx, column=4, value=db_vals['ru'])
                        sheet.cell(row=row_idx, column=5, value=db_vals['meaning'])
                        needs_save = True
                        updated_file_count += 1
                    elif action == 'to_db':
                        db_updates[eng] = {
                            'de': clean_excel_val(row[1].value) if len(row) > 1 and row[1].value else "",
                            'it': clean_excel_val(row[2].value) if len(row) > 2 and row[2].value else "",
                            'ru': clean_excel_val(row[3].value) if len(row) > 3 and row[3].value else "",
                            'meaning': clean_excel_val(row[4].value) if len(row) > 4 and row[4].value else ""
                        }

            if needs_save:
                wb.save(excel_path)
            wb.close()
            return updated_file_count

        file_updates_count = await loop.run_in_executor(None, process_excel)

        db_updates_count = 0
        for record in db_records:
            if record.word in db_updates:
                vals = db_updates[record.word]
                record.it = vals['it']
                record.de = vals['de']
                record.ru = vals['ru']
                record.meaning = vals['meaning']
                db_updates_count += 1

        if db_updates_count > 0:
            await db.commit()

        return {
            "success": True,
            "message": f"Синхронизация завершена. Обновлено в БД: {db_updates_count}, обновлено в файле: {file_updates_count}.",
            "updated_db": db_updates_count,
            "updated_file": file_updates_count
        }

    except PermissionError:
        return {"success": False, "message": "Ошибка доступа: закройте файл Excel в других программах и попробуйте снова."}
    except Exception as e:
        await db.rollback()
        logger.error(f"Sync conflict error: {e}", exc_info=True)
        return {"success": False, "message": f"Ошибка синхронизации: {str(e)}"}

async def get_runtime_context(db: AsyncSession, force_update: bool = False):
    """
    Получает текущий контекст (слова, винк) из кэша БД или генерирует новый.
    """
    # 1. Получаем настройки из БД через сервис
    interval = int(await get_setting(db, 'max_random_minutes', '60'))
    last_update_str = await get_setting(db, 'last_update_ts', None)

    # 2. Проверка времени
    need_update = force_update
    from datetime import timezone
    now = datetime.now(timezone.utc)

    if not need_update:
        # Пытаемся взять текущий кэш из БД (если есть)
        current_words_json = await get_setting(db, 'current_words_cache', None)
        if not last_update_str or not current_words_json:
            need_update = True
        else:
            try:
                last_dt = datetime.fromisoformat(last_update_str)
                if last_dt.tzinfo is None: last_dt = last_dt.replace(tzinfo=timezone.utc)
                diff = (now - last_dt).total_seconds() / 60
                if diff >= interval:
                    need_update = True
            except Exception as e:
                logger.warning(f"Time parsing failed: {e}")
                need_update = True

    # 3. Если время не пришло — отдаем из "кэша" в БД
    if not need_update:
        try:
            words = json.loads(await get_setting(db, 'current_words_cache', '[]'))
            wink = await get_setting(db, 'current_wink_cache', '...')
            count = int(await get_setting(db, 'total_words_count', '0'))
            imw = float(await get_setting(db, 'current_imw_cache', '0'))
            coverage = float(await get_setting(db, 'current_coverage_cache', '100.0'))
            return {'words': words, 'wink': wink, 'count': count, 'coverage': coverage, 'imw': imw}
        except Exception as e:
            logger.warning(f"Cache read failed: {e}")
            need_update = True

    # 4. Время пришло - Генерируем новые данные!
    final_words = []
    coverage, imw, total_count = 0, 0, 0
    try:
        total_count_res = await db.execute(select(func.count(models.WordStats.word)))
        total_count = total_count_res.scalar() or 0

        learned_count_res = await db.execute(select(func.count(models.WordStats.word)).where(models.WordStats.count > 0))
        learned_count = learned_count_res.scalar() or 0

        total_shows_res = await db.execute(select(func.sum(models.WordStats.count)))
        total_shows = total_shows_res.scalar() or 0

        coverage = round((learned_count / total_count) * 100, 2) if total_count > 0 else 0
        target_shows = total_count * 80
        imw = round((total_shows / target_shows) * 100, 2) if target_shows > 0 else 0

        # Выбираем 3 случайных слова из всей базы, кроме выученных
        selected_res = await db.execute(
            select(models.WordStats)
            .where(models.WordStats.is_learned == False)
            .order_by(func.random())
            .limit(3)
        )
        selected = selected_res.scalars().all()
        final_words = [{'eng': w.eng, 'de': w.de, 'it': w.it, 'ru': w.ru, 'meaning': w.meaning, 'is_learned': w.is_learned} for w in selected]

        for w in selected:
            w.count += 1
            w.last_shown = now.replace(tzinfo=None) # SQLite stores naive

        # Записываем ежедневную статистику показов
        today_date = now.date() if hasattr(now, 'date') else now.replace(tzinfo=None).date()
        daily_res = await db.execute(
            select(models.WordShowsDaily).where(models.WordShowsDaily.date == today_date)
        )
        daily_row = daily_res.scalar_one_or_none()
        if daily_row:
            daily_row.shows_count += len(selected)
        else:
            db.add(models.WordShowsDaily(date=today_date, shows_count=len(selected)))

        await db.commit()
    except Exception as e:
        logger.error(f"Metrics/Word Selection failed: {e}")
        await db.rollback()

    try:
        # Выбираем один случайный Wink прямо через БД
        wink_res = await db.execute(select(models.Wink).order_by(func.random()).limit(1))
        wink_obj = wink_res.scalar_one_or_none()
        wink_title = wink_obj.title if wink_obj else "..."
    except Exception as e:
        logger.warning(f"Wink selection failed: {e}")
        wink_title = "..."

    # 5. Сохраняем в кэш БД
    await set_settings_batch(db, {
        'current_words_cache': json.dumps(final_words, ensure_ascii=False),
        'current_wink_cache': wink_title,
        'total_words_count': str(total_count),
        'current_coverage_cache': str(coverage),
        'current_imw_cache': str(imw),
        'last_update_ts': now.isoformat()
    })

    return {'words': final_words, 'wink': wink_title, 'count': total_count, 'coverage': coverage, 'imw': imw}
