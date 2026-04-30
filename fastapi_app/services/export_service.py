import io
import csv
import openpyxl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Any, Tuple
from .. import models
from .settings_service import get_setting

class ExportService:
    """Сервис для экспорта данных из БД в различные форматы (CSV, Excel)."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def export_to_csv(self, Model: Any) -> bytes:
        """Экспортирует таблицу в CSV."""
        output = io.StringIO()
        output.write('\ufeff') # BOM for Excel
        writer = csv.writer(output, delimiter=';')

        columns = [c.name for c in Model.__table__.columns]
        writer.writerow(columns)

        res = await self.db.execute(select(Model))
        records = res.scalars().all()
        for rec in records:
            writer.writerow([getattr(rec, col) for col in columns])

        return output.getvalue().encode('utf-8-sig')

    async def export_vocabulary_to_excel(self) -> bytes:
        """Специализированный экспорт словаря в Excel."""
        Model = models.WordStats
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Vocabulary"

        # Определяем активные языки
        active_langs_raw = await get_setting(self.db, 'active_languages', 'en,it,de')
        active_langs = [l.strip() for l in (active_langs_raw or 'en,it,de').split(',') if l.strip()]
        if 'en' not in active_langs: active_langs.insert(0, 'en')
        
        columns = ['word'] + [l for l in active_langs if l != 'en'] + ['meaning']
        ws.append(columns)

        res = await self.db.execute(select(Model))
        records = res.scalars().all()
        for rec in records:
            row = []
            for col in columns:
                if col == 'word': val = rec.word
                elif col == 'meaning': val = rec.meaning
                else:
                    trans = rec.translations or {}
                    val = trans.get(col, "")
                row.append(val if val is not None else "")
            ws.append(row)

        data_stream = io.BytesIO()
        wb.save(data_stream)
        return data_stream.getvalue()

    async def export_model_to_excel(self, Model: Any) -> bytes:
        """Универсальный экспорт любой модели в Excel."""
        if Model == models.WordStats:
            return await self.export_vocabulary_to_excel()
            
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = Model.__name__

        columns = [c.name for c in Model.__table__.columns]
        ws.append(columns)

        res = await self.db.execute(select(Model))
        records = res.scalars().all()
        for rec in records:
            ws.append([getattr(rec, col) for col in columns])

        data_stream = io.BytesIO()
        wb.save(data_stream)
        return data_stream.getvalue()
