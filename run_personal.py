"""Papanda Personal: a local server with a small launcher window."""
import argparse
import json
import os
from pathlib import Path
import signal
import socket
import sys
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--headless', action='store_true')
    parser.add_argument('--data-dir', type=Path)
    parser.add_argument('--port', type=int, default=8090)
    args = parser.parse_args()
    from personal_runtime import configure
    directory = configure(args.data_dir)
    # Windowed executables have no stdout/stderr; logging still needs streams.
    log = (directory / 'personal.log').open('a', encoding='utf-8', buffering=1)
    if sys.stdout is None:
        sys.stdout = log
    if sys.stderr is None:
        sys.stderr = log
    import uvicorn
    from fastapi_app.observability import LOG_CONFIG
    try:
        from fastapi_app.main import app
    except Exception:
        import traceback
        traceback.print_exc(file=log)
        return 1

    # Hold a process-wide lock so two launchers cannot write the same personal DB.
    lock = (directory / 'personal.lock').open('a+b')
    try:
        if os.name == 'nt':
            import msvcrt
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        lock.close()
        record = directory / 'instance.json'
        if record.exists() and not args.headless:
            url = json.loads(record.read_text())['url']
            from urllib.parse import urlsplit
            parsed = urlsplit(url)
            if parsed.scheme == 'http' and parsed.hostname == '127.0.0.1':
                webbrowser.open(url)
        return 1

    listener = socket.socket()
    try:
        listener.bind(('127.0.0.1', args.port))
    except OSError:
        listener.bind(('127.0.0.1', 0))
    listener.listen(128)
    port = listener.getsockname()[1]
    url = f'http://127.0.0.1:{port}'
    server = uvicorn.Server(uvicorn.Config(app, host='127.0.0.1',
        port=port, log_config=LOG_CONFIG, proxy_headers=False, access_log=False,
        loop='asyncio', http='h11', timeout_graceful_shutdown=10))
    thread = threading.Thread(target=lambda: server.run(sockets=[listener]), daemon=True)
    thread.start()
    record = directory / 'instance.json'
    record.write_text(json.dumps({'url': url, 'pid': os.getpid()}), encoding='utf-8')
    try:
        if args.headless:
            def stop(*_):
                server.should_exit = True
            signal.signal(signal.SIGTERM, stop)
            signal.signal(signal.SIGINT, stop)
            while thread.is_alive():
                thread.join(.25)
        else:
            import tkinter as tk
            from tkinter import messagebox
            window = tk.Tk()
            window.title('Papanda Personal')
            window.geometry('490x300')
            window.resizable(False, False)
            try:
                window.iconbitmap(str(Path(__file__).parent / 'fastapi_app/static/logo.ico'))
            except tk.TclError:
                pass
            tk.Label(window, text='Papanda Personal', font=('Segoe UI', 18, 'bold')).pack(pady=(22, 10))
            status = tk.StringVar(value='Запуск…')
            tk.Label(window, textvariable=status, font=('Segoe UI', 10)).pack(pady=6)
            tk.Button(window, text='Открыть конспекты', width=28,
                      command=lambda: webbrowser.open(url)).pack(pady=4)
            tk.Button(window, text='Настройки ИИ — свой ключ', width=28,
                      command=lambda: webbrowser.open(url + '/personal/settings')).pack(pady=4)
            tk.Button(window, text='Открыть папку данных', width=28,
                      command=lambda: os.startfile(directory) if os.name == 'nt' else webbrowser.open(directory.as_uri())).pack(pady=4)
            tk.Label(window, text='Закройте это окно, чтобы остановить Papanda.', font=('Segoe UI', 9)).pack(pady=14)
            def ready():
                if server.started:
                    status.set('Работает на этом компьютере')
                    webbrowser.open(url)
                elif thread.is_alive():
                    window.after(200, ready)
                else:
                    messagebox.showerror('Papanda Personal', f'Не удалось запустить приложение.\nЖурнал: {directory / "personal.log"}')
                    window.destroy()
            window.after(200, ready)
            window.mainloop()
    finally:
        server.should_exit = True
        thread.join(12)
        listener.close()
        record.unlink(missing_ok=True)
        lock.close()
    return 0 if server.started else 1


if __name__ == '__main__':
    # Frozen PDF subprocesses re-enter this executable without starting the app.
    if len(sys.argv) > 1 and sys.argv[1] == '--pdf-worker':
        import runpy
        if getattr(sys, 'frozen', False) and os.name == 'nt':
            # PyInstaller windowed mode leaves sys.std* unset, even with pipe handles.
            import ctypes
            import msvcrt
            kernel = ctypes.WinDLL('kernel32', use_last_error=True)
            kernel.GetStdHandle.restype = ctypes.c_void_p
            if sys.stdin is None:
                sys.stdin = os.fdopen(msvcrt.open_osfhandle(kernel.GetStdHandle(-10), os.O_RDONLY), 'rb')
                # pdf_worker uses .buffer just like a normal Python text stream.
                import io
                sys.stdin = io.TextIOWrapper(sys.stdin, encoding='utf-8')
            if sys.stdout is None:
                import io
                sys.stdout = io.TextIOWrapper(os.fdopen(
                    msvcrt.open_osfhandle(kernel.GetStdHandle(-11), os.O_WRONLY), 'wb'), encoding='utf-8')
        sys.argv.pop(1)
        runpy.run_module('fastapi_app.services.pdf_worker', run_name='__main__')
    else:
        raise SystemExit(main())
