import { useEffect, useRef, useState } from "react";

const DISMISS_KEY = "zw-pwa-install-dismissed";
const PROMPT_DELAY_MS = 60_000;

const isMobile = () => {
  if (typeof window === "undefined") return false;
  const narrow = window.innerWidth < 768;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  return narrow || mobileUA;
};

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const deferredPromptRef = useRef(null);
  const delayElapsedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      dismissed = false;
    }
    if (dismissed) return undefined;

    const maybeShow = () => {
      if (delayElapsedRef.current && deferredPromptRef.current && isMobile()) {
        setVisible(true);
      }
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPromptRef.current = event;
      setDeferredPrompt(event);
      maybeShow();
    };

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      deferredPromptRef.current = null;
    };

    const delayTimer = window.setTimeout(() => {
      delayElapsedRef.current = true;
      maybeShow();
    }, PROMPT_DELAY_MS);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(delayTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      // error
    }
    setDeferredPrompt(null);
    deferredPromptRef.current = null;
    setVisible(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // error
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install ZeroWasteHome"
      style={{
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        padding: "14px 16px",
        borderRadius: "16px",
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.1)",
        boxShadow: "0 12px 34px rgba(15, 23, 42, 0.18)",
      }}
    >
      <span style={{ flex: "1 1 180px", fontSize: "0.92rem", fontWeight: 600, color: "#0f172a" }}>
        Install ZeroWasteHome on your device
      </span>
      <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            padding: "0.5rem 0.9rem",
            borderRadius: "10px",
            border: "1px solid rgba(15, 23, 42, 0.15)",
            background: "transparent",
            color: "#334155",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleInstall}
          style={{
            padding: "0.5rem 1.1rem",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg, #10b981, #047857)",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default InstallPWA;
