export function SettingsView({ lang, onSwitchLang, t }) {
  return (
    <div className="view-settings" style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 24 }}>{t.settings}</h2>

      <div
        className="settings-card"
        style={{
          background: "var(--surface)",
          borderRadius: 12,
          padding: 24,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem" }}>{t.language}</h3>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
            Choose your preferred interface language.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            className={`sim-btn ${lang === "en" ? "primary" : ""}`}
            onClick={() => onSwitchLang("en")}
            aria-pressed={lang === "en"}
          >
            {t.english}
          </button>
          <button
            className={`sim-btn ${lang === "hi" ? "primary" : ""}`}
            onClick={() => onSwitchLang("hi")}
            aria-pressed={lang === "hi"}
          >
            {t.hindi}
          </button>
        </div>
      </div>
    </div>
  );
}
