@echo off
setlocal
title Papanda (FastAPI Edition)

echo ==================================================
echo   🚀 Starting Papanda...
echo ==================================================

:: Check if python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python.
    pause
    exit /b
)

:: Check if requirements are installed (optional but helpful)
:: You can uncomment the next line to auto-install dependencies on startup
:: pip install -r requirements.txt

:: Run the FastAPI application
python run_fastapi.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Application crashed or stopped with error.
    pause
)

endlocal
