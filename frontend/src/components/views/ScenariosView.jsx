import { Panel } from "../common/UiPrimitives";

export function ScenariosView({ scenarios, scenarioKey, setScenarioKey, scenarioComparison, setScenarioComparison, runAction, apiFetch }) {
  const selected = scenarios.find((s) => s.scenario_key === scenarioKey);
  return (
    <div className="view-scenarios">
      <div className="grid-two">
        <Panel title="Scenario Replay">
          <select value={scenarioKey} onChange={(e) => setScenarioKey(e.target.value)} className="scenario-select">
            <option value="">Select scenario...</option>
            {scenarios.map((s) => <option key={s.scenario_key} value={s.scenario_key}>{s.name}</option>)}
          </select>
          {selected && (
            <div className="scenario-detail">
              <h4>{selected.name}</h4>
              <p>{selected.description}</p>
              <div className="scenario-meta">{selected.event_city} • severity {selected.severity.toFixed(2)} • ETA x{selected.eta_multiplier.toFixed(2)}</div>
              <div className="scenario-actions">
                <button onClick={() => runAction(`/api/scenarios/${selected.scenario_key}/trigger`, {}, "Triggered")}>Trigger</button>
                <button onClick={async () => { const c = await apiFetch(`/api/scenarios/${selected.scenario_key}/compare`); setScenarioComparison(c); }}>Compare Baseline vs AI</button>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Baseline vs AI">
          {!scenarioComparison ? <div className="empty">Run comparison to view results.</div> : (
            <div className="comparison-result">
              <div className="comparison-grid">
                <div><strong>Baseline On-Time</strong><p>{scenarioComparison.baseline.on_time_delivery_pct.toFixed(1)}%</p></div>
                <div><strong>AI On-Time</strong><p>{scenarioComparison.ai.on_time_delivery_pct.toFixed(1)}%</p></div>
                <div><strong>Baseline Delay</strong><p>{scenarioComparison.baseline.average_delay_minutes.toFixed(1)} min</p></div>
                <div><strong>AI Delay</strong><p>{scenarioComparison.ai.average_delay_minutes.toFixed(1)} min</p></div>
              </div>
              <div className="comparison-improvement">
                <span>Overflow reduction: {scenarioComparison.improvement_summary?.overflow_reduction?.toFixed(1)}</span>
                <span>Delay reduction: {scenarioComparison.improvement_summary?.delay_reduction_minutes?.toFixed(1)} min</span>
                <span>Stockouts prevented: {scenarioComparison.ai.stockouts_prevented}</span>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
