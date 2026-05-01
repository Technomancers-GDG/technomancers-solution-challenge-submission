import { useState } from "react";
import { signInWithGoogle } from "../../firebase";

export function LoginView({ t, onLogin, lang, onSwitchLang }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithGoogle();
      if (onLogin) onLogin(result.user);
    } catch (err) {
      console.error("Login failed:", err);
      setError(err?.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-view">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo-mark large">SOLV</div>
          <h1>{t.welcome || "Welcome to SOLV"}</h1>
          <p>{t.loginTagline || "Intelligent Essential Goods Logistics"}</p>
        </div>

        <div className="login-actions">
          <button
            className="google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                {t.signInWithGoogle || "Sign in with Google"}
              </>
            )}
          </button>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="login-footer">
          <div className="login-lang-toggle">
            <button
              className={`lang-pill ${lang === "en" ? "active" : ""}`}
              onClick={() => onSwitchLang("en")}
              aria-pressed={lang === "en"}
            >
              {t.english || "English"}
            </button>
            <button
              className={`lang-pill ${lang === "hi" ? "active" : ""}`}
              onClick={() => onSwitchLang("hi")}
              aria-pressed={lang === "hi"}
            >
              {t.hindi || "Hindi"}
            </button>
          </div>
          <span className="login-version">{t.version || "Google Solution Challenge 2026"}</span>
        </div>
      </div>
    </div>
  );
}
