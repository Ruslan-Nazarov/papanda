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
        """Специализированный экспорт словаря в Excel (все языки из translations)."""
        Model = models.WordStats
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Vocabulary"

        res = await self.db.execute(select(Model))
        records = res.scalars().all()

        # Собираем все языки из translations по всем записям
        all_langs: set = set()
        for rec in records:
            if rec.translations:
                all_langs.update(rec.translations.keys())
        # 'en' всегда первый, остальные — отсортированные
        other_langs = sorted(all_langs - {'en', 'ru'})
        columns = ['word', 'en'] + other_langs + ['ru', 'meaning']
        ws.append(columns)

        for rec in records:
            row = []
            trans = rec.translations or {}
            for col in columns:
                if col == 'word':    val = rec.word
                elif col == 'meaning': val = rec.meaning
                elif col == 'en':    val = rec.eng or trans.get('en', '')
                elif col == 'ru':    val = rec.ru or trans.get('ru', '')
                else:                val = trans.get(col, '')
                row.append(val if val is not None else '')
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
