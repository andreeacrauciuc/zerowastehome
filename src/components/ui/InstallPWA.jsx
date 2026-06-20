import { useEffect, useRef, useState } from "react";
import "../../styles/components/common/UI/InstallPWA.scss";

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
      className="install-pwa-banner"
    >
      <span className="install-pwa-text">
        Install ZeroWasteHome on your device
      </span>
      <div className="install-pwa-actions">
        <button
          type="button"
          onClick={handleDismiss}
          className="install-pwa-btn install-pwa-btn--dismiss"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="install-pwa-btn install-pwa-btn--install"
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default InstallPWA;
