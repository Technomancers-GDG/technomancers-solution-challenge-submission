import { Panel } from "../common/UiPrimitives";

export function ForecastView({ riskForecast }) {
  return (
    <div className="view-forecast">
      <Panel title="Predictive Risk Heatmap (12h forecast)">
        <div className="heatmap-table">
          <table>
            <thead><tr><th>City</th><th>Risk Score</th><th>ETA Multiplier</th><th>Closure Risk</th><th>Confidence</th><th>Contributing Factors</th></tr></thead>
            <tbody>
              {riskForecast.map((rf, i) => (
                <tr key={i} className={`risk-row-${rf.risk > 0.6 ? "high" : rf.risk > 0.3 ? "medium" : "low"}`}>
                  <td><strong>{rf.city}</strong></td>
                  <td>{(rf.risk * 100).toFixed(1)}%</td>
                  <td>{rf.eta_multiplier.toFixed(2)}x</td>
                  <td>{(rf.closure_risk * 100).toFixed(1)}%</td>
                  <td>{(rf.confidence * 100).toFixed(0)}%</td>
                  <td>{rf.factors?.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
