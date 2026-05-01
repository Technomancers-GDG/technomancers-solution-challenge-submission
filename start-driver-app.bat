@echo off
echo ==========================================
echo  Starting Driver App
echo  URL: http://localhost:5174
echo  Proxies API to: http://localhost:8000
echo ==========================================
cd /d "%~dp0\driver-app-main"
npm run dev
