import webview
import threading
import sys
import os
from app import create_app

# Создаем приложение
app = create_app()

def start_server():
    """Функция для запуска Flask в отдельном потоке"""
    # Важно: debug=False, иначе будет два процесса
    app.run(host='127.0.0.1', port=54321, debug=False, use_reloader=False)

if __name__ == '__main__':
    # 1. Запускаем сервер Flask в фоновом режиме (Daemon thread)
    t = threading.Thread(target=start_server)
    t.daemon = True
    t.start()

    # 2. Запускаем нативное окно
    # Оно откроет наш локальный сервер
    webview.create_window(
        title='Papanda v0.5', 
        url='http://127.0.0.1:54321',
        width=1200,
        height=900,
        resizable=True,
        min_size=(800, 600)
    )
    
    # Запускаем цикл окна
    webview.start()
    
    # Когда окно закроется, программа завершится
    sys.exit()