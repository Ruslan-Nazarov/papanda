import os
import json
import random
import openpyxl
from datetime import datetime
from app.models import Wink, db 

def load_json(path):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f: return json.load(f)
        except Exception as e:
            print(f"[DEBUG] Error reading JSON {path}: {e}")
    return {}

def save_json(data, path):
    try:
        # Гарантируем, что папка существует
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"[DEBUG] Error saving JSON {path}: {e}")

# --- ГЛАВНОЕ ИЗМЕНЕНИЕ: Принимаем готовые пути ---
def get_runtime_context(json_dir, excel_path):
    """
    json_dir: Путь к папке настроек (снаружи exe)
    excel_path: Путь к файлу Excel (внутри exe)
    """
    settings_path = os.path.join(json_dir, "settings.json")
    state_path = os.path.join(json_dir, "runtime_state.json")
    # Резервный файл слов, если Excel недоступен
    words_path = os.path.join(json_dir, "learning_words.json")

    # 1. Читаем настройки
    settings = load_json(settings_path)
    interval = int(settings.get('max_random_minutes', 60))

    # 2. Читаем состояние
    state = load_json(state_path)
    last_update_str = state.get('last_update_ts')
    
    # 3. Проверка времени
    need_update = False
    now = datetime.now()
    
    if not last_update_str or not state.get('current_words'):
        need_update = True
    else:
        try:
            last_dt = datetime.fromisoformat(last_update_str)
            delta_minutes = (now - last_dt).total_seconds() / 60
            if delta_minutes >= interval:
                need_update = True
        except:
            need_update = True

    # 4. Если время не пришло — отдаем из кэша
    if not need_update:
        return {
            'words': state.get('current_words', []),
            'wink': state.get('current_wink', "..."),
            'count': state.get('total_count', 0)
        }

    # 5. Генерация новых данных
    all_words = []
    
    # Попытка А: Читаем Excel (openpyxl)
    if os.path.exists(excel_path):
        try:
            wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
            sheet = wb.active
            rows = list(sheet.iter_rows(values_only=True))
            wb.close()
            
            grouped = {}
            for r in rows:
                if not r or len(r) < 3: continue
                eng = str(r[2]).strip()
                if not eng: continue
                
                if eng not in grouped: grouped[eng] = {'eng': eng, 'de': '', 'it': ''}
                
                lang = str(r[1]).lower() if r[1] else ""
                trans = str(r[3]).strip() if len(r) > 3 else ""
                
                if 'немецкий' in lang: grouped[eng]['de'] = trans
                elif 'итальянский' in lang: grouped[eng]['it'] = trans
            
            all_words = list(grouped.values())
        except Exception as e:
            print(f"[DEBUG] Excel Error: {e}")

    # Попытка Б: Читаем JSON (если Excel сломался или пуст)
    if not all_words:
        w_data = load_json(words_path)
        all_words = w_data.get('words', [])

    # Выборка 3 случайных слов
    final_words = random.sample(all_words, 3) if len(all_words) > 3 else all_words
    
    # Выбор Wink
    try:
        winks = Wink.query.all()
        wink_title = random.choice(winks).title if winks else "..."
    except:
        wink_title = "..."

    # Сохраняем новое состояние
    new_state = {
        'last_update_ts': now.isoformat(),
        'current_words': final_words,
        'current_wink': wink_title,
        'total_count': len(all_words)
    }
    save_json(new_state, state_path)

    return {
        'words': final_words,
        'wink': wink_title,
        'count': len(all_words)
    }