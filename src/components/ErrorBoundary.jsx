import React from "react";
import { showError } from "../utils/toast";
import "../styles/components/common/ErrorBoundary.scss";

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
        <section className="error-boundary-screen">
          <div className="error-boundary-card">
            <img
              src="/pwa-192x192.png"
              alt="ZeroWasteHome"
              width={64}
              height={64}
              className="error-boundary-logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <h2 className="error-boundary-title">Something went wrong.</h2>
            <p className="error-boundary-text">
              An unexpected error occurred. Please reload the page.
            </p>

            <div className="error-boundary-actions">
              <button
                type="button"
                onClick={this.handleReload}
                className="error-boundary-btn error-boundary-btn--primary"
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="error-boundary-btn error-boundary-btn--ghost"
              >
                Go to home
              </button>
            </div>

            {isDev && error && (
              <details className="error-boundary-details">
                <summary className="error-boundary-summary">
                  Error details (development only)
                </summary>
                <pre className="error-boundary-stack">
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
