export function Header({ onStart, onPause, onResume, onReset }) {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Google Solution Challenge 2026</p>
        <h1>Resilient Essential Goods Coordination</h1>
        <p className="hero-copy">
          AI-assisted operations for medicines, vaccines, and relief materials during disruptions
          across India, with explainable reroutes and beneficiary-focused impact tracking.
        </p>
      </div>
      <div className="hero-controls">
        <button onClick={onStart}>Start</button>
        <button onClick={onPause}>Pause</button>
        <button onClick={onResume}>Resume</button>
        <button className="danger" onClick={onReset}>
          Reset
        </button>
      </div>
    </header>
  );
}
