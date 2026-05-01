import { Panel, MetricCard, ProgressBar } from "../common/UiPrimitives";

export function DashboardView({ metrics, criticalFacilities, proactiveDispatches, riskForecast, auditChain, blockchainVerify, facilityLookup, aiActivity }) {
  const rl = aiActivity?.rl_engine;
  const actionBreakdown = aiActivity?.recent_action_breakdown ?? {};
  const explorationPct = rl ? Math.round((rl.epsilon ?? 1) * 100) : 100;
  const exploitationPct = 100 - explorationPct;
  const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="view-dashboard">
      <div className="metrics-grid">
        <MetricCard label="Financial Costs Saved (AI)" value={formatINR(metrics?.financial_costs_saved_usd)} tone="green" />
        <MetricCard label="Operational Costs" value={formatINR(metrics?.financial_costs_incurred_usd)} tone="coral" />
        <MetricCard label="Critical Deliveries Saved" value={metrics?.critical_deliveries_saved ?? 0} tone="teal" />
        <MetricCard label="Stockouts Prevented" value={metrics?.stockouts_prevented ?? 0} tone="amber" />
        <MetricCard label="Beneficiary Locations" value={metrics?.beneficiary_locations_served ?? 0} tone="steel" />
        <MetricCard label="Wastage Prevented" value={`${Number(metrics?.spoilage_or_wastage_prevented ?? 0).toFixed(0)} units`} tone="coral" />
        <MetricCard label="CO₂ Saved" value={`${(metrics?.co2_saved_kg ?? 0).toFixed(1)} kg`} tone="green" />
        <MetricCard label="On-Time Delivery" value={`${metrics?.on_time_delivery_pct ?? 0}%`} tone="blue" />
      </div>
      <div className="dashboard-grid">
        {/* AI Decisions Panel — shows judges what the AI is doing */}
        <Panel title="🧠 AI Decision Engine — Live" className="ai-panel">
          {aiActivity ? (
            <div className="ai-activity-panel">
              <div className="ai-stats-grid">
                <div className="ai-stat">
                  <span className="ai-stat-value">{aiActivity.reroute_count}</span>
                  <span className="ai-stat-label">Reroutes Executed</span>
                </div>
                <div className="ai-stat">
                  <span className="ai-stat-value">{aiActivity.cascade_detections_today}</span>
                  <span className="ai-stat-label">Cascades Detected</span>
                </div>
                <div className="ai-stat">
                  <span className="ai-stat-value">{aiActivity.driver_acceptance_rate}%</span>
                  <span className="ai-stat-label">Driver Acceptance</span>
                </div>
                <div className="ai-stat">
                  <span className="ai-stat-value">{aiActivity.completed_trips}</span>
                  <span className="ai-stat-label">Trips Completed</span>
                </div>
              </div>

              {rl?.enabled && (
                <div className="rl-engine-section">
                  <h5>Reinforcement Learning Agent</h5>
                  <div className="rl-stats-row">
                    <div className="rl-metric">
                      <span className="rl-label">Training Steps</span>
                      <span className="rl-value">{rl.train_step}</span>
                    </div>
                    <div className="rl-metric">
                      <span className="rl-label">Replay Buffer</span>
                      <span className="rl-value">{rl.replay_buffer_size} / 8000</span>
                    </div>
                    <div className="rl-metric">
                      <span className="rl-label">Exploration</span>
                      <span className="rl-value">{explorationPct}%</span>
                    </div>
                  </div>
                  <div className="epsilon-bar-wrap">
                    <div className="epsilon-bar">
                      <div className="epsilon-exploit" style={{ width: `${exploitationPct}%` }} />
                      <div className="epsilon-explore" style={{ width: `${explorationPct}%` }} />
                    </div>
                    <div className="epsilon-labels">
                      <span>🎯 Exploit ({exploitationPct}%)</span>
                      <span>🔍 Explore ({explorationPct}%)</span>
                    </div>
                  </div>
                </div>
              )}

              {Object.keys(actionBreakdown).length > 0 && (
                <div className="action-breakdown-section">
                  <h5>Recent AI Actions (Last 50 Decisions)</h5>
                  <div className="action-bars">
                    {Object.entries(actionBreakdown).sort((a, b) => b[1] - a[1]).map(([action, count]) => {
                      const total = Object.values(actionBreakdown).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div className="action-bar-row" key={action}>
                          <span className="action-name">{action.replace(/_/g, " ")}</span>
                          <div className="action-bar-track">
                            <div className={`action-bar-fill action-${action.replace(/_/g, "-")}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="action-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty">AI activity data loading...</div>
          )}
        </Panel>

        <Panel title="Critical Capacity Watch">
          {criticalFacilities.length === 0 ? <div className="empty">No facility above 70% utilization.</div> : (
            <div className="util-list" style={{ display: "grid", gap: "10px" }}>
              {criticalFacilities.map((f) => (
                <div className="util-item" key={f.facility_id}>
                  <div className="util-meta" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong>{f.facility_name}</strong>
                    <span>{f.utilization_pct.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={Math.min(100, f.utilization_pct)} />
                  <div className="util-foot" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85em", color: "var(--muted)", marginTop: "4px" }}><span>{f.city}</span><span>{Math.max(0, f.effective_available_units)} free</span></div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Proactive Dispatch AI">
          {proactiveDispatches.length === 0 ? <div className="empty">No proactive dispatches needed.</div> : (
            <div className="dispatch-list">
              {proactiveDispatches.slice(0, 5).map((d, i) => (
                <div className={`dispatch-card urgency-${d.urgency}`} key={i}>
                  <strong>{facilityLookup[d.destination_facility_id]?.name ?? "Facility"}</strong>
                  <span className="urgency-badge">{d.urgency}</span>
                  <p className="dispatch-reason">{d.reason}</p>
                  <div className="dispatch-meta">{d.recommended_units} units • ETA {d.eta_hours}h</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Risk Forecast (12h)" className="full-width">
          <div className="risk-grid">
            {riskForecast.slice(0, 8).map((rf, i) => (
              <div className={`risk-card severity-${rf.risk > 0.6 ? "high" : rf.risk > 0.3 ? "medium" : "low"}`} key={i}>
                <div className="risk-city">{rf.city}</div>
                <div className="risk-value">{(rf.risk * 100).toFixed(0)}%</div>
                <div className="risk-factors">{rf.factors?.join(", ")}</div>
                {rf.prediction_interval && (
                  <div className="risk-interval">Range: {(rf.prediction_interval[0] * 100).toFixed(0)}–{(rf.prediction_interval[1] * 100).toFixed(0)}%</div>
                )}
                {rf.trend && <div className={`risk-trend trend-${rf.trend}`}>{rf.trend === "rising" ? "📈" : rf.trend === "declining" ? "📉" : "➡️"} {rf.trend}</div>}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Recent Audit Blocks">
          <div className="audit-list">
            {auditChain.slice(-5).map((b, i) => (
              <div className="audit-item" key={i}>
                <span className="audit-index">#{b.index}</span>
                <span className="audit-type">{b.decision_type}</span>
                <span className="audit-action">{b.action}</span>
                <span className="audit-hash" title={b.hash}>{(b.hash ?? "").slice(0, 8)}...</span>
              </div>
            ))}
          </div>
          {blockchainVerify && (
            <div className={`verify-badge ${blockchainVerify.valid ? "valid" : "invalid"}`}>
              {blockchainVerify.valid ? "\u2713 Chain Verified" : "\u26A0 Tampering Detected"} • {blockchainVerify.block_count} blocks
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
