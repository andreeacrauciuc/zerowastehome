/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../features/auth/context/AuthContext";

const SettingsContext = createContext(null);

export const DEFAULT_USER_PREFERENCES = {
  alertsEnabled: false,
  currency: "EUR",
  notificationTypes: {
    expiryAlerts: true,
    stockAlerts: true,
    systemEvents: true,
  },
  silentHours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
  },
};

const buildPrefsKey = (uid) => `zw_user_preferences:${uid}`;
const buildAlertsKey = (uid) => `zw_alerts_enabled:${uid}`;
const buildCurrencyKey = (uid) => `zw_currency:${uid}`;

const clearLegacyPreferenceKeys = () => {
  try {
    localStorage.removeItem("zw_user_preferences");
    localStorage.removeItem("zw_alerts_enabled");
    localStorage.removeItem("zw_currency");
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem("zw_user_preferences");
    sessionStorage.removeItem("zw_alerts_enabled");
    sessionStorage.removeItem("zw_currency");
  } catch {
    /* ignore */
  }
};

const normalizeUserPreferences = (raw = {}) => {
  const notificationTypes = raw?.notificationTypes || {};
  const silentHours = raw?.silentHours || {};

  return {
    alertsEnabled:
      typeof raw?.alertsEnabled === "boolean"
        ? raw.alertsEnabled
        : DEFAULT_USER_PREFERENCES.alertsEnabled,
    currency:
      typeof raw?.currency === "string" && ["EUR", "RON"].includes(raw.currency)
        ? raw.currency
        : DEFAULT_USER_PREFERENCES.currency,
    notificationTypes: {
      expiryAlerts:
        typeof notificationTypes?.expiryAlerts === "boolean"
          ? notificationTypes.expiryAlerts
          : DEFAULT_USER_PREFERENCES.notificationTypes.expiryAlerts,
      stockAlerts:
        typeof notificationTypes?.stockAlerts === "boolean"
          ? notificationTypes.stockAlerts
          : DEFAULT_USER_PREFERENCES.notificationTypes.stockAlerts,
      systemEvents:
        typeof notificationTypes?.systemEvents === "boolean"
          ? notificationTypes.systemEvents
          : DEFAULT_USER_PREFERENCES.notificationTypes.systemEvents,
    },
    silentHours: {
      enabled:
        typeof silentHours?.enabled === "boolean"
          ? silentHours.enabled
          : DEFAULT_USER_PREFERENCES.silentHours.enabled,
      start:
        typeof silentHours?.start === "string" && silentHours.start
          ? silentHours.start
          : DEFAULT_USER_PREFERENCES.silentHours.start,
      end:
        typeof silentHours?.end === "string" && silentHours.end
          ? silentHours.end
          : DEFAULT_USER_PREFERENCES.silentHours.end,
    },
  };
};

