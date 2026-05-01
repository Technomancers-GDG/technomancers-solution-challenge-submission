export function TabNavigation({ tabs, activeTab, onSelect, isLive }) {
  return (
    <div className="tab-nav-shell">
      <nav className="tabs" aria-label="Primary sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? "tab active" : "tab"}
            onClick={() => onSelect(tab)}
            aria-pressed={tab === activeTab}
          >
            {tab}
          </button>
        ))}
      </nav>
      <span className={isLive ? "live-indicator connected" : "live-indicator"}>
        {isLive ? "Live" : "Offline"}
      </span>
    </div>
  );
}
