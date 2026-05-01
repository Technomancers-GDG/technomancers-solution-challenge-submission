import { useMemo, useState } from "react";
import { Input, Panel, Select } from "../common/UiPrimitives";

const statusOptions = [
  "idle",
  "loading",
  "unloading",
  "in_transit",
  "resting",
  "waiting",
  "offline",
];

export function FleetView({
  vehicles,
  facilities,
  drivers,
  objectives,
  vehicleForm,
  setVehicleForm,
  handleVehicleSubmit,
  handleVehicleQuickUpdate,
  handleBulkAssignObjective,
  handleBulkVehicleStatus,
  handleResetIdleVehiclesToHome,
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "identifier", direction: "asc" });
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
  const [bulkObjectiveId, setBulkObjectiveId] = useState("");

  const facilityLookup = useMemo(
    () => Object.fromEntries(facilities.map((facility) => [facility.id, facility])),
    [facilities],
  );
  const driverLookup = useMemo(
    () => Object.fromEntries(drivers.map((driver) => [driver.id, driver])),
    [drivers],
  );
  const objectiveLookup = useMemo(
    () => Object.fromEntries(objectives.map((objective) => [objective.id, objective])),
    [objectives],
  );

  const visibleVehicles = useMemo(() => {
    const filtered = vehicles.filter((vehicle) => {
      if (statusFilter === "all") {
        return true;
      }
      return vehicle.status === statusFilter;
    });

    return filtered.sort((left, right) => {
      const directionFactor = sortConfig.direction === "asc" ? 1 : -1;
      const leftValue = left[sortConfig.key];
      const rightValue = right[sortConfig.key];

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * directionFactor;
      }

      return String(leftValue ?? "").localeCompare(String(rightValue ?? "")) * directionFactor;
    });
  }, [sortConfig.direction, sortConfig.key, statusFilter, vehicles]);

  function toggleSort(column) {
    setSortConfig((current) => {
      if (current.key !== column) {
        return { key: column, direction: "asc" };
      }
      return {
        key: column,
        direction: current.direction === "asc" ? "desc" : "asc",
      };
    });
  }

  function sortIndicator(column) {
    if (sortConfig.key !== column) {
      return "↕";
    }
    return sortConfig.direction === "asc" ? "↑" : "↓";
  }

  async function saveVehicleEdit(vehicleId) {
    if (!editingVehicle || editingVehicle.id !== vehicleId) {
      return;
    }

    await handleVehicleQuickUpdate(vehicleId, {
      current_facility_id: Number(editingVehicle.current_facility_id),
      default_objective_id: editingVehicle.default_objective_id
        ? Number(editingVehicle.default_objective_id)
        : null,
      status: editingVehicle.status,
    });
    setEditingVehicle(null);
  }

  async function onBulkAssign() {
    if (!bulkObjectiveId || selectedVehicleIds.length === 0) {
      return;
    }
    await handleBulkAssignObjective(selectedVehicleIds, Number(bulkObjectiveId));
    setSelectedVehicleIds([]);
  }

  async function onBulkStatus(nextStatus) {
    if (selectedVehicleIds.length === 0) {
      return;
    }
    await handleBulkVehicleStatus(selectedVehicleIds, nextStatus);
    setSelectedVehicleIds([]);
  }

  function toggleVehicleSelection(vehicleId) {
    setSelectedVehicleIds((current) => {
      if (current.includes(vehicleId)) {
        return current.filter((id) => id !== vehicleId);
      }
      return [...current, vehicleId];
    });
  }

  function toggleSelectAll() {
    if (selectedVehicleIds.length === visibleVehicles.length) {
      setSelectedVehicleIds([]);
      return;
    }
    setSelectedVehicleIds(visibleVehicles.map((vehicle) => vehicle.id));
  }

  return (
    <section className="grid-two">
      <Panel title="Vehicle Fleet">
        <div className="filter-row">
          <Select
            label="Status"
            value={statusFilter}
            options={[["all", "All Status"], ...statusOptions.map((status) => [status, status])]}
            onChange={setStatusFilter}
          />
        </div>

        <div className="table-wrap section-divider">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={visibleVehicles.length > 0 && selectedVehicleIds.length === visibleVehicles.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all visible vehicles"
                  />
                </th>
                <th>
                  <button type="button" className="sort-button" onClick={() => toggleSort("identifier")}>
                    Identifier {sortIndicator("identifier")}
                  </button>
                </th>
                <th>Status</th>
                <th>Home Facility</th>
                <th>Current Facility</th>
                <th>Driver</th>
                <th>Objective</th>
                <th>Available At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleVehicles.map((vehicle) => {
                const isEditing = editingVehicle?.id === vehicle.id;
                return (
                  <tr key={vehicle.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedVehicleIds.includes(vehicle.id)}
                        onChange={() => toggleVehicleSelection(vehicle.id)}
                        aria-label={`Select ${vehicle.identifier}`}
                      />
                    </td>
                    <td>{vehicle.identifier}</td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editingVehicle.status}
                          onChange={(event) => setEditingVehicle({ ...editingVehicle, status: event.target.value })}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        vehicle.status
                      )}
                    </td>
                    <td>{facilityLookup[vehicle.home_facility_id]?.name ?? "-"}</td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editingVehicle.current_facility_id}
                          onChange={(event) =>
                            setEditingVehicle({ ...editingVehicle, current_facility_id: event.target.value })
                          }
                        >
                          {facilities.map((facility) => (
                            <option key={facility.id} value={facility.id}>
                              {facility.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        facilityLookup[vehicle.current_facility_id]?.name ?? "-"
                      )}
                    </td>
                    <td>{driverLookup[vehicle.driver_profile_id]?.name ?? "-"}</td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editingVehicle.default_objective_id}
                          onChange={(event) =>
                            setEditingVehicle({ ...editingVehicle, default_objective_id: event.target.value })
                          }
                        >
                          <option value="">Unassigned</option>
                          {objectives.map((objective) => (
                            <option key={objective.id} value={objective.id}>
                              {objective.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        objectiveLookup[vehicle.default_objective_id]?.name ?? "Unassigned"
                      )}
                    </td>
                    <td>{vehicle.available_at ? vehicle.available_at.slice(0, 16).replace("T", " ") : "-"}</td>
                    <td className="table-actions">
                      {isEditing ? (
                        <>
                          <button type="button" className="small" onClick={() => saveVehicleEdit(vehicle.id)}>
                            Save
                          </button>
                          <button type="button" className="small" onClick={() => setEditingVehicle(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="small"
                          onClick={() =>
                            setEditingVehicle({
                              id: vehicle.id,
                              current_facility_id: String(vehicle.current_facility_id ?? vehicle.home_facility_id),
                              default_objective_id: String(vehicle.default_objective_id ?? ""),
                              status: vehicle.status,
                            })
                          }
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="action-row section-divider">
          <Select
            label="Assign objective"
            value={bulkObjectiveId}
            options={objectives.map((objective) => [String(objective.id), objective.name])}
            onChange={setBulkObjectiveId}
            required={false}
          />
          <button type="button" onClick={onBulkAssign}>
            Assign Selected
          </button>
          <button type="button" onClick={() => onBulkStatus("offline")}>
            Retire Selected
          </button>
          <button type="button" onClick={() => onBulkStatus("idle")}>
            Activate Selected
          </button>
          <button type="button" onClick={handleResetIdleVehiclesToHome}>
            Reset Idle to Home
          </button>
        </div>
      </Panel>

      <Panel title="Add Vehicle">
        <form className="form-grid" onSubmit={handleVehicleSubmit}>
          <Input label="Identifier" value={vehicleForm.identifier} onChange={(value) => setVehicleForm({ ...vehicleForm, identifier: value })} />
          <Input
            label="Payload Capacity"
            value={vehicleForm.payload_capacity_units}
            onChange={(value) => setVehicleForm({ ...vehicleForm, payload_capacity_units: value })}
          />
          <Select
            label="Home Facility"
            value={vehicleForm.home_facility_id}
            options={facilities.map((facility) => [String(facility.id), facility.name])}
            onChange={(value) =>
              setVehicleForm({
                ...vehicleForm,
                home_facility_id: value,
                current_facility_id: value,
              })
            }
          />
          <Select
            label="Driver"
            value={vehicleForm.driver_profile_id}
            options={drivers.map((driver) => [String(driver.id), driver.name])}
            onChange={(value) => setVehicleForm({ ...vehicleForm, driver_profile_id: value })}
          />
          <Input
            label="Average Speed km/h"
            value={vehicleForm.average_speed_kmph}
            onChange={(value) => setVehicleForm({ ...vehicleForm, average_speed_kmph: value })}
          />
          <Input
            label="Emission kg/km"
            value={vehicleForm.emission_kg_per_km}
            onChange={(value) => setVehicleForm({ ...vehicleForm, emission_kg_per_km: value })}
          />
          <Input
            label="Rest Every Hours"
            value={vehicleForm.rest_every_hours}
            onChange={(value) => setVehicleForm({ ...vehicleForm, rest_every_hours: value })}
          />
          <Input
            label="Rest Duration Minutes"
            value={vehicleForm.rest_duration_minutes}
            onChange={(value) => setVehicleForm({ ...vehicleForm, rest_duration_minutes: value })}
          />
          <button type="submit">Create Vehicle</button>
        </form>
      </Panel>
    </section>
  );
}
