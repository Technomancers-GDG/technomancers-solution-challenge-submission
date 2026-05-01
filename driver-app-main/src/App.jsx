import { useEffect, useState } from "react";
import { DriverLogin } from "./components/DriverLogin";
import { DriverMapView } from "./components/DriverMapView";
import { Panel } from "./components/common/UiPrimitives";

const API_BASE = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_BASE_URL ?? "";

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function formatTime(isoString) {
  if (!isoString) return "-";
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return "-";
  }
}

function formatAction(action) {
  return String(action || "").replaceAll("_", " ").toUpperCase();
}

function App() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [vehicle, setVehicle] = useState(() => {
    const saved = localStorage.getItem("driver_vehicle");
    return saved ? JSON.parse(saved) : null;
  });

  const [facilities, setFacilities] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [routeTemplates, setRouteTemplates] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [wsSnapshot, setWsSnapshot] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [otherInstructions, setOtherInstructions] = useState([]);

  async function refreshAll() {
    try {
      const [facilityData, objectiveData, routeData, recData, simState] = await Promise.all([
        apiFetch("/api/facilities"),
        apiFetch("/api/objectives"),
        apiFetch("/api/routes"),
        apiFetch("/api/recommendations"),
        apiFetch("/api/dashboard").catch(() => null),
      ]);
      setFacilities(facilityData);
      setObjectives(objectiveData);
      setRouteTemplates(routeData);
      setRecommendations(recData);
      if (simState) {
        setWsSnapshot(simState);
      }
      setError("");
    } catch (fetchError) {
      setError(fetchError.message);
    }
  }

  useEffect(() => {
    refreshAll();
    const intervalId = window.setInterval(() => {
      refreshAll();
    }, 12000);
    return () => window.clearInterval(intervalId);
  }, []);

  // WebSocket for live simulation updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    
    // In production, point directly to the Cloud Run backend instead of the Vite proxy
    const backendHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
      ? window.location.host 
      : "sim-backend-1029069183045.us-central1.run.app";
      
    const socket = new WebSocket(`${protocol}://${backendHost}/ws/operations`);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "simulation_snapshot") {
          setWsSnapshot(payload.payload);
        }
      } catch {}
    };
    const ping = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send("ping");
    }, 15000);
    return () => {
      window.clearInterval(ping);
      socket.close();
    };
  }, []);

  // Fetch instructions for this driver's vehicle
  useEffect(() => {
    if (!vehicle) return;
    async function loadInstructions() {
      try {
        const recs = await apiFetch("/api/recommendations");
        setRecommendations(recs);
        const myRecs = recs.filter(
          (r) =>
            r.vehicle_id === vehicle.id &&
            r.status === "suggested" &&
            !String(r.action || "").startsWith("reroute")
        );
        setOtherInstructions(
          myRecs.map((r) => ({
            recommendation_id: r.id,
            created_at: r.created_at,
            vehicle_id: r.vehicle_id,
            vehicle_identifier: vehicle.identifier,
            objective_name: "-",
            action: r.action,
            explanation: r.explanation,
            status: r.status,
          }))
        );
      } catch (err) {
        setError(err.message);
      }
    }
    loadInstructions();
  }, [vehicle]);

  function handleLogin(loggedInVehicle) {
    setVehicle(loggedInVehicle);
    localStorage.setItem("driver_vehicle", JSON.stringify(loggedInVehicle));
    setError("");
  }

  function handleLogout() {
    setVehicle(null);
    localStorage.removeItem("driver_vehicle");
    setOtherInstructions([]);
    setWsSnapshot(null);
  }

  async function handleDecision(recommendationId, decision) {
    setDecisionLoading(true);
    try {
      await apiFetch(`/api/recommendations/${recommendationId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setMessage(`Reroute ${decision === "accept" ? "accepted" : "ignored"}.`);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setDecisionLoading(false);
    }
  }

  async function handleGenericDecision(recommendationId, decision) {
    try {
      const backendDecision = decision === "accepted" ? "accepted" : "ignored";
      await apiFetch("/api/driver/decision", {
        method: "POST",
        body: JSON.stringify({
          recommendation_id: recommendationId,
          decision: backendDecision,
          note: `Driver ${decision === "accepted" ? "accepted" : "ignored"} instruction from mobile app.`,
        }),
      });
      setMessage(`Instruction ${decision}.`);
      await refreshAll();
      // Reload instructions
      const recs = await apiFetch("/api/recommendations");
      setRecommendations(recs);
      const myRecs = recs.filter(
        (r) =>
          r.vehicle_id === vehicle.id &&
          r.status === "suggested" &&
          !String(r.action || "").startsWith("reroute")
      );
      setOtherInstructions(
        myRecs.map((r) => ({
          recommendation_id: r.id,
          created_at: r.created_at,
          vehicle_id: r.vehicle_id,
          vehicle_identifier: vehicle.identifier,
          objective_name: "-",
          action: r.action,
          explanation: r.explanation,
          status: r.status,
        }))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  // Report incident
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    city: "Chennai",
    incident_type: "road_blockage",
    severity: "0.7",
    note: "",
  });

  async function submitIncident(event) {
    event.preventDefault();
    if (!vehicle) return;
    try {
      const payload = {
        driver_profile_id: vehicle.driver_profile_id,
        vehicle_id: vehicle.id,
        city: incidentForm.city,
        incident_type: incidentForm.incident_type,
        severity: Number(incidentForm.severity),
        note: incidentForm.note,
      };
      await apiFetch("/api/driver/incidents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage("Incident reported successfully.");
      setIncidentForm((c) => ({ ...c, note: "" }));
      setShowIncidentForm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!vehicle) {
    return <DriverLogin onLogin={handleLogin} error={error} setError={setError} />;
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Driver Portal</p>
          <h1>Driver Dashboard</h1>
          <p className="hero-copy">
            Vehicle {vehicle.identifier} &middot; {vehicle.vehicle_type}
          </p>
        </div>
        <button type="button" onClick={handleLogout}>
          Sign Out
        </button>
      </header>

      {message ? <div className="banner success">{message}</div> : null}
      {error ? <div className="banner error">{error}</div> : null}

      <main className="view-stack">
        <DriverMapView
          vehicle={vehicle}
          facilities={facilities}
          objectives={objectives}
          routeTemplates={routeTemplates}
          recommendations={recommendations}
          wsSnapshot={wsSnapshot}
          onDecision={handleDecision}
          decisionLoading={decisionLoading}
        />

        <Panel title={`Other Instructions (${otherInstructions.length})`}>
          {otherInstructions.length === 0 ? (
            <div className="empty">No additional instructions pending.</div>
          ) : (
            <div className="instructions-stack">
              {otherInstructions.map((inst) => (
                <div key={inst.recommendation_id} className="instruction-card">
                  <div className="instruction-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div>
                      <strong>{inst.vehicle_identifier}</strong>
                      <span style={{ color: "var(--muted)", marginLeft: "8px", fontSize: "0.82rem" }}>
                        {formatAction(inst.action)}
                      </span>
                    </div>
                    <small>{formatTime(inst.created_at)}</small>
                  </div>
                  <p style={{ margin: "0 0 10px" }}>{inst.explanation}</p>
                  <div className="instruction-actions">
                    <button type="button" onClick={() => handleGenericDecision(inst.recommendation_id, "accepted")}>
                      Accept
                    </button>
                    <button type="button" className="danger" onClick={() => handleGenericDecision(inst.recommendation_id, "ignored")}>
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Report Incident">
          {!showIncidentForm ? (
            <button type="button" onClick={() => setShowIncidentForm(true)}>
              Open Incident Form
            </button>
          ) : (
            <form className="incident-form" onSubmit={submitIncident}>
              <label className="field">
                <span>City</span>
                <input
                  value={incidentForm.city}
                  onChange={(e) => setIncidentForm({ ...incidentForm, city: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Incident Type</span>
                <select
                  value={incidentForm.incident_type}
                  onChange={(e) => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}
                >
                  <option value="road_blockage">Road Blockage</option>
                  <option value="strike">Strike</option>
                  <option value="delay">Delay</option>
                  <option value="port_congestion">Port Congestion</option>
                  <option value="weather">Weather</option>
                </select>
              </label>
              <label className="field">
                <span>Severity (0-1)</span>
                <input
                  value={incidentForm.severity}
                  onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Note</span>
                <input
                  value={incidentForm.note}
                  onChange={(e) => setIncidentForm({ ...incidentForm, note: e.target.value })}
                />
              </label>
              <div className="action-row">
                <button type="submit">Submit Incident</button>
                <button type="button" onClick={() => setShowIncidentForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Panel>
      </main>
    </div>
  );
}

export default App;
