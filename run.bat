@echo off
echo Starting FastAPI Dialectics app...
cd /d "%~dp0"

if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe run.py
) else (
    echo .venv not found. Follow README.md to install the project.
    pause
)
pause
