@echo off
echo Starting FastAPI Dialectics app...
cd /d "%~dp0"

if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe run.py
) else (
    echo Virtual environment not found. Please create it or run 'python run.py' directly.
    pause
)
pause
