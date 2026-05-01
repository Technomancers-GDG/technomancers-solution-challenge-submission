@echo off
echo ==========================================
echo  Starting Backend Server
echo  Backend URL: http://localhost:8000
echo  API Docs:    http://localhost:8000/docs
echo ==========================================
cd /d "%~dp0"
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
