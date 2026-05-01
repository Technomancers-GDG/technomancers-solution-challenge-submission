#  LogiSight: Resilient Essential Goods Coordinator

Welcome to LogiSight! This is a full-stack open-source platform designed to orchestrate and simulate essential supply chain operations across India. By making the supply chain "disruption-aware," this platform helps optimize logistics, reroute vehicles automatically during crises, and measure real-world impact.

##  What's Inside?

We’ve split the platform into a powerful backend and a beautiful real-time frontend:

- **The Brains (FastAPI Backend):** Handles live simulation, routing logic, event ingestion (like weather or news disruptions), and keeps track of impact metrics using SQLite (or your preferred database).
- **The Control Center (React + Vite Frontend):** A stunning, map-driven command interface. It gives operator a real-time view of the logistics network, fleet status, and ongoing scenarios. 
- **Mobility:** Features a driver mobile loop for live incident reporting, accepting reroutes, and checking active instructions.

##  Key Features

* **Network Mastery:** Easily manage facilities, ports, routes, vehicles, and drivers.
* **Live Simulation:** Run time-lapsed simulations—start, pause, or speed things up to see how your network reacts to disruptions.
* **Smart Decision Engine:** Automatically reroute vehicles, pause dispatches, or adjust delivery priorities based on real-time data.
* **Resilient Routing:** Powered by OSRM with automatic fallback estimates when the primary router is down.
* **Real-World Disruptions:** Integrates local news and weather data to simulate realistic logistical challenges, and even supports manual incident injections.
* **Sustainability & Impact Metrics:** Track how many stockouts were prevented and measure critical deliveries saved in an SDG-style dashboard.

##  Getting Started

### 1. Fire up the Backend
First, let's get the FastAPI server running. Ensure you have Python installed.

```bash
# Set up a virtual environment and install dependencies
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # On Windows (use source .venv/bin/activate on Mac/Linux)
pip install -r requirements.txt

# Start the server
python -m uvicorn main:app --reload
```
You can now access the API at `http://127.0.0.1:8000/api/health` and the Swagger Docs at `http://127.0.0.1:8000/docs`.

### 2. Launch the Control Center
Open up a new terminal window to start the React frontend:

```bash
cd frontend
npm install
npm run dev
```
Head over to `http://localhost:5173` to see the control center in action!

*(Note: The Vite config automatically proxies `/api` and `/ws` to your FastAPI server.)*

###  Serving for Production
Want to bundle the frontend and serve it directly from the backend?

```bash
cd frontend
npm run build
cd ..
python -m uvicorn main:app --reload
```
Now, simply visit `http://127.0.0.1:8000`. 

## ⚙️ Configuration

Tweak how the platform runs by setting environment variables in `config.py`. Here are a few notable ones:

| Environment Variable | What it does | Default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy database connection string | `sqlite:///./supply_chain.db` |
| `SIMULATION_START_DATE` | Date when the simulation begins | `2026-01-01` |
| `SIMULATION_SPEED` | Time multiplier for the live sim | `120.0` |

### Demo Data & Seeding
Don't want to start with an empty map? No problem! On startup, if the database is empty, the system automatically runs `seed_data.py` to populate a demo environment featuring 86 facilities, a bustling fleet, and preset disruption scenarios across India. It also auto-ingests sample weather and news data.

