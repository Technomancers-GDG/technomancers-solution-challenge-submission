import { Panel } from "../common/UiPrimitives";

export function NetworkView({ facilities, vehicles }) {
  return (
    <div className="view-network">
      <div className="grid-two">
        <Panel title="Facilities">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>City</th><th>Type</th><th>Capacity</th><th>Inventory</th></tr></thead>
              <tbody>{facilities.map((f) => (<tr key={f.id}><td>{f.name}</td><td>{f.city}</td><td>{f.facility_type}</td><td>{f.base_capacity_units.toLocaleString()}</td><td>{f.current_inventory_units.toLocaleString()}</td></tr>))}</tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Fleet">
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Type</th><th>Payload</th><th>Speed</th><th>Emission</th><th>Status</th></tr></thead>
              <tbody>{vehicles.map((v) => (<tr key={v.id}><td>{v.identifier}</td><td>{v.vehicle_type}</td><td>{v.payload_capacity_units}</td><td>{v.average_speed_kmph}</td><td>{v.emission_kg_per_km}</td><td>{v.status}</td></tr>))}</tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
