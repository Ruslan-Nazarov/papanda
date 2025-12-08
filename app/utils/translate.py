import random
import json
from datetime import datetime, timedelta
from sqlalchemy import func
from app.models import db, WordStats, Dashboard, AppSettings
from config import Config
import openpyxl # <-- Используем легкую библиотеку напрямую

def get_excel_data():
    """
    Читает Excel с помощью openpyxl (без pandas).
    Возвращает список строк и количество.
    """
    if not Config.EXCEL_FILE.exists():
        return None, 0
    try:
        # data_only=True берет значения, а не формулы. read_only=True для скорости.
        wb = openpyxl.load_workbook(Config.EXCEL_FILE, data_only=True, read_only=True)
        ws = wb.active
        
        # Превращаем строки Excel в список списков
        # openpyxl возвращает кортежи ячеек
        data = []
        for row in ws.iter_rows(values_only=True):
            # Пропускаем совсем пустые строки
            if not any(row): continue
            data.append(row)
            
        # Объем словаря (делим на 2 языка, как было у вас)
        count = round(len(data) / 2)
        
        wb.close()
        return data, count
    except Exception as e:
        print(f"Excel Error: {e}")
        return None, 0

def analysis_learning_words():
    """Считает статистику (Coverage, iMW)."""
    _, count_words = get_excel_data()
    
    unique_seen = db.session.query(WordStats).count()
    total_shows = db.session.query(func.sum(WordStats.count)).scalar() or 0
    
    coverage = 0
    imw = 0
    
    if count_words > 0:
        coverage = round((unique_seen / count_words) * 100, 2)
        target = count_words * 80
        if target > 0:
            imw = round((total_shows / target) * 100, 2)
            
    return coverage, imw, count_words

def get_current_words():
    """Возвращает список текущих активных слов из БД."""
    dash = Dashboard.query.get('current_words')
    if dash and dash.extra_text:
        try:
            state = json.loads(dash.extra_text)
            return state.get('words', [])
        except: pass
    return []

def learning_words():
    """Алгоритм генерации слов (адаптирован под список вместо DataFrame)"""
    
    # 1. Проверяем таймер
    dash_state = Dashboard.query.get('current_words')
    s_rnd = AppSettings.query.get('max_random_minutes')
    max_minutes = int(s_rnd.value) if s_rnd else 1000
    
    generate_new = False
    if not dash_state or not dash_state.extra_text:
        generate_new = True
    else:
        try:
            state = json.loads(dash_state.extra_text)
            gen_time = datetime.fromisoformat(state['gen_time'])
            saved_minutes = state.get('minutes', 60)
            if datetime.now() > gen_time + timedelta(minutes=saved_minutes):
                generate_new = True
        except:
            generate_new = True

    if not generate_new: return

    # 2. Читаем данные
    rows, _ = get_excel_data()
    if not rows: return

    try:
        # Парсим словарь (Работаем со списком, индексы: 1=Язык, 2=Англ, 3=Перевод)
        # В Excel первая колонка это A (индекс 0), B (1), C (2), D (3)
        vocab = {}
        for row in rows:
            try:
                # row - это кортеж (col A, col B, col C, col D...)
                # Проверяем, что строка не короче 4 ячеек
                if len(row) < 4: continue
                
                lang = str(row[1]).lower().strip() if row[1] else ""
                eng = str(row[2]).lower().strip() if row[2] else ""
                trans = str(row[3]).lower().strip() if row[3] else ""
                
                if not eng: continue

                if eng not in vocab: vocab[eng] = {'eng': eng, 'it': '', 'de': ''}
                
                if 'итальянский' in lang: vocab[eng]['it'] = trans
                elif 'немецкий' in lang: vocab[eng]['de'] = trans
            except: continue

        # Веса и выбор (Ваша логика)
        stats_query = db.session.query(WordStats.word, WordStats.count).all()
        stats_map = {w: c for w, c in stats_query}
        
        candidates = list(vocab.keys())
        weights = [1.0 / (stats_map.get(w, 0) + 1) for w in candidates]

        if candidates:
            chosen = random.choices(candidates, weights=weights, k=3)
            result_list = []
            
            for k in chosen:
                result_list.append(vocab[k])
                # Update Stats
                ws = WordStats.query.get(k)
                if not ws:
                    ws = WordStats(word=k, count=0)
                    db.session.add(ws)
                ws.count += 1
                ws.last_shown = datetime.utcnow()
            
            # Сохраняем
            next_interval = random.randint(1, max_minutes)
            meta = json.dumps({
                'gen_time': datetime.now().isoformat(),
                'minutes': next_interval,
                'words': result_list
            })
            
            if not dash_state:
                dash_state = Dashboard(key='current_words')
                db.session.add(dash_state)
            
            dash_state.title = "Active Words"
            dash_state.extra_text = meta
            
            db.session.commit()
            
    except Exception as e:
        print(f"Learning Algo Error: {e}")