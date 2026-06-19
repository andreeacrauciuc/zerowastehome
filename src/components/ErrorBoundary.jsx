import React from "react";
import { showError } from "../utils/toast";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    showError("Something went wrong while loading this page. Please reload and try again.");
  }

  handleReload = () => {
    try {
      sessionStorage.clear();
    } catch {
      // ignore storage failures; the reload below must still happen
    }

    try {
      const PRESERVE_PREFIXES = [
        "zw_inventory_items",
        "zw_shopping_items",
        "zw_impact_history",
      ];
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        const isProtected = PRESERVE_PREFIXES.some(
          (prefix) => key === prefix || key.startsWith(`${prefix}:`),
        );
        if (!isProtected) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore storage failures; the reload below must still happen
    }

    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const env = import.meta.env || {};
      const isDev = env.DEV === true && env.PROD !== true;

      return (
        <section
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "rgba(239, 236, 228, 0.95)",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.72)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.14)",
              padding: "28px",
              textAlign: "center",
            }}
          >
            <img
              src="/pwa-192x192.png"
              alt="ZeroWasteHome"
              width={64}
              height={64}
              style={{ width: "64px", height: "64px", objectFit: "contain", marginBottom: "12px" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <h2 style={{ margin: 0, color: "#1a3d2b" }}>Something went wrong.</h2>
            <p style={{ marginTop: "10px", color: "#355b3e" }}>
              An unexpected error occurred. Please reload the page.
            </p>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  border: 0,
                  borderRadius: "999px",
                  padding: "10px 18px",
                  background: "#355b3e",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  border: "1px solid #355b3e",
                  borderRadius: "999px",
                  padding: "10px 18px",
                  background: "transparent",
                  color: "#355b3e",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Go to home
              </button>
            </div>

            {isDev && error && (
              <details
                style={{
                  marginTop: "18px",
                  textAlign: "left",
                  background: "rgba(15, 23, 42, 0.04)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 700, color: "#1a3d2b" }}>
                  Error details (development only)
                </summary>
                <pre
                  style={{
                    marginTop: "10px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "0.78rem",
                    color: "#7f1d1d",
                  }}
                >
                  {String(error.message || error)}
                  {errorInfo?.componentStack ? `\n${errorInfo.componentStack}` : ""}
                </pre>
              </details>
            )}
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
