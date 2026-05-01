import { Panel } from "../common/UiPrimitives";

export function InventoryView({ inventoryForecast, proactiveDispatches, facilityLookup }) {
  return (
    <div className="view-inventory">
      <div className="inventory-grid">
        <Panel title="Demand Forecasts">
          <div className="forecast-list">
            {inventoryForecast.map((f, i) => (
              <div className="forecast-card" key={i}>
                <strong>{f.facility_name}</strong>
                <span className={`trend-badge ${f.trend}`}>{f.trend}</span>
                <div className="forecast-stats">
                  <div>Demand: {f.predicted_demand_units} units</div>
                  <div>Safety Stock: {f.safety_stock_units}</div>
                  <div>Reorder Point: {f.reorder_point}</div>
                  <div>Confidence: {(f.confidence * 100).toFixed(0)}%</div>
                </div>
                {f.recommended_dispatch_count > 0 && (
                  <div className="dispatch-alert">
                    Recommend {f.recommended_dispatch_count} dispatch{f.recommended_dispatch_count > 1 ? "es" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Proactive Dispatch Recommendations">
          {proactiveDispatches.length === 0 ? <div className="empty">All facilities adequately stocked.</div> : (
            <div className="proactive-list">
              {proactiveDispatches.map((d, i) => (
                <div className={`proactive-card urgency-${d.urgency}`} key={i}>
                  <div className="proactive-header">
                    <strong>{facilityLookup[d.destination_facility_id]?.name ?? "Facility"}</strong>
                    <span className={`urgency-tag ${d.urgency}`}>{d.urgency}</span>
                  </div>
                  <p>{d.reason}</p>
                  <div className="proactive-meta">{d.recommended_units} units • ETA {d.eta_hours}h</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
