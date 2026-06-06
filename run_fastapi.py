import uvicorn
import os
from dotenv import load_dotenv

# Загружаем переменные из .env, если он есть
load_dotenv()

# Импортируем threading и webbrowser для открытия браузера
import threading
import webbrowser
import time

def open_browser(url):
    """Открывает браузер через 1.5 секунды после запуска сервера."""
    time.sleep(1.5)
    webbrowser.open(url)

if __name__ == "__main__":
    # Получаем настройки из окружения или используем значения по умолчанию
    host = os.getenv("HOST", "127.0.0.1")
    try:
        port = int(os.getenv("PORT", 8000))
    except (ValueError, TypeError):
        port = 8000
    
    # Включаем reload только если явно указано в окружении
    # ВНИМАНИЕ: Для .exe (frozen) reload должен быть ВСЕГДА False
    from fastapi_app.config import IS_FROZEN
    
    if IS_FROZEN:
        import sys
        # В режиме без консоли stdout/stderr равны None, что ломает uvicorn (isatty)
        # Мы перенаправляем их в devnull
        sys.stdout = open(os.devnull, 'w')
        sys.stderr = open(os.devnull, 'w')
        reload = False
    else:
        reload = os.getenv("RELOAD", "True").lower() == "true"

    url = f"http://{host}:{port}"
    print("--- Запуск Papanda на FastAPI ---")
    print(f"Приложение будет доступно по адресу: {url}")
    print(f"Документация API (Swagger): {url}/docs")
    print(f"Авто-перезагрузка: {'ВКЛ' if reload else 'ВЫКЛ'}")
    print("---------------------------------")
    
    # Запускаем поток для открытия браузера
    threading.Thread(target=open_browser, args=(url,), daemon=True).start()

    # Запускаем сервер
    # Используем объект напрямую или строку, но для PyInstaller лучше импортировать app
    if IS_FROZEN:
        from fastapi_app.main import app
        uvicorn.run(app, host=host, port=port)
    else:
        uvicorn.run("fastapi_app.main:app", host=host, port=port, reload=reload)
