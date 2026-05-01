#  Driver App: Setup Guide

Welcome to the **Driver App**! This is a dedicated React + Vite companion application built specifically to give drivers a mobile-friendly view of their operations. Running independently from the main administrative dashboard, this app allows drivers on the road to:

-  **Review Rerouting Requests:** Instantly see dispatcher instructions.
-  **Respond to Actions:** Accept or reject dispatch decisions on the fly.
-  **Report Incidents:** Flag real-world disruptions (like traffic or weather events) directly back to headquarters.

##  How it Fits Together

Here’s the architecture of the platform at a glance:

| What is it?            | Port | Description                      |
|--------------------|------|----------------------------------|
| **Backend API**        | `8000` | The core FastAPI engine    |
| **Admin Dashboard**    | `5173` | Main Web UI (Vite + React)     |

*Note: The Driver App is super smart and proxies all its API and WebSocket calls directly to the FastAPI server running on `localhost:8000`. You won't have to worry about CORS!*

##  Prerequisites

Before you hit the road, make sure you have:
- **Node.js** (v18+ recommended)
- **Python** (3.10+ recommended)
- All the backend dependencies installed via `pip install -r requirements.txt`.

---

##  Quick Start

We’ve provided a few handy batch files so you don't have to memorize commands.

### The Fast Way (Using Scripts)

1. **Spin up the Backend** (Terminal 1):
   ```bat
   start-backend.bat
   ```

2. **Boot up the Driver App** (Terminal 2):
   ```bat
   start-driver-app.bat
   ```

3. **Want to see the Admin view too?** (Terminal 3):
   ```bat
   start-admin-frontend.bat
   ```

### The Manual Way

If you prefer doing it yourself:

**Start backend:**
```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Start the driver app:**
```bash
cd driver-app-main
npm run dev
```

---

##  App Configuration

Under the hood, we use an `.env` file located in `driver-app-main/.env`. Here's what's inside:

| Variable                 | Default               | What it does                               |
|--------------------------|-----------------------|--------------------------------------------|
| `VITE_API_BASE_URL`      | *(empty)*             | Left blank on purpose! Vite happily proxies this to avoid CORS. |
| `VITE_WS_BASE_URL`       | `ws://localhost:8000` | Points to the backend WebSocket stream.    |
| `VITE_POLLING_INTERVAL_MS`| `12000`              | Driver dashboard data refresh rate.      |

##  Troubleshooting

Having trouble getting off the starting line? Here are a few tips:

* **Wait, the app won't start?** Make sure you ran `npm install` inside the `driver-app-main` folder.
* **Getting "Failed to Fetch" errors?** The app can't find your backend! Make sure FastAPI is running on `127.0.0.1:8000`. You can double check by opening `http://localhost:8000/api/health` in your browser.
* **Backend refusing to start?** Check if you're inside your Python virtual environment and successfully installed the `requirements.txt`.

##  What's Next?

1. Start everything up using the steps above.
2. Open `http://localhost:5174` in your mobile device or browser.
3. Select any driver from the list.
4. Try reporting a traffic incident and watch it pop up on the Admin Dashboard map!
