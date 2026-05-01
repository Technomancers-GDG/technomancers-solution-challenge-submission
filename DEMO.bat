@echo off
echo ==========================================
echo  DEMO LAUNCHER
echo  Resilient Essential Goods Coordinator
echo ==========================================
echo.
echo Starting backend server...
echo (Admin: http://localhost:8000)
echo (Driver: http://localhost:8000/driver)
echo.

:: Kill any existing process on port 8000
powershell -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: Start backend in background
start /b .venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 > backend.log 2>&1

:: Wait for startup
timeout /t 5 /nobreak >nul

:: Open browsers
start http://127.0.0.1:8000
start http://127.0.0.1:8000/driver

echo.
echo ==========================================
echo  Demo is running!
echo.
echo  Admin Dashboard: http://localhost:8000
echo  Driver Mobile:   http://localhost:8000/driver
echo  API Docs:        http://localhost:8000/docs
echo.
echo  Press Ctrl+C here to stop the server.
echo ==========================================

:: Keep window open so user can see logs
:loop
timeout /t 30 /nobreak >nul
goto loop
