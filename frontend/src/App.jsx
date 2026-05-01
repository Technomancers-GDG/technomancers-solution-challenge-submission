import { startTransition, useDeferredValue, useEffect, useState, useCallback, useRef } from "react";
import { onAuthChange, logout } from "./firebase";
import { LoginView } from "./components/views/LoginView";
import { MapView } from "./components/views/MapView";
import { DashboardView } from "./components/views/DashboardView";
import { LiveOpsView } from "./components/views/LiveOpsView";
import { ForecastView } from "./components/views/ForecastView";
import { InventoryView } from "./components/views/InventoryView";
import { ScenariosView } from "./components/views/ScenariosView";
import { BlockchainView } from "./components/views/BlockchainView";
import { CloudView } from "./components/views/CloudView";
import { NetworkView } from "./components/views/NetworkView";
import { ObjectivesView } from "./components/views/ObjectivesView";
import { EventsView } from "./components/views/EventsView";
import { ImpactView } from "./components/views/ImpactView";
import { SettingsView } from "./components/views/SettingsView";

const API_BASE = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_BASE_URL ?? "";

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

const TRANSLATIONS = {
  en: {
    operations: "Operations",
    intelligence: "Intelligence",
    network: "Network",
    analytics: "Analytics",
    settings: "Settings",
    dashboard: "Dashboard",
    liveMap: "Live Map",
    liveOps: "Live Ops",
    forecast: "Risk Forecast",
    inventory: "Inventory AI",
    scenarios: "Scenarios",
    blockchain: "Blockchain",
    networkView: "Network",
    objectives: "Objectives",
    events: "Events",
    impact: "Impact & SDG",
    cloud: "Cloud",
    commandCenter: "Command Center",
    prototypeBadge: "Hackathon Prototype",
    simTime: "Sim Time",
    speed: "Speed",
    active: "Active",
    onTime: "On-Time",
    co2Saved: "CO₂ Saved",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    reset: "Reset",
    language: "Language",
    english: "English",
    hindi: "Hindi",
    version: "Google Solution Challenge 2026",
    welcome: "Welcome to SOLV",
    loginTagline: "Intelligent Essential Goods Logistics",
    signInWithGoogle: "Sign in with Google",
    logout: "Logout",
  },
  hi: {
    operations: "संचालन",
    intelligence: "खुफिया",
    network: "नेटवर्क",
    analytics: "विश्लेषण",
    settings: "सेटिंग्स",
    dashboard: "डैशबोर्ड",
    liveMap: "लाइव मानचित्र",
    liveOps: "लाइव संचालन",
    forecast: "जोखिम पूर्वानुमान",
    inventory: "इन्वेंटरी AI",
    scenarios: "परिदृश्य",
    blockchain: "ब्लॉकचेन",
    networkView: "नेटवर्क",
    objectives: "उद्देश्य",
    events: "घटनाएँ",
    impact: "प्रभाव और SDG",
    cloud: "क्लाउड",
    commandCenter: "कमांड केंद्र",
    prototypeBadge: "हैकथॉन प्रोटोटाइप",
    simTime: "सिम समय",
    speed: "गति",
    active: "सक्रिय",
    onTime: "समय पर",
    co2Saved: "CO₂ बचत",
    start: "प्रारंभ",
    pause: "रोकें",
    resume: "फिर से शुरू",
    reset: "रीसेट",
    language: "भाषा",
    english: "अंग्रेज़ी",
    hindi: "हिंदी",
    version: "Google Solution Challenge 2026",
    welcome: "SOLV में आपका स्वागत है",
    loginTagline: "बुद्धिमान आवश्यक वस्तु लॉजिस्टिक्स",
    signInWithGoogle: "Google से साइन इन करें",
    logout: "लॉग आउट",
  },
};

function useLanguage() {
  const [lang, setLang] = useState(() => localStorage.getItem("solv-lang") || "en");
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const switchLang = (next) => {
    setLang(next);
    localStorage.setItem("solv-lang", next);
  };
  return { lang, t, switchLang };
}

