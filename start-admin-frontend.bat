@echo off
echo ==========================================
echo  Starting Admin Dashboard Frontend
echo  URL: http://localhost:5173
echo  Proxies API to: http://localhost:8000
echo ==========================================
cd /d "%~dp0\frontend"
npm run dev