export const SettingsProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userPreferences, setUserPreferences] = useState(DEFAULT_USER_PREFERENCES);
  const [isSettingsReady, setIsSettingsReady] = useState(() => !currentUser?.uid);

  useEffect(() => {
    if (!currentUser?.uid) {
      Promise.resolve().then(() => {
        setUserPreferences(DEFAULT_USER_PREFERENCES);
        setIsSettingsReady(true);
      });
      return undefined;
    }

    const userRef = doc(db, "users", currentUser.uid);
    let isActive = true;
    clearLegacyPreferenceKeys();

    try {
      const cached = JSON.parse(
        localStorage.getItem(buildPrefsKey(currentUser.uid)) || "{}"
      );
      Promise.resolve().then(() => setUserPreferences(normalizeUserPreferences(cached)));
    } catch (error) {
      console.error("SettingsContext: failed to read cached preferences.", error);
      Promise.resolve().then(() => setUserPreferences(DEFAULT_USER_PREFERENCES));
    }

    getDoc(userRef)
      .then((snapshot) => {
        if (!isActive) return;
        const data = snapshot.exists() ? snapshot.data() : {};
        const next = normalizeUserPreferences(data?.userPreferences || {});
        setUserPreferences(next);
        try {
          localStorage.setItem(buildPrefsKey(currentUser.uid), JSON.stringify(next));
          localStorage.setItem(buildAlertsKey(currentUser.uid), String(next.alertsEnabled));
          localStorage.setItem(buildCurrencyKey(currentUser.uid), next.currency);
        } catch {
          // storage may be unavailable in some environments
        }
      })
      .catch((error) => {
        console.error("SettingsContext: failed to load preferences.", error);
      })
      .finally(() => {
        if (isActive) setIsSettingsReady(true);
      });

    return () => {
      isActive = false;
    };
  }, [currentUser?.uid]);

  const saveUserPreferences = useCallback(
    async (partial) => {
      if (!currentUser?.uid) {
        throw new Error("No authenticated user.");
      }
      const partialChanges = partial || {};

      const fieldUpdates = {};
      Object.entries(partialChanges).forEach(([key, value]) => {
        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          (key === "notificationTypes" || key === "silentHours")
        ) {
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            fieldUpdates[`userPreferences.${key}.${nestedKey}`] = nestedValue;
          });
        } else {
          fieldUpdates[`userPreferences.${key}`] = value;
        }
      });

      if (Object.keys(fieldUpdates).length === 0) {
        return;
      }

      let rollbackChanges = null;

      setUserPreferences((prev) => {
        rollbackChanges = {};
        if ("alertsEnabled" in partialChanges)
          rollbackChanges.alertsEnabled = prev.alertsEnabled;
        if ("currency" in partialChanges)
          rollbackChanges.currency = prev.currency;
        if (partialChanges?.notificationTypes) {
          rollbackChanges.notificationTypes = {};
          Object.keys(partialChanges.notificationTypes).forEach((k) => {
            rollbackChanges.notificationTypes[k] = prev.notificationTypes?.[k];
          });
        }
        if (partialChanges?.silentHours) {
          rollbackChanges.silentHours = {};
          Object.keys(partialChanges.silentHours).forEach((k) => {
            rollbackChanges.silentHours[k] = prev.silentHours?.[k];
          });
        }

        const next = normalizeUserPreferences({
          ...prev,
          ...partialChanges,
          notificationTypes: {
            ...prev.notificationTypes,
            ...(partialChanges?.notificationTypes || {}),
          },
          silentHours: {
            ...prev.silentHours,
            ...(partialChanges?.silentHours || {}),
          },
        });
        try {
          localStorage.setItem(buildPrefsKey(currentUser.uid), JSON.stringify(next));
          localStorage.setItem(buildAlertsKey(currentUser.uid), String(next.alertsEnabled));
          localStorage.setItem(buildCurrencyKey(currentUser.uid), next.currency);
        } catch {
          // ignore storage errors
        }
        return next;
      });

      try {
        await updateDoc(doc(db, "users", currentUser.uid), fieldUpdates);
      } catch (error) {
        console.error("SettingsContext: failed to save preferences.", error);
        setUserPreferences((prev) => {
          const reverted = normalizeUserPreferences({
            ...prev,
            ...rollbackChanges,
            notificationTypes: {
              ...prev.notificationTypes,
              ...(rollbackChanges?.notificationTypes || {}),
            },
            silentHours: {
              ...prev.silentHours,
              ...(rollbackChanges?.silentHours || {}),
            },
          });
          try {
            localStorage.setItem(buildPrefsKey(currentUser.uid), JSON.stringify(reverted));
            localStorage.setItem(buildAlertsKey(currentUser.uid), String(reverted.alertsEnabled));
            localStorage.setItem(buildCurrencyKey(currentUser.uid), reverted.currency);
          } catch {
            // ignore storage errors
          }
          return reverted;
        });
        throw error;
      }
    },
    [currentUser]
  );

  const value = useMemo(
    () => ({
      userPreferences,
      isSettingsReady,
      saveUserPreferences,
    }),
    [isSettingsReady, saveUserPreferences, userPreferences]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
};