function getNavSections(t) {
  return [
    {
      label: t.operations,
      items: [
        { key: "dashboard", label: t.dashboard, icon: "📊" },
        { key: "map", label: t.liveMap, icon: "🗺️" },
        { key: "liveOps", label: t.liveOps, icon: "⚡" },
      ],
    },
    {
      label: t.intelligence,
      items: [
        { key: "forecast", label: t.forecast, icon: "🔮" },
        { key: "inventory", label: t.inventory, icon: "📦" },
        { key: "scenarios", label: t.scenarios, icon: "🎬" },
      ],
    },
    {
      label: t.network,
      items: [
        { key: "network", label: t.networkView, icon: "🌐" },
        { key: "objectives", label: t.objectives, icon: "🎯" },
        { key: "events", label: t.events, icon: "📡" },
      ],
    },
    {
      label: t.analytics,
      items: [
        { key: "impact", label: t.impact, icon: "🌍" },
      ],
    },
    {
      label: t.settings,
      items: [
        { key: "settings", label: t.settings, icon: "⚙️" },
      ],
    },
  ];
}

function Sidebar({ active, onNavigate, collapsed, onToggle, t }) {
  const sections = getNavSections(t);
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : "open"}`}>
      <div className="sidebar-header">
        <div className="logo-mark">SOLV</div>
        {!collapsed && <span className="logo-text">Intelligent Logistics</span>}
        <button className="collapse-btn" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? "\u203A" : "\u2039"}
        </button>
      </div>
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.label} className="nav-section">
            {!collapsed && <div className="nav-section-label">{section.label}</div>}
            {section.items.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${active === item.key ? "active" : ""}`}
                onClick={() => onNavigate(item.key)}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        {!collapsed && <div className="version">{t.version}</div>}
      </div>
    </aside>
  );
}

function StatusBar({ dashboard, metrics, t }) {
  const sim = dashboard?.simulation;
  const [displayTime, setDisplayTime] = useState(sim?.simulation_time);

  useEffect(() => {
    setDisplayTime(sim?.simulation_time);
  }, [sim?.simulation_time]);

  useEffect(() => {
    if (sim?.status !== "running" || !sim?.simulation_time || !sim?.speed_multiplier) return;

    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const dtSec = (now - lastTick) / 1000;
      lastTick = now;

      setDisplayTime(prev => {
        if (!prev) return prev;
        const d = new Date(prev.endsWith("Z") ? prev : prev + "Z");
        if (isNaN(d.getTime())) return prev;
        d.setMilliseconds(d.getMilliseconds() + dtSec * sim.speed_multiplier * 1000);
        return d.toISOString().replace("Z", "");
      });
    }, 100);

    return () => clearInterval(interval);
  }, [sim?.status, sim?.simulation_time, sim?.speed_multiplier]);

  return (
    <div className="status-bar">
      <div className="status-pill-group">
        <span className={`status-dot ${sim?.status === "running" ? "live" : ""}`} />
        <span className="status-text">{sim?.status ?? "idle"}</span>
      </div>
      <div className="status-pill-group">
        <span className="status-label">{t.simTime}</span>
        <span className="status-value">{displayTime?.slice(0, 19).replace("T", " ") ?? "--"}</span>
      </div>
      <div className="status-pill-group">
        <span className="status-label">{t.speed}</span>
        <span className="status-value">{sim?.speed_multiplier ?? 0}x</span>
      </div>
      <div className="status-pill-group">
        <span className="status-label">{t.active}</span>
        <span className="status-value">{metrics?.active_trucks ?? 0} trucks</span>
      </div>
      <div className="status-pill-group">
        <span className="status-label">{t.onTime}</span>
        <span className="status-value">{metrics?.on_time_delivery_pct ?? 0}%</span>
      </div>
      <div className="status-pill-group">
        <span className="status-label">{t.co2Saved}</span>
        <span className="status-value">{(metrics?.co2_saved_kg ?? 0).toFixed(1)} kg</span>
      </div>
    </div>
  );
}

function SimControls({ onAction, t }) {
  return (
    <div className="sim-controls">
      <button className="sim-btn primary" onClick={() => onAction("/api/simulation/start", { speed_multiplier: 180 }, t.start)}>{t.start}</button>
      <button className="sim-btn" onClick={() => onAction("/api/simulation/pause", {}, t.pause)}>{t.pause}</button>
      <button className="sim-btn" onClick={() => onAction("/api/simulation/resume", {}, t.resume)}>{t.resume}</button>
      <button className="sim-btn danger" onClick={() => onAction("/api/simulation/reset", {}, t.reset)}>{t.reset}</button>
    </div>
  );
}

