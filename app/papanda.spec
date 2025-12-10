# -*- mode: python ; coding: utf-8 -*-
import os
import sys

# Определяем текущую директорию (корень проекта)
BASE_DIR = os.getcwd()

block_cipher = None

a = Analysis(
    ['run.py'],  # Ваш главный скрипт
    pathex=[BASE_DIR],
    binaries=[],
    datas=[
        # 1. База данных (в папку instance)
        (os.path.join(BASE_DIR, 'instance', 'papanda.db'), 'instance'),
        
        # 2. Excel файл (в app/excel)
        (os.path.join(BASE_DIR, 'app', 'excel', 'translate.xlsx'), 'app/excel'),
        
        # 3. JSON файлы (вся папка app/json в app/json)
        (os.path.join(BASE_DIR, 'app', 'json'), 'app/json'),
        
        # 4. Статические файлы (CSS, JS, Images)
        (os.path.join(BASE_DIR, 'app', 'static'), 'app/static'),
        
        # 5. HTML Шаблоны
        (os.path.join(BASE_DIR, 'app', 'templates'), 'app/templates')
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'PySide2'],  # Исключаем лишние GUI-библиотеки для уменьшения размера
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='papanda',  # Имя вашего exe файла
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,        # Сжатие (если установлен UPX, иначе будет игнорироваться)
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,    # True = показывать черное окно консоли (полезно для отладки), False = скрыть
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(BASE_DIR, 'app_icon.ico'), # Если у вас есть иконка, раскомментируйте
)