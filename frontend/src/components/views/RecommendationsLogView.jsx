import { useMemo, useState } from "react";
import { Input, Panel, Select } from "../common/UiPrimitives";

function getActionIcon(action) {
  const actionLower = action?.toLowerCase() || "";
  if (actionLower.includes("reroute")) return "📍";
  if (actionLower.includes("wait")) return "⏸";
  if (actionLower.includes("defer")) return "⏭";
  if (actionLower.includes("continue")) return "→";
  return "✓";
}

function getOutcomeTone(outcome) {
  const outcomeLower = outcome?.toLowerCase() || "";
  if (outcomeLower.includes("on time") || outcomeLower.includes("faster")) return "good";
  if (outcomeLower.includes("delayed") || outcomeLower.includes("despite")) return "warning";
  return "neutral";
}

function formatRelativeTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  } catch {
    return "-";
  }
}

export function RecommendationsLogView({
  recommendations = [],
  vehicles = [],
  decisions = [],
  driverLookup = {},
}) {
  const [selectedRecId, setSelectedRecId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [sortBy, setSortBy] = useState("timestamp");

  // Extract unique vehicles
  const uniqueVehicles = useMemo(() => {
    const vehicleSet = new Set();
    recommendations.forEach((rec) => {
      const vehicle = vehicles.find((v) => v.id === rec.vehicle_id);
      if (vehicle) vehicleSet.add(vehicle.identifier);
    });
    return Array.from(vehicleSet).sort();
  }, [recommendations, vehicles]);

  // Get decision for a recommendation
  const getDecision = (recId) => {
    return decisions.find((d) => d.recommendation_id === recId);
  };

  // Filter and sort recommendations
  const filteredRecs = useMemo(() => {
    let filtered = [...recommendations];

    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "pending") {
        filtered = filtered.filter((r) => !getDecision(r.id));
      } else {
        const decision = getDecision(filtered[0]?.id);
        if (filterStatus === "accepted") {
          filtered = filtered.filter((r) => {
            const d = getDecision(r.id);
            return d && d.decision === "accepted";
          });
        } else if (filterStatus === "ignored") {
          filtered = filtered.filter((r) => {
            const d = getDecision(r.id);
            return d && d.decision === "ignored";
          });
        }
      }
    }

    // Action filter
    if (filterAction !== "all") {
      filtered = filtered.filter((r) => r.action === filterAction);
    }

    // Vehicle filter
    if (filterVehicle) {
      filtered = filtered.filter((r) => {
        const vehicle = vehicles.find((v) => v.id === r.vehicle_id);
        return vehicle && vehicle.identifier.toLowerCase().includes(filterVehicle.toLowerCase());
      });
    }

    // Confidence filter
    if (filterConfidence !== "all") {
      const confNum = parseFloat(filterConfidence);
      filtered = filtered.filter((r) => {
        const conf = r.confidence ?? 0.5;
        return conf >= confNum && conf < confNum + 0.2;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "timestamp") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === "confidence") {
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      } else if (sortBy === "improvement") {
        const improvementA = (a.improvement_value ?? 0) - (a.baseline_cost ?? 0);
        const improvementB = (b.improvement_value ?? 0) - (b.baseline_cost ?? 0);
        return improvementB - improvementA;
      }
      return 0;
    });

    return filtered;
  }, [recommendations, vehicles, decisions, filterStatus, filterAction, filterVehicle, filterConfidence, sortBy]);

  const selectedRec = filteredRecs.find((r) => r.id === selectedRecId);

  return (
    <section className="recommendations-log-layout">
      {/* Filters */}
      <Panel title="Filters & Sort">
        <div className="filter-row">
          <Select
            label="Status"
            value={filterStatus}
            options={[
              ["all", "All Statuses"],
              ["pending", "Pending"],
              ["accepted", "Accepted"],
              ["ignored", "Ignored"],
            ]}
            onChange={setFilterStatus}
          />

          <Select
            label="Action Type"
            value={filterAction}
            options={[
              ["all", "All Actions"],
              ["reroute", "📍 Reroute"],
              ["wait", "⏸ Wait"],
              ["defer", "⏭ Defer"],
              ["continue", "→ Continue"],
            ]}
            onChange={setFilterAction}
          />

          <Input
            label="Vehicle"
            value={filterVehicle}
            onChange={setFilterVehicle}
            placeholder="Filter by vehicle..."
          />

          <Select
            label="Confidence"
            value={filterConfidence}
            options={[
              ["all", "All Confidences"],
              ["0.8", "🟢 High (80%+)"],
              ["0.6", "🟡 Medium (60-80%)"],
              ["0", "🔴 Low (0-60%)"],
            ]}
            onChange={setFilterConfidence}
          />

          <Select
            label="Sort By"
            value={sortBy}
            options={[
              ["timestamp", "Latest First"],
              ["confidence", "Highest Confidence"],
              ["improvement", "Best Improvement"],
            ]}
            onChange={setSortBy}
          />
        </div>

        <div className="filter-info">
          Showing {filteredRecs.length} of {recommendations.length} recommendations
        </div>
      </Panel>

      {/* Recommendations List */}
      <Panel title={`Recommendations (${filteredRecs.length})`}>
        {filteredRecs.length === 0 ? (
          <div className="empty">No recommendations match your filters.</div>
        ) : (
          <div className="recommendations-table">
            {/* Desktop Table View */}
            <div className="table-wrapper">
              <table className="recommendations-table-el">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Action</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecs.map((rec) => {
                    const vehicle = vehicles.find((v) => v.id === rec.vehicle_id);
                    const driver = driverLookup[rec.driver_id];
                    const decision = getDecision(rec.id);
                    const isSelected = rec.id === selectedRecId;
                    const improvement = rec.improvement_value - rec.baseline_cost;
                    const improvementPct =
                      rec.baseline_cost > 0 ? ((improvement / rec.baseline_cost) * 100).toFixed(0) : 0;

                    return (
                      <tr
                        key={rec.id}
                        className={`rec-row ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedRecId(isSelected ? null : rec.id)}
                      >
                        <td className="cell-time">{formatRelativeTime(rec.created_at)}</td>
                        <td className="cell-vehicle">{vehicle?.identifier || "Unknown"}</td>
                        <td className="cell-driver">{driver?.name || "Unknown"}</td>
                        <td className="cell-action">
                          <span className="action-badge">
                            {getActionIcon(rec.action)} {rec.action.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="cell-confidence">
                          <div className="confidence-bar">
                            <div
                              className="confidence-fill"
                              style={{
                                width: `${((rec.confidence ?? 0) * 100).toFixed(0)}%`,
                              }}
                            />
                          </div>
                          {Math.round((rec.confidence ?? 0) * 100)}%
                        </td>
                        <td className="cell-status">
                          {!decision ? (
                            <span className="status-badge pending">⏳ Pending</span>
                          ) : decision.decision === "accepted" ? (
                            <span className="status-badge accepted">✓ Accepted</span>
                          ) : (
                            <span className="status-badge ignored">✕ Ignored</span>
                          )}
                        </td>
                        <td className={`cell-improvement ${improvement >= 0 ? "positive" : "negative"}`}>
                          {improvement >= 0 ? "+" : ""}
                          {improvement.toFixed(1)} ({improvementPct}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Detail Panel */}
            {selectedRec && (
              <div className="recommendation-detail-panel">
                <div className="detail-header">
                  <h3>Recommendation Detail</h3>
                  <button
                    className="close-btn"
                    onClick={() => setSelectedRecId(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="detail-body">
                  {/* Top Section: Basic Info */}
                  <div className="detail-section">
                    <div className="section-grid">
                      <div className="info-item">
                        <span className="label">Vehicle</span>
                        <span className="value vehicle-id">
                          {vehicles.find((v) => v.id === selectedRec.vehicle_id)?.identifier}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="label">Driver</span>
                        <span className="value">
                          {driverLookup[selectedRec.driver_id]?.name || "Unknown"}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="label">Timestamp</span>
                        <span className="value">
                          {new Date(selectedRec.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="label">Confidence</span>
                        <span className="value conf-badge">
                          {Math.round((selectedRec.confidence ?? 0) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Section */}
                  <div className="detail-section">
                    <h4>Recommendation</h4>
                    <div className="rec-box">
                      <div className="rec-action">
                        <span className="icon">{getActionIcon(selectedRec.action)}</span>
                        <span className="action-name">
                          {selectedRec.action.replaceAll("_", " ").toUpperCase()}
                        </span>
                      </div>
                      {selectedRec.destination_facility_name && (
                        <p className="rec-destination">
                          <strong>Suggested Destination:</strong> {selectedRec.destination_facility_name}
                        </p>
                      )}
                      <p className="rec-explanation">{selectedRec.explanation}</p>
                    </div>
                  </div>

                  {/* Explanation Breakdown */}
                  {selectedRec.score_breakdown && (
                    <div className="detail-section">
                      <h4>Confidence Breakdown</h4>
                      <div className="breakdown-list">
                        {typeof selectedRec.score_breakdown === "string" ? (
                          <p>{selectedRec.score_breakdown}</p>
                        ) : Array.isArray(selectedRec.score_breakdown) ? (
                          selectedRec.score_breakdown.map((factor, idx) => (
                            <div key={idx} className="breakdown-item">
                              <p>{factor}</p>
                            </div>
                          ))
                        ) : typeof selectedRec.score_breakdown === "object" ? (
                          Object.entries(selectedRec.score_breakdown).map(([key, value], idx) => (
                            <div key={idx} className="breakdown-item">
                              <p><strong>{key}:</strong> {value}</p>
                            </div>
                          ))
                        ) : (
                          <p>No breakdown available</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cost Analysis */}
                  <div className="detail-section">
                    <h4>Cost Analysis</h4>
                    <div className="cost-grid">
                      <div className="cost-item">
                        <span className="label">Baseline Cost</span>
                        <span className="value baseline">
                          {selectedRec.baseline_cost.toFixed(1)}
                        </span>
                      </div>
                      <div className="cost-item">
                        <span className="label">Recommended Cost</span>
                        <span className="value recommended">
                          {selectedRec.recommended_cost.toFixed(1)}
                        </span>
                      </div>
                      <div className="cost-item">
                        <span className="label">Improvement</span>
                        <span className="value improvement">
                          {(selectedRec.improvement_value - selectedRec.baseline_cost).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Decision Outcome */}
                  {(() => {
                    const decision = getDecision(selectedRec.id);
                    return (
                      <div className="detail-section">
                        <h4>Driver Decision</h4>
                        {!decision ? (
                          <div className="decision-box pending">
                            <p>⏳ Awaiting driver decision</p>
                          </div>
                        ) : (
                          <>
                            <div className={`decision-box ${decision.decision}`}>
                              <div className="decision-status">
                                {decision.decision === "accepted" ? (
                                  <>
                                    <span className="status-icon">✓</span>
                                    <span className="status-text">Driver Accepted</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="status-icon">✕</span>
                                    <span className="status-text">Driver Ignored</span>
                                  </>
                                )}
                              </div>
                              {decision.note && (
                                <p className="decision-note">{decision.note}</p>
                              )}
                            </div>

                            {decision.outcome && (
                              <div className={`outcome-box ${getOutcomeTone(decision.outcome)}`}>
                                <h5>Actual Outcome</h5>
                                <p>{decision.outcome}</p>
                              </div>
                            )}

                            {decision.rating_delta !== undefined && (
                              <div className="decision-rating">
                                <span className="label">Driver Behavior Delta:</span>
                                <span
                                  className={`value ${decision.rating_delta >= 0 ? "positive" : "negative"}`}
                                >
                                  {decision.rating_delta >= 0 ? "+" : ""}
                                  {decision.rating_delta.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>
    </section>
  );
}