function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  const start = useCallback((lang = "en-IN") => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, []);

  return { isListening, transcript, start, reset: () => setTranscript("") };
}

export default function App() {
  const { lang, t, switchLang } = useLanguage();
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setActiveView("dashboard");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const [dashboard, setDashboard] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [events, setEvents] = useState([]);
  const [riskForecast, setRiskForecast] = useState([]);
  const [inventoryForecast, setInventoryForecast] = useState([]);
  const [proactiveDispatches, setProactiveDispatches] = useState([]);
  const [auditChain, setAuditChain] = useState([]);
  const [cloudHealth, setCloudHealth] = useState(null);
  const [blockchainVerify, setBlockchainVerify] = useState(null);
  const [voiceConfig, setVoiceConfig] = useState(null);
  const [aiActivity, setAiActivity] = useState(null);
  const [scenarioKey, setScenarioKey] = useState("");
  const [scenarioComparison, setScenarioComparison] = useState(null);
  const [scalingFleet, setScalingFleet] = useState(false);
  const [voiceIncidentType, setVoiceIncidentType] = useState("road_blockage");
  const [voiceNote, setVoiceNote] = useState("");

  const deferredVehicles = useDeferredValue(dashboard?.vehicles ?? []);
  const voice = useVoiceInput();

  const refreshAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [
        d, f, v, dr, o, r, s, rec, m, e, rf, inv, pd, ai
      ] = await Promise.all([
        apiFetch("/api/dashboard"),
        apiFetch("/api/facilities"),
        apiFetch("/api/vehicles"),
        apiFetch("/api/drivers"),
        apiFetch("/api/objectives"),
        apiFetch("/api/routes"),
        apiFetch("/api/scenarios"),
        apiFetch("/api/recommendations"),
        apiFetch("/api/metrics/sdg"),
        apiFetch("/api/events/news?relevant_only=true"),
        apiFetch("/api/forecast/risk?hours=12").catch(() => []),
        apiFetch("/api/inventory/forecasts").catch(() => []),
        apiFetch("/api/inventory/proactive-dispatches").catch(() => []),
        apiFetch("/api/metrics/ai-activity").catch(() => null),
      ]);
      startTransition(() => {
        setDashboard(d);
        setFacilities(f);
        setVehicles(v);
        setDrivers(dr);
        setObjectives(o);
        setRoutes(r);
        setScenarios(s);
        setRecommendations(rec);
        setMetrics(m);
        setEvents(e);
        setRiskForecast(rf);
        setInventoryForecast(inv);
        setProactiveDispatches(pd);
        setAiActivity(ai);
        setError("");
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(true); const id = setInterval(() => refreshAll(false), 15000); return () => clearInterval(id); }, [refreshAll]);

  useEffect(() => {
    if (voice.transcript) {
      const text = voice.transcript.toLowerCase();
      const matched = voiceConfig?.incident_types?.find((t) => text.includes(t.label.toLowerCase()) || text.includes(t.key.toLowerCase()));
      if (matched) setVoiceIncidentType(matched.key);
    }
  }, [voice.transcript]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    
    // In production, point directly to the Cloud Run backend instead of the Vite proxy
    const backendHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
      ? window.location.host 
      : "sim-backend-1029069183045.us-central1.run.app";
      
    const socket = new WebSocket(`${protocol}://${backendHost}/ws/operations`);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "simulation_snapshot") {
          startTransition(() => { setDashboard(payload.payload); setMetrics(payload.payload.metrics); });
        }
      } catch {}
    };
    const ping = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send("ping"); }, 15000);
    return () => { clearInterval(ping); socket.close(); };
  }, []);

  const runAction = useCallback(async (path, body = null, msg = "") => {
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify(body ?? {}) });
      if (msg) { 
        setMessage(msg); 
        setError(""); 
        setTimeout(() => setMessage(""), 3000);
      }
      await refreshAll(false);
    } catch (err) { setError(err.message); }
  }, [refreshAll]);

  const facilityLookup = Object.fromEntries(facilities.map((f) => [f.id, f]));
  const objectiveLookup = Object.fromEntries(objectives.map((o) => [o.id, o]));
  const criticalFacilities = (dashboard?.facilities ?? []).filter((f) => f.utilization_pct >= 70).slice(0, 6);

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardView metrics={metrics} criticalFacilities={criticalFacilities} proactiveDispatches={proactiveDispatches} riskForecast={riskForecast} auditChain={auditChain} blockchainVerify={blockchainVerify} facilityLookup={facilityLookup} aiActivity={aiActivity} />;
      case "map":
        return <MapView facilities={facilities} vehicles={dashboard?.vehicles ?? []} objectives={objectives} recommendations={recommendations} activeEvents={dashboard?.active_events ?? []} routeTemplates={routes} riskForecast={riskForecast} vehicleCount={dashboard?.vehicles?.length ?? vehicles.length} onScaleFleet={async (n) => { setScalingFleet(true); try { await runAction("/api/demo/scale-fleet", { target_vehicle_count: n, reset_simulation: true, auto_start: true, speed_multiplier: 180 }); } finally { setScalingFleet(false); } }} isScalingFleet={scalingFleet} />;
      case "liveOps":
        return <LiveOpsView metrics={metrics} deferredVehicles={deferredVehicles} objectiveLookup={objectiveLookup} />;
      case "forecast":
        return <ForecastView riskForecast={riskForecast} />;
      case "inventory":
        return <InventoryView inventoryForecast={inventoryForecast} proactiveDispatches={proactiveDispatches} facilityLookup={facilityLookup} />;
      case "scenarios":
        return <ScenariosView scenarios={scenarios} scenarioKey={scenarioKey} setScenarioKey={setScenarioKey} scenarioComparison={scenarioComparison} setScenarioComparison={setScenarioComparison} runAction={runAction} apiFetch={apiFetch} />;
      case "blockchain":
        return <BlockchainView auditChain={auditChain} blockchainVerify={blockchainVerify} />;
      case "network":
        return <NetworkView facilities={facilities} vehicles={vehicles} />;
      case "objectives":
        return <ObjectivesView objectives={objectives} facilityLookup={facilityLookup} />;
      case "events":
        return <EventsView events={events} />;
      case "impact":
        return <ImpactView metrics={metrics} />;
      case "cloud":
        return <CloudView cloudHealth={cloudHealth} />;
      case "settings":
        return <SettingsView lang={lang} onSwitchLang={switchLang} t={t} />;
      default:
        return <DashboardView metrics={metrics} criticalFacilities={criticalFacilities} proactiveDispatches={proactiveDispatches} riskForecast={riskForecast} auditChain={auditChain} blockchainVerify={blockchainVerify} facilityLookup={facilityLookup} />;
    }
  };

  if (!authReady) {
    return (
      <div className="login-view">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div className="logo-mark large" style={{ margin: "0 auto 16px" }}>SOLV</div>
          <p style={{ color: "#8b8d93" }}>Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView t={t} onLogin={setUser} lang={lang} onSwitchLang={switchLang} />;
  }

  return (
    <div className="app-shell">
      <Sidebar active={activeView} onNavigate={setActiveView} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} t={t} />
      <div className={`main-content ${sidebarCollapsed ? "expanded" : ""}`}>
        <header className="top-bar" lang={lang}>
          <div className="top-bar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <h1>{t.commandCenter}</h1>
            <span className="prototype-badge">{t.prototypeBadge}</span>
          </div>
          <div className="top-bar-right">
            <div className="user-chip">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="user-avatar" referrerPolicy="no-referrer" />
              )}
              <span className="user-name">{user.displayName || user.email || "User"}</span>
              <button className="logout-btn" onClick={handleLogout} title={t.logout}>
                {t.logout}
              </button>
            </div>
            <SimControls onAction={runAction} t={t} />
          </div>
        </header>
        <StatusBar dashboard={dashboard} metrics={metrics} t={t} />
        {message && <div className="banner success">{message}</div>}
        {error && <div className="banner error">{error}</div>}
        {loading && !dashboard ? <div className="loading">Loading intelligence layer...</div> : (
          <main className="view-area">
            {renderView()}
          </main>
        )}
      </div>
    </div>
  );
}
