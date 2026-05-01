import { useState } from "react";
import { Panel } from "./common/UiPrimitives";

export function DriverLogin({ onLogin, error, setError }) {
  const [vehicleId, setVehicleId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!vehicleId.trim()) {
      setError("Please enter a vehicle identifier.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/vehicles`);
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      const vehicles = await response.json();
      const match = vehicles.find(
        (v) =>
          String(v.identifier).toLowerCase() === vehicleId.trim().toLowerCase() ||
          String(v.id) === vehicleId.trim()
      );
      if (!match) {
        setError("Vehicle not found. Please check your identifier.");
        return;
      }
      onLogin(match);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Driver Portal</p>
          <h1>Driver Login</h1>
          <p className="hero-copy">Enter your vehicle identifier to access your route and instructions.</p>
        </div>
      </header>
      <main className="view-stack">
        <Panel title="Sign In">
          <form className="incident-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Vehicle Identifier</span>
              <input
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                placeholder="e.g., OPS-0001"
                required
              />
            </label>
            <div className="action-row">
              <button type="submit" disabled={loading}>
                {loading ? "Checking..." : "Sign In"}
              </button>
            </div>
          </form>
        </Panel>
      </main>
    </div>
  );
}
