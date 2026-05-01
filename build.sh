#!/usr/bin/env bash
set -euo pipefail

echo "========================================"
echo "Build script for Render deployment"
echo "========================================"

# 1. Install Python dependencies
echo "[1/5] Installing Python dependencies..."
pip install -r requirements.txt

# 2. Install Node.js and npm if not available (Render's Python runtime may not have them by default)
# Note: Render's newer Python runtimes include Node. If not, uncomment the following:
# apt-get update -qq && apt-get install -y -qq nodejs npm

echo "[2/5] Node version: $(node --version)"
echo "         NPM version: $(npm --version)"

# 3. Build Admin Frontend
echo "[3/5] Building admin frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# 4. Build Driver Mobile App
echo "[4/5] Building driver mobile app..."
cd driver-app-main
npm install --legacy-peer-deps
npm run build
cd ..

# 5. Verify dist folders exist
echo "[5/5] Verifying build outputs..."
if [ -d "frontend/dist" ]; then
    echo "  ✓ frontend/dist exists"
else
    echo "  ✗ frontend/dist missing!"
    exit 1
fi

if [ -d "driver-app-main/dist" ]; then
    echo "  ✓ driver-app-main/dist exists"
else
    echo "  ✗ driver-app-main/dist missing!"
    exit 1
fi

echo ""
echo "========================================"
echo "Build completed successfully!"
echo "========================================"
