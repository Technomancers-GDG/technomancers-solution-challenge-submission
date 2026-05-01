import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Panel } from "./common/UiPrimitives";

const DEFAULT_CENTER = [22.5937, 78.9629];
const DEFAULT_ZOOM = 6;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasCoordinates(item) {
  return toNumber(item?.latitude) !== null && toNumber(item?.longitude) !== null;
}

function toLatLng(item) {
  const lat = toNumber(item?.latitude);
  const lng = toNumber(item?.longitude);
  if (lat === null || lng === null) return null;
  return [lat, lng];
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const v =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}

function pointAlongPath(points, progressPct) {
  if (!points || points.length === 0) return null;
  if (points.length === 1) return points[0];
  const clamped = Math.max(0, Math.min(100, Number(progressPct) || 0));
  if (clamped === 0) return points[0];
  if (clamped === 100) return points[points.length - 1];
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const len = distanceKm(points[i - 1], points[i]);
    lengths.push(len);
    total += len;
  }
  if (total <= 0) return points[0];
  let remaining = (clamped / 100) * total;
  for (let i = 0; i < lengths.length; i++) {
    const seg = lengths[i];
    if (remaining <= seg || i === lengths.length - 1) {
      const ratio = seg <= 0 ? 0 : remaining / seg;
      const start = points[i];
      const end = points[i + 1];
      return [
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio,
      ];
    }
    remaining -= seg;
  }
  return points[points.length - 1];
}

function decodePolyline(encoded, precision = 5) {
  if (!encoded) return [];
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const factor = 10 ** precision;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      if (index >= encoded.length) return coordinates;
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const latChange = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    latitude += latChange;
    result = 0;
    shift = 0;
    do {
      if (index >= encoded.length) return coordinates;
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const lngChange = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    longitude += lngChange;
    coordinates.push([latitude / factor, longitude / factor]);
  }
  return coordinates;
}

function MapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [center, map]);
  return null;
}

