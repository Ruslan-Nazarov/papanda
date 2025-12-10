import sys
import os
import threading
import webbrowser
from threading import Timer
from app import create_app
from config import Config

# Исправляем путь, если запущен EXE
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))

app = create_app()

# Функция для запуска сервера в потоке (для EXE)
def start_server_frozen():
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

# Функция для открытия браузера (для разработки)
def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000")

if __name__ == '__main__':
    # ПРОВЕРКА: Мы в EXE или в скрипте?
    is_frozen = getattr(sys, 'frozen', False)

    if is_frozen:
        # --- РЕЖИМ EXE: ЗАПУСКАЕМ ОКНО (PyWebview) ---
        import webview
        
        # 1. Запускаем Flask в отдельном потоке
        t = threading.Thread(target=start_server_frozen)
        t.daemon = True
        t.start()

        # 2. Открываем нативное окно
        webview.create_window(
            title="Papanda", 
            url="http://127.0.0.1:5000",
            width=1200,
            height=800,
            resizable=True,
            min_size=(800, 600)
        )
        webview.start()

    else:
        # --- РЕЖИМ РАЗРАБОТКИ: ЗАПУСКАЕМ БРАУЗЕР ---
        # Открываем браузер через 1.5 секунды после старта
        Timer(1.5, open_browser).start()
        
        # Запускаем Flask в главном потоке (чтобы видеть логи в консоли)
        app.run(debug=Config.DEBUG_MODE, use_reloader=False, port=5000)