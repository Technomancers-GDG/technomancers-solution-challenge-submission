import { useMemo, useState } from "react";
import { Input, Panel, Select } from "../common/UiPrimitives";

function getEventIcon(eventType) {
  const iconMap = {
    news: "📰",
    weather: "🌧️",
    incident: "⚠️",
    system: "⚙️",
    delay: "⏰",
    strike: "✊",
    blockage: "🚧",
  };
  return iconMap[eventType] || "📌";
}

function getEventTone(severity) {
  if (severity >= 0.7) return "danger";
  if (severity >= 0.4) return "warning";
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

export function EventsLogView({ importEvents, events = [] }) {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filterEventType, setFilterEventType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCity, setFilterCity] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");

  // Extract unique cities from events
  const uniqueCities = useMemo(() => {
    const cities = new Set();
    events.forEach((event) => {
      if (event.city) cities.add(event.city);
    });
    return Array.from(cities).sort();
  }, [events]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Type filter
    if (filterEventType !== "all") {
      filtered = filtered.filter((e) => e.event_type === filterEventType);
    }

    // Severity filter
    if (filterSeverity !== "all") {
      const severityNum = parseFloat(filterSeverity);
      filtered = filtered.filter((e) => {
        const eventSeverity = e.severity ?? 0.5;
        return eventSeverity >= severityNum && eventSeverity < severityNum + 0.3;
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((e) => (e.status || "unresolved") === filterStatus);
    }

    // City filter
    if (filterCity) {
      filtered = filtered.filter((e) => e.city && e.city.toLowerCase().includes(filterCity.toLowerCase()));
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "timestamp") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === "severity") {
        return (b.severity ?? 0.5) - (a.severity ?? 0.5);
      }
      return 0;
    });

    return filtered;
  }, [events, filterEventType, filterSeverity, filterStatus, filterCity, sortBy]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <section className="events-log-layout">
      {/* Header with Import Controls */}
      <Panel title="Events Log">
        <div className="import-controls">
          <button className="primary-btn" onClick={() => importEvents(false)}>
            📥 Import Event Replay
          </button>
          <button className="secondary-btn" onClick={() => importEvents(true)}>
            📰 Full News Import
          </button>
        </div>
      </Panel>

      {/* Filters */}
      <Panel title="Filters">
        <div className="filter-row">
          <Select
            label="Event Type"
            value={filterEventType}
            options={[
              ["all", "All Events"],
              ["news", "📰 News"],
              ["weather", "🌧️ Weather"],
              ["incident", "⚠️ Incident"],
              ["system", "⚙️ System"],
            ]}
            onChange={setFilterEventType}
          />

          <Select
            label="Severity"
            value={filterSeverity}
            options={[
              ["all", "All Severities"],
              ["0.7", "🔴 Critical (0.7+)"],
              ["0.4", "🟡 High (0.4-0.7)"],
              ["0", "🟢 Low (0-0.4)"],
            ]}
            onChange={setFilterSeverity}
          />

          <Select
            label="Status"
            value={filterStatus}
            options={[
              ["all", "All Statuses"],
              ["unresolved", "Unresolved"],
              ["resolved", "Resolved"],
            ]}
            onChange={setFilterStatus}
          />

          <Input
            label="City"
            value={filterCity}
            onChange={setFilterCity}
            placeholder="Filter by city..."
          />

          <Select
            label="Sort By"
            value={sortBy}
            options={[
              ["timestamp", "Latest First"],
              ["severity", "Highest Severity"],
            ]}
            onChange={setSortBy}
          />
        </div>

        <div className="filter-info">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </Panel>

      {/* Events Timeline */}
      <div className="events-container">
        <Panel title={`Events (${filteredEvents.length})`}>
          {filteredEvents.length === 0 ? (
            <div className="empty">No events match your filters.</div>
          ) : (
            <div className="events-timeline">
              {filteredEvents.map((event) => {
                const isSelected = event.id === selectedEventId;
                const tone = getEventTone(event.severity ?? 0.5);

                return (
                  <div
                    key={event.id}
                    className={`event-item ${tone} ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedEventId(isSelected ? null : event.id)}
                  >
                    <div className="event-marker" />
                    <div className="event-content">
                      <div className="event-header">
                        <span className="event-icon">{getEventIcon(event.event_type)}</span>
                        <div className="event-title-section">
                          <h4 className="event-title">{event.title || event.event_type}</h4>
                          <div className="event-meta">
                            <span className="event-time">{formatRelativeTime(event.created_at)}</span>
                            {event.city && <span className="event-city">📍 {event.city}</span>}
                            {event.status && (
                              <span className={`event-status ${event.status}`}>
                                {event.status.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="event-severity">
                          <div className={`severity-dot ${tone}`} />
                          <span>{Math.round((event.severity ?? 0.5) * 100)}</span>
                        </div>
                      </div>

                      <p className="event-summary">{event.summary || event.note || event.description}</p>

                      {isSelected && (
                        <div className="event-expanded">
                          {event.event_type === "news" && (
                            <div className="event-details">
                              <div className="detail-section">
                                <h5>Full Content</h5>
                                <p>{event.content || event.text || "No content available"}</p>
                              </div>
                              {event.source && (
                                <div className="detail-section">
                                  <h5>Source</h5>
                                  <p>{event.source}</p>
                                </div>
                              )}
                              {event.impact_type && (
                                <div className="detail-section">
                                  <h5>Impact Type</h5>
                                  <p>{event.impact_type.replaceAll("_", " ")}</p>
                                </div>
                              )}
                              {event.relevance_classifier && (
                                <div className="detail-section">
                                  <h5>Route Impact Classification</h5>
                                  <p className="classifier">
                                    {event.relevance_classifier === true || event.relevance_classifier === "true"
                                      ? "✓ Route-impacting"
                                      : "✕ Not route-impacting"}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {event.event_type === "weather" && (
                            <div className="event-details">
                              <div className="weather-grid">
                                {event.precipitation && (
                                  <div className="weather-item">
                                    <span className="label">Precipitation</span>
                                    <span className="value">{event.precipitation}mm</span>
                                  </div>
                                )}
                                {event.temperature && (
                                  <div className="weather-item">
                                    <span className="label">Temperature</span>
                                    <span className="value">{event.temperature}°C</span>
                                  </div>
                                )}
                                {event.wind_speed && (
                                  <div className="weather-item">
                                    <span className="label">Wind Speed</span>
                                    <span className="value">{event.wind_speed} km/h</span>
                                  </div>
                                )}
                              </div>
                              {event.affected_cities && (
                                <div className="detail-section">
                                  <h5>Affected Cities</h5>
                                  <div className="city-tags">
                                    {event.affected_cities.map((city) => (
                                      <span key={city} className="city-tag">
                                        {city}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {event.forecast_duration && (
                                <div className="detail-section">
                                  <h5>Duration</h5>
                                  <p>{event.forecast_duration}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {event.event_type === "incident" && (
                            <div className="event-details">
                              <div className="detail-section">
                                <h5>Reporter</h5>
                                <p>{event.reporter_name || "Unknown"}</p>
                              </div>
                              {event.vehicle_id && (
                                <div className="detail-section">
                                  <h5>Vehicle</h5>
                                  <p className="vehicle-id">{event.vehicle_identifier}</p>
                                </div>
                              )}
                              <div className="detail-section">
                                <h5>Incident Type</h5>
                                <p>{event.incident_type?.replaceAll("_", " ") || "Unknown"}</p>
                              </div>
                              <div className="detail-section">
                                <h5>Details</h5>
                                <p>{event.full_note || event.note || "No details"}</p>
                              </div>
                              {event.created_at && (
                                <div className="detail-section">
                                  <h5>Reported At</h5>
                                  <p>{new Date(event.created_at).toLocaleString()}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {event.affected_facilities && event.affected_facilities.length > 0 && (
                            <div className="detail-section">
                              <h5>Affected Facilities</h5>
                              <div className="facility-list">
                                {event.affected_facilities.map((facility, idx) => (
                                  <span key={idx} className="facility-tag">
                                    {facility}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}
