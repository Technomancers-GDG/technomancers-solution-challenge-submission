import { Panel } from "../common/UiPrimitives";

export function EventsView({ events }) {
  return (
    <div className="view-events">
      <Panel title="Active Events Feed">
        <div className="event-stack">
          {events.slice(0, 20).map((e, i) => (
            <div className="event-card" key={i}>
              <div className="event-top"><strong>{e.city}</strong><span>{e.category}</span></div>
              <p>{e.headline}</p>
              <small>{e.impact_type} • impact {Number(e.impact_score).toFixed(2)}</small>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
