import { Panel, MetricCard, ProgressBar } from "../common/UiPrimitives";

export function LiveOpsView({ metrics, deferredVehicles, objectiveLookup }) {
  return (
    <div className="view-liveops">
      <div className="ops-metrics">
        <MetricCard label="Active Trucks" value={metrics?.active_trucks ?? 0} tone="blue" />
        <MetricCard label="Queued" value={metrics?.queued_trucks ?? 0} tone="amber" />
        <MetricCard label="Reroutes" value={metrics?.reroute_count ?? 0} tone="purple" />
        <MetricCard label="Idle Prevented" value={`${(metrics?.idle_minutes_prevented ?? 0).toFixed(0)} min`} tone="green" />
      </div>
      <Panel title="Vehicle Progress">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vehicle</th><th>Status</th><th>Objective</th><th>Progress</th><th>Payload</th><th>ETA</th><th>AI Action</th></tr></thead>
            <tbody>
              {deferredVehicles.slice(0, 30).map((v) => (
                <tr key={v.vehicle_id}>
                  <td>{v.identifier}</td>
                  <td><span className={`status-badge ${v.status}`}>{v.status}</span></td>
                  <td>{objectiveLookup[v.objective_id]?.name ?? "-"}</td>
                  <td><ProgressBar value={v.progress_pct} compact /></td>
                  <td>{v.payload_units}</td>
                  <td>{v.eta ? v.eta.slice(0, 19).replace("T", " ") : "-"}</td>
                  <td>{v.recommendation_action ?? "continue"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