const vehicleIcon = L.divIcon({
  html: `<div style="background:#2563eb;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🚛</div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const originIcon = L.divIcon({
  html: `<div style="background:#22c55e;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">A</div>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const destIcon = L.divIcon({
  html: `<div style="background:#22c55e;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">B</div>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const altDestIcon = L.divIcon({
  html: `<div style="background:#f59e0b;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">B′</div>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function DriverMapView({
  vehicle,
  facilities,
  objectives,
  routeTemplates,
  recommendations,
  wsSnapshot,
  onDecision,
  decisionLoading,
}) {
  const facilityLookup = useMemo(() => {
    const map = {};
    facilities.forEach((f) => {
      if (hasCoordinates(f)) map[f.id] = f;
    });
    return map;
  }, [facilities]);

  const objectiveLookup = useMemo(() => {
    const map = {};
    objectives.forEach((o) => {
      map[o.id] = o;
    });
    return map;
  }, [objectives]);

  const routeTemplateLookup = useMemo(() => {
    const map = {};
    routeTemplates.forEach((t) => {
      if (t?.route_key) {
        map[t.route_key] = {
          ...t,
          decoded: t.encoded_polyline ? decodePolyline(t.encoded_polyline, 5) : [],
        };
      }
    });
    return map;
  }, [routeTemplates]);

  const routeData = useMemo(() => {
    if (!vehicle) return null;

    // Prefer live WebSocket data, fallback to static vehicle prop
    const wsVehicle = wsSnapshot?.vehicles?.find(
      (v) => String(v.vehicle_id ?? v.id) === String(vehicle.id)
    );

    const objectiveId = toNumber(
      wsVehicle?.objective_id ?? vehicle.default_objective_id
    );
    const objective = objectiveId != null ? objectiveLookup[objectiveId] : null;

    const status = String(wsVehicle?.status ?? vehicle.status ?? "idle").toLowerCase();
    const progress = Math.max(
      0,
      Math.min(100, Number(wsVehicle?.progress_pct ?? 0))
    );
    const payloadUnits = Number(wsVehicle?.payload_units ?? 0);

    const currentFacilityId = toNumber(
      wsVehicle?.current_facility_id ?? vehicle.current_facility_id
    );

    const originFacility = objective ? facilityLookup[objective.origin_facility_id] : null;
    const destFacility = objective ? facilityLookup[objective.destination_facility_id] : null;

    if (!originFacility || !destFacility) {
      // Not enough data to draw a route — still show the vehicle at its current facility if known
      const currentFacility = currentFacilityId != null ? facilityLookup[currentFacilityId] : null;
      const currentPoint = currentFacility ? toLatLng(currentFacility) : null;
      if (!currentPoint) return null;
      return {
        identifier: wsVehicle?.identifier ?? vehicle.identifier ?? `Truck ${vehicle.id}`,
        status,
        objectiveName: objective?.name || "Unassigned objective",
        progress,
        payloadUnits,
        currentPoint,
        startPoint: currentPoint,
        endPoint: currentPoint,
        routePoints: [currentPoint, currentPoint],
        routeSource: "derived",
      };
    }

    const originPoint = toLatLng(originFacility);
    const destPoint = toLatLng(destFacility);
    if (!originPoint || !destPoint) return null;

    // Determine direction: loaded = origin→destination, empty = destination→origin
    const goingToDest = payloadUnits > 0;

    let startPoint, endPoint;
    if (status === "in_transit") {
      startPoint = goingToDest ? originPoint : destPoint;
      endPoint = goingToDest ? destPoint : originPoint;
    } else {
      // Idle / parked at current facility
      const currentFacility = currentFacilityId != null ? facilityLookup[currentFacilityId] : null;
      const currentPoint = currentFacility ? toLatLng(currentFacility) : originPoint;
      startPoint = currentPoint;
      endPoint = currentPoint;
    }

    // Build route points from template (origin→dest) then reverse if needed
    const routeKey = `${originFacility.id}:${destFacility.id}`;
    const routeTemplate = routeTemplateLookup[routeKey];
    const decodedRoutePoints = routeTemplate?.decoded || [];

    let routePoints;
    if (decodedRoutePoints.length >= 2) {
      routePoints = goingToDest ? decodedRoutePoints : [...decodedRoutePoints].reverse();
    } else {
      routePoints = [startPoint, endPoint];
    }

    // Position truck along the route based on progress
    const markerPoint =
      status === "in_transit"
        ? (pointAlongPath(routePoints, progress) ?? startPoint)
        : startPoint;

    return {
      identifier: wsVehicle?.identifier ?? vehicle.identifier ?? `Truck ${vehicle.id}`,
      status,
      objectiveName: objective?.name || "Unassigned objective",
      progress,
      payloadUnits,
      currentPoint: markerPoint,
      startPoint,
      endPoint,
      routePoints,
      routeSource: routeTemplate?.source || "derived",
      startFacilityId: status === "in_transit" ? (goingToDest ? originFacility.id : destFacility.id) : (currentFacilityId ?? originFacility.id),
      endFacilityId: status === "in_transit" ? (goingToDest ? destFacility.id : originFacility.id) : (currentFacilityId ?? originFacility.id),
    };
  }, [vehicle, wsSnapshot, facilityLookup, objectiveLookup, routeTemplateLookup]);

  const activeRecommendation = useMemo(() => {
    if (!vehicle) return null;
    return recommendations.find(
      (r) =>
        r.vehicle_id === vehicle.id &&
        r.status === "suggested" &&
        String(r.action || "").startsWith("reroute")
    );
  }, [recommendations, vehicle]);

  const altRouteData = useMemo(() => {
    if (!routeData || !activeRecommendation?.recommended_destination_id) return null;
    const altDest = facilityLookup[activeRecommendation.recommended_destination_id];
    const altDestPoint = altDest ? toLatLng(altDest) : null;
    if (!routeData.startPoint || !altDestPoint) return null;

    const altKey = `${routeData.startFacilityId ?? ""}:${activeRecommendation.recommended_destination_id}`;
    const altTmpl = routeTemplateLookup[altKey];
    const altPoints =
      altTmpl?.decoded?.length >= 2
        ? altTmpl.decoded
        : [routeData.startPoint, altDestPoint];

    return {
      altRoutePoints: altPoints,
      altDestPoint,
    };
  }, [routeData, activeRecommendation, facilityLookup, routeTemplateLookup]);

  if (!vehicle || !routeData) {
    return (
      <Panel title="My Route">
        <div className="empty">No route data available.</div>
      </Panel>
    );
  }

  const mapCenter = routeData.currentPoint ?? routeData.startPoint ?? DEFAULT_CENTER;

  return (
    <div>
      <Panel title="My Route">
        <div
          className="map-container"
          style={{ height: "360px", borderRadius: "16px", overflow: "hidden" }}
        >
          <MapContainer
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <MapCenter center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Main route line */}
            <Polyline
              positions={routeData.routePoints}
              color="#2563eb"
              weight={5}
              opacity={0.9}
            />

            {/* Origin marker */}
            {routeData.startPoint && (
              <Marker position={routeData.startPoint} icon={originIcon}>
                <Popup>Origin</Popup>
              </Marker>
            )}

            {/* Destination marker */}
            {routeData.endPoint &&
              (routeData.endPoint[0] !== routeData.startPoint[0] ||
                routeData.endPoint[1] !== routeData.startPoint[1]) && (
                <Marker position={routeData.endPoint} icon={destIcon}>
                  <Popup>Destination</Popup>
                </Marker>
              )}

            {/* Alternate route */}
            {altRouteData?.altRoutePoints && (
              <>
                <Polyline
                  positions={altRouteData.altRoutePoints}
                  color="#f59e0b"
                  weight={5}
                  opacity={0.9}
                  dashArray="8,8"
                />
                {altRouteData.altDestPoint && (
                  <Marker position={altRouteData.altDestPoint} icon={altDestIcon}>
                    <Popup>Proposed Destination</Popup>
                  </Marker>
                )}
              </>
            )}

            {/* Vehicle marker */}
            {routeData.currentPoint && (
              <Marker position={routeData.currentPoint} icon={vehicleIcon}>
                <Popup>
                  <strong>{routeData.identifier}</strong>
                  <br />
                  Status: {routeData.status}
                  <br />
                  Progress: {routeData.progress.toFixed(1)}%
                  <br />
                  {routeData.objectiveName}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div className="driver-summary-grid" style={{ marginTop: "14px" }}>
          <div className="driver-summary-card">
            <span className="label">Vehicle</span>
            <strong>{routeData.identifier}</strong>
          </div>
          <div className="driver-summary-card">
            <span className="label">Status</span>
            <strong>{routeData.status}</strong>
          </div>
          <div className="driver-summary-card">
            <span className="label">Progress</span>
            <strong>{routeData.progress.toFixed(1)}%</strong>
          </div>
          <div className="driver-summary-card">
            <span className="label">Objective</span>
            <strong>{routeData.objectiveName}</strong>
          </div>
          <div className="driver-summary-card">
            <span className="label">Payload</span>
            <strong>{routeData.payloadUnits} units</strong>
          </div>
          <div className="driver-summary-card">
            <span className="label">Route Source</span>
            <strong>{routeData.routeSource}</strong>
          </div>
        </div>
      </Panel>

      {activeRecommendation && (
        <Panel title="Reroute Proposal">
          <div className="proposal-grid">
            <div>
              <span className="label">Current Destination</span>
              <strong>
                {facilityLookup[activeRecommendation.original_destination_id]?.name || "Current"}
              </strong>
            </div>
            <div>
              <span className="label">Proposed Destination</span>
              <strong>
                {facilityLookup[activeRecommendation.recommended_destination_id]?.name ||
                  "Alternative"}
              </strong>
            </div>
          </div>
          <p className="proposal-explanation">{activeRecommendation.explanation}</p>
          <div className="proposal-actions">
            <button
              type="button"
              disabled={decisionLoading}
              onClick={() => onDecision(activeRecommendation.id, "accept")}
            >
              Accept Reroute
            </button>
            <button
              type="button"
              className="danger"
              disabled={decisionLoading}
              onClick={() => onDecision(activeRecommendation.id, "ignore")}
            >
              Ignore
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
