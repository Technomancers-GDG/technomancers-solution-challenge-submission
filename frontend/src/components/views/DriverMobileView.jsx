import { Panel } from "../common/UiPrimitives";

export function DriverMobileView({
  drivers, selectedDriverId, setSelectedDriverId, driverMobile,
  voice, voiceConfig, voiceIncidentType, setVoiceIncidentType,
  voiceNote, setVoiceNote, onMessage, onError, refreshAll, apiFetch,
}) {
  const selectedDriver = drivers.find((d) => String(d.id) === String(selectedDriverId));

  const submitVoiceIncident = async () => {
    if (!selectedDriverId) return;
    try {
      await apiFetch("/api/driver/incidents", {
        method: "POST",
        body: JSON.stringify({
          driver_profile_id: Number(selectedDriverId),
          vehicle_id: null,
          city: "Unknown",
          incident_type: voiceIncidentType,
          severity: 0.7,
          note: voiceNote || voice.transcript || "Voice reported",
        }),
      });
      onMessage("Voice incident reported.");
      voice.reset();
      setVoiceNote("");
      refreshAll(false);
    } catch (err) { onError(err.message); }
  };

  return (
    <div className="view-driver">
      <div className="driver-grid">
        <Panel title="Driver Selection">
          <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} className="driver-select">
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} (rating {d.override_rating.toFixed(2)})</option>)}
          </select>
          {selectedDriver && (
            <div className="driver-stats">
              <div><strong>Override Rating:</strong> {selectedDriver.override_rating.toFixed(2)}</div>
              <div><strong>Confidence:</strong> {(selectedDriver.confidence * 100).toFixed(0)}%</div>
              <div><strong>Accept Bias:</strong> {(selectedDriver.accept_recommendation_bias * 100).toFixed(0)}%</div>
            </div>
          )}
        </Panel>
        <Panel title="Voice Incident Reporting">
          <div className="voice-panel">
            <button className={`voice-btn ${voice.isListening ? "listening" : ""}`} onClick={() => voice.start("en-IN")}>
              {voice.isListening ? "\u25CF Listening..." : "\uD83C\uDFA4 Hold to Speak"}
            </button>
            {voice.transcript && (
              <div className="voice-transcript">
                <strong>Heard:</strong> {voice.transcript}
              </div>
            )}
            <select value={voiceIncidentType} onChange={(e) => setVoiceIncidentType(e.target.value)}>
              {voiceConfig?.incident_types?.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <input placeholder="Additional notes" value={voiceNote} onChange={(e) => setVoiceNote(e.target.value)} />
            <button onClick={submitVoiceIncident} disabled={!voice.transcript}>Report Incident</button>
          </div>
        </Panel>
        <Panel title="Pending Instructions">
          {driverMobile?.pending_instructions?.length === 0 ? <div className="empty">No pending instructions.</div> : (
            <div className="instruction-list">
              {driverMobile?.pending_instructions?.map((inst) => (
                <div className="instruction-card" key={inst.recommendation_id}>
                  <div className="inst-header"><strong>{inst.vehicle_identifier}</strong><span>{inst.action.replaceAll("_", " ")}</span></div>
                  <p>{inst.explanation}</p>
                  <div className="inst-actions">
                    <button onClick={async () => { await apiFetch("/api/driver/decision", { method: "POST", body: JSON.stringify({ recommendation_id: inst.recommendation_id, decision: "accepted" }) }); refreshAll(false); }}>Accept</button>
                    <button className="danger" onClick={async () => { await apiFetch("/api/driver/decision", { method: "POST", body: JSON.stringify({ recommendation_id: inst.recommendation_id, decision: "ignored" }) }); refreshAll(false); }}>Ignore</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
