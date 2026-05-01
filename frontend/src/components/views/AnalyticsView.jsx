import { useMemo } from "react";
import { Panel } from "../common/UiPrimitives";

// Simple inline chart components (no external dependencies)
function LineChart({ data, label, valueKey, trend }) {
  const max = Math.max(...data.map((d) => d[valueKey]));
  const min = Math.min(...data.map((d) => d[valueKey]));
  const range = max - min || 1;

  return (
    <div className="chart-container line-chart">
      <h4>{label}</h4>
      <div className="chart-area">
        <svg viewBox="0 0 600 200" className="chart-svg">
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`h-${i}`} x1="0" y1={i * 50} x2="600" y2={i * 50} className="grid-line" />
          ))}

          {/* Data line */}
          <polyline
            points={data
              .map((d, idx) => {
                const x = (idx / (data.length - 1 || 1)) * 600;
                const y = 200 - ((d[valueKey] - min) / range) * 200;
                return `${x},${y}`;
              })
              .join(" ")}
            className="data-line"
          />

          {/* Data points */}
          {data.map((d, idx) => {
            const x = (idx / (data.length - 1 || 1)) * 600;
            const y = 200 - ((d[valueKey] - min) / range) * 200;
            return <circle key={`dot-${idx}`} cx={x} cy={y} r="3" className="data-point" />;
          })}
        </svg>
      </div>
      <div className="chart-legend">
        <span className="value-min">{min.toFixed(0)}</span>
        <span className={`trend ${trend >= 0 ? "positive" : "negative"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
        </span>
        <span className="value-max">{max.toFixed(0)}</span>
      </div>
    </div>
  );
}

function BarChart({ data, label, valueKey, color = "accent" }) {
  const max = Math.max(...data.map((d) => d[valueKey]));

  return (
    <div className="chart-container bar-chart">
      <h4>{label}</h4>
      <div className="bars-wrapper">
        {data.map((item, idx) => (
          <div key={idx} className="bar-item">
            <div
              className={`bar ${color}`}
              style={{ height: `${(item[valueKey] / max) * 150}px` }}
              title={`${item.label}: ${item[valueKey].toFixed(1)}`}
            />
            <span className="bar-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaChart({ data, label, valueKey }) {
  const max = Math.max(...data.map((d) => d[valueKey]));
  const min = Math.min(...data.map((d) => d[valueKey]));
  const range = max - min || 1;

  return (
    <div className="chart-container area-chart">
      <h4>{label}</h4>
      <div className="chart-area">
        <svg viewBox="0 0 600 180" className="chart-svg">
          {/* Fill area */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          <polygon
            points={`0,180 ${data
              .map((d, idx) => {
                const x = (idx / (data.length - 1 || 1)) * 600;
                const y = 180 - ((d[valueKey] - min) / range) * 180;
                return `${x},${y}`;
              })
              .join(" ")} 600,180`}
            fill="url(#areaGradient)"
          />

          {/* Data line */}
          <polyline
            points={data
              .map((d, idx) => {
                const x = (idx / (data.length - 1 || 1)) * 600;
                const y = 180 - ((d[valueKey] - min) / range) * 180;
                return `${x},${y}`;
              })
              .join(" ")}
            className="data-line"
          />
        </svg>
      </div>
      <div className="chart-legend">
        <span>{min.toFixed(0)}</span>
        <span className="value-max">{max.toFixed(1)}</span>
      </div>
    </div>
  );
}

export function AnalyticsView({ metrics = {}, vehicles = [], recommendations = [] }) {
  // Historical data (mock)
  const onTimeDeliveryHistory = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      value: 75 + Math.random() * 20,
    }));
  }, []);

  const warehouseUtilizationHistory = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      value: 45 + Math.random() * 40,
    }));
  }, []);

  const co2SavedCumulative = useMemo(() => {
    let cumulative = 0;
    return Array.from({ length: 12 }, (_, i) => {
      cumulative += 200 + Math.random() * 400;
      return {
        week: `W${i + 1}`,
        value: cumulative,
      };
    });
  }, []);

  const vehicleStatusDistribution = useMemo(() => {
    return [
      {
        label: "Idle",
        value: vehicles.filter((v) => v.status === "idle").length,
        color: "neutral",
      },
      {
        label: "In Transit",
        value: vehicles.filter((v) => v.status === "in_transit").length,
        color: "accent",
      },
      {
        label: "Loading",
        value: vehicles.filter((v) => v.status === "loading").length,
        color: "warning",
      },
      {
        label: "Unloading",
        value: vehicles.filter((v) => v.status === "unloading").length,
        color: "good",
      },
    ];
  }, [vehicles]);

  const recommendationAcceptanceHistory = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      week: `W${i + 1}`,
      value: 55 + Math.random() * 30,
    }));
  }, []);

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    const totalRecommendations = recommendations.length;
    const acceptedCount = recommendations.filter((r) => r.status === "accepted").length;
    const acceptanceRate = totalRecommendations > 0 ? (acceptedCount / totalRecommendations) * 100 : 0;

    return {
      avgOnTimeDelivery: (
        onTimeDeliveryHistory.reduce((sum, d) => sum + d.value, 0) / onTimeDeliveryHistory.length
      ).toFixed(1),
      trendOnTime:
        (onTimeDeliveryHistory[onTimeDeliveryHistory.length - 1].value -
          onTimeDeliveryHistory[0].value) /
        onTimeDeliveryHistory[0].value,
      trendUtilization:
        (warehouseUtilizationHistory[warehouseUtilizationHistory.length - 1].value -
          warehouseUtilizationHistory[0].value) /
        warehouseUtilizationHistory[0].value,
      totalCO2Saved: co2SavedCumulative[co2SavedCumulative.length - 1].value.toFixed(0),
      acceptanceRate: acceptanceRate.toFixed(1),
    };
  }, [onTimeDeliveryHistory, warehouseUtilizationHistory, co2SavedCumulative, recommendations]);

  return (
    <section className="analytics-layout">
      {/* Key Metrics Summary */}
      <Panel title="Analytics Dashboard">
        <div className="metrics-summary">
          <div className="metric-card">
            <span className="metric-label">Average On-Time Delivery</span>
            <span className="metric-value">{keyMetrics.avgOnTimeDelivery}%</span>
            <span className={`metric-trend ${keyMetrics.trendOnTime >= 0 ? "positive" : "negative"}`}>
              {keyMetrics.trendOnTime >= 0 ? "↑" : "↓"} {Math.abs(keyMetrics.trendOnTime * 100).toFixed(1)}%
            </span>
          </div>

          <div className="metric-card">
            <span className="metric-label">Total CO₂ Saved</span>
            <span className="metric-value">{keyMetrics.totalCO2Saved}</span>
            <span className="metric-unit">kg</span>
          </div>

          <div className="metric-card">
            <span className="metric-label">Recommendation Acceptance</span>
            <span className="metric-value">{keyMetrics.acceptanceRate}%</span>
            <span className="metric-trend positive">Growing driver trust</span>
          </div>

          <div className="metric-card">
            <span className="metric-label">Active Vehicles</span>
            <span className="metric-value">{vehicles.length}</span>
            <span className="metric-unit">vehicles</span>
          </div>
        </div>
      </Panel>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* On-Time Delivery Trend */}
        <Panel title="On-Time Delivery Trend (12 weeks)">
          <LineChart
            data={onTimeDeliveryHistory}
            label="Weekly On-Time %"
            valueKey="value"
            trend={keyMetrics.trendOnTime * 100}
          />
        </Panel>

        {/* Warehouse Utilization */}
        <Panel title="Warehouse Utilization (12 weeks)">
          <AreaChart
            data={warehouseUtilizationHistory}
            label="Average Utilization %"
            valueKey="value"
          />
        </Panel>

        {/* CO2 Saved Cumulative */}
        <Panel title="CO₂ Emissions Avoided (Cumulative)">
          <LineChart
            data={co2SavedCumulative}
            label="Cumulative CO₂ Saved (kg)"
            valueKey="value"
            trend={100}
          />
        </Panel>

        {/* Vehicle Status Distribution */}
        <Panel title="Current Vehicle Status Distribution">
          <BarChart
            data={vehicleStatusDistribution}
            label="Vehicles by Status"
            valueKey="value"
            color="accent"
          />
        </Panel>

        {/* Recommendation Acceptance Rate */}
        <Panel title="Recommendation Acceptance Rate (10 weeks)">
          <LineChart
            data={recommendationAcceptanceHistory}
            label="Weekly Acceptance %"
            valueKey="value"
            trend={20}
          />
        </Panel>

        {/* Performance Summary */}
        <Panel title="Performance Summary">
          <div className="performance-summary">
            <div className="performance-item">
              <span className="icon">📈</span>
              <div className="details">
                <strong>On-Time Delivery</strong>
                <p>12-week average of {keyMetrics.avgOnTimeDelivery}%, trending {keyMetrics.trendOnTime >= 0 ? "up" : "down"}</p>
              </div>
            </div>

            <div className="performance-item">
              <span className="icon">🌱</span>
              <div className="details">
                <strong>Environmental Impact</strong>
                <p>{keyMetrics.totalCO2Saved} kg CO₂ avoided through optimized routing</p>
              </div>
            </div>

            <div className="performance-item">
              <span className="icon">🤝</span>
              <div className="details">
                <strong>Driver Confidence</strong>
                <p>{keyMetrics.acceptanceRate}% recommendation acceptance rate, increasing trust in AI suggestions</p>
              </div>
            </div>

            <div className="performance-item">
              <span className="icon">🚚</span>
              <div className="details">
                <strong>Fleet Efficiency</strong>
                <p>{vehicles.length} vehicles optimized with AI-powered routing and disruption awareness</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
