export function StatusPill({ label, value }) {
  return (
    <div className="status-pill" role="status" aria-live="polite">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
