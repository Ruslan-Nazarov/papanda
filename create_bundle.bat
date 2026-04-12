@echo off
echo === Papanda Executable Bundler ===
echo.

echo Cleaning up previous builds...
rmdir /s /q build dist 2>nul
del /q Papanda.spec 2>nul

echo.
echo Running PyInstaller...
echo This may take a few minutes depending on your system.
echo.

:: Команда PyInstaller:
:: --onefile: собрать всё в один .exe
:: --noconsole: не показывать окно консоли при запуске (фоновый режим)
:: --hidden-import: явно указываем библиотеки, которые PyInstaller может не заметить
:: --exclude-module: исключаем огромные библиотеки, которые могут тянуться случайно
:: --add-data: включить папки шаблонов и статики (путь_источник;путь_внутри_exe)
:: --name: имя итогового файла
pyinstaller --onefile --noconsole ^
    --hidden-import aiosqlite ^
    --hidden-import jinja2 ^
    --hidden-import email_validator ^
    --hidden-import passlib.handlers.bcrypt ^
    --exclude-module tkinter ^
    --exclude-module tcl ^
    --exclude-module tk ^
    --exclude-module unittest ^
    --exclude-module pydoc ^
    --exclude-module lib2to3 ^
    --exclude-module tensorflow ^
    --exclude-module pandas ^
    --exclude-module pyarrow ^
    --exclude-module nltk ^
    --exclude-module numpy ^
    --exclude-module scipy ^
    --exclude-module sklearn ^
    --exclude-module torch ^
    --exclude-module torchvision ^
    --exclude-module IPython ^
    --exclude-module notebook ^
    --exclude-module matplotlib ^
    --exclude-module PIL ^
    --exclude-module PyQt5 ^
    --exclude-module PyQt6 ^
    --exclude-module PySide2 ^
    --exclude-module PySide6 ^
    --add-data "fastapi_app/templates;fastapi_app/templates" ^
    --add-data "fastapi_app/static;fastapi_app/static" ^
    --name Papanda ^
    run_fastapi.py

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Your executable is ready in the 'dist' folder!
    echo Filename: dist\Papanda.exe
) else (
    echo [ERROR] Build failed. Make sure you have 'pyinstaller' installed: pip install pyinstaller
)
echo.
pause
