import { Panel } from "../common/UiPrimitives";

export function CloudView({ cloudHealth }) {
  return (
    <div className="view-cloud">
      <Panel title="Google Cloud Integration Health">
        {cloudHealth ? (
          <div className="cloud-grid">
            {Object.entries(cloudHealth).filter(([k]) => k !== "overall").map(([service, info]) => (
              <div className={`cloud-card ${info.enabled ? "enabled" : "disabled"}`} key={service}>
                <strong>{service.replace("_", " ").toUpperCase()}</strong>
                <span>{info.enabled ? "\u2713 Enabled" : "\u25CB Disabled"}</span>
                {info.project && <div className="cloud-meta">Project: {info.project}</div>}
                {info.region && <div className="cloud-meta">Region: {info.region}</div>}
                {info.dataset && <div className="cloud-meta">Dataset: {info.dataset}</div>}
              </div>
            ))}
            <div className={`cloud-overall ${cloudHealth.overall === "healthy" ? "healthy" : "stub"}`}>
              Overall: {cloudHealth.overall}
            </div>
          </div>
        ) : <div className="empty">Cloud health unavailable.</div>}
      </Panel>
    </div>
  );
}
