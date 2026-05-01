export function Panel({ title, children, className = "" }) {
  return (
    <div className={`panel ${className}`}>
      {title && <div className="panel-header"><h3>{title}</h3></div>}
      <div className="panel-body">{children}</div>
    </div>
  );
}

export function MetricCard({ label, value, tone = "neutral", trend }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {trend !== undefined && <div className="metric-trend">{trend > 0 ? "\u2191" : "\u2193"} {Math.abs(trend).toFixed(1)}%</div>}
    </div>
  );
}

export function ProgressBar({ value, compact }) {
  return (
    <div className={`progress-bar ${compact ? "compact" : ""}`}>
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Input({ label, value, onChange, required = true }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

export function Select({ label, value, options, onChange, required = true }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="">Select</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
