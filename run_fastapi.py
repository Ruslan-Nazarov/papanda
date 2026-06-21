import uvicorn
import os
from dotenv import load_dotenv

# Загружаем переменные из .env, если он есть
load_dotenv()

# Импортируем threading и webbrowser для открытия браузера
import threading
import webbrowser
import time
import socket

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((host, port)) == 0

def get_free_port(start_port: int, host: str = "127.0.0.1") -> int:
    port = start_port
    while is_port_in_use(port, host):
        port += 1
    return port

def open_browser(url):
    """Открывает браузер через 1.5 секунды после запуска сервера."""
    time.sleep(1.5)
    webbrowser.open(url)

if __name__ == "__main__":
    import sys
    # Check if frozen and redirect stdout/stderr immediately to catch import errors
    # We use a hardcoded check for sys.frozen to avoid importing config
    is_frozen = getattr(sys, 'frozen', False)
    if is_frozen:
        sys.stdout = open(os.devnull, 'w')
        sys.stderr = open(os.devnull, 'w')

    # Получаем настройки из окружения или используем значения по умолчанию
    host = os.getenv("HOST", "127.0.0.1")
    try:
        start_port = int(os.getenv("PORT", 8000))
    except (ValueError, TypeError):
        start_port = 8000
        
    port = get_free_port(start_port, host)
    
    # Включаем reload только если явно указано в окружении
    # ВНИМАНИЕ: Для .exe (frozen) reload должен быть ВСЕГДА False
    from fastapi_app.config import IS_FROZEN
    reload = False if IS_FROZEN else (os.getenv("RELOAD", "True").lower() == "true")

    url = f"http://{host}:{port}"
    print("--- Запуск Papanda v0.6.3 на FastAPI ---")
    if port != start_port:
        print(f"[INFO] Порт {start_port} занят. Используется свободный порт {port}.")
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
