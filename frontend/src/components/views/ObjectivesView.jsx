export function ObjectivesView({ objectives, facilityLookup }) {
  return (
    <div className="view-objectives">
      <div className="lane-stack">
        {objectives.map((o) => (
          <div className="lane-card" key={o.id}>
            <div className="lane-head"><h3>{o.name}</h3><span className="priority">P{o.priority}</span></div>
            <p>{facilityLookup[o.origin_facility_id]?.city} → {facilityLookup[o.destination_facility_id]?.city}</p>
            <div className="lane-meta">
              <span>{o.commodity}</span>
              <span>{o.dispatch_interval_minutes} min cadence</span>
              <span>{o.assigned_vehicle_ids?.length ?? 0} vehicles</span>
              <span>{o.fallback_facility_ids?.length ?? 0} fallbacks</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
