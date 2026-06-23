import { useEffect, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { usePushNotifications } from "../../../hooks/usePushNotifications";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import { showError, showSuccess } from "../../../utils/toast";
import {
  DEFAULT_SILENT_HOURS_END,
  DEFAULT_SILENT_HOURS_START,
} from "../constants";

const getInitialPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

export function useNotificationSettings() {
  const { userPreferences, saveUserPreferences } = useSettings();
  const { requestPermissionAndRegister } = usePushNotifications();

  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [notifyExpiryReminders, setNotifyExpiryReminders] = useState(true);
  const [notifyStockAlerts, setNotifyStockAlerts] = useState(true);
  const [notifySystemEvents, setNotifySystemEvents] = useState(true);
  const [silentHoursEnabled, setSilentHoursEnabled] = useState(false);
  const [silentHoursStart, setSilentHoursStart] = useState(DEFAULT_SILENT_HOURS_START);
  const [silentHoursEnd, setSilentHoursEnd] = useState(DEFAULT_SILENT_HOURS_END);
  const [permission, setPermission] = useState(getInitialPermission);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the external userPreferences store into editable local form state
    setAlertsEnabled(Boolean(userPreferences?.alertsEnabled));
    setNotifyExpiryReminders(userPreferences?.notificationTypes?.expiryAlerts !== false);
    setNotifyStockAlerts(userPreferences?.notificationTypes?.stockAlerts !== false);
    setNotifySystemEvents(userPreferences?.notificationTypes?.systemEvents !== false);
    setSilentHoursEnabled(Boolean(userPreferences?.silentHours?.enabled));
    setSilentHoursStart(String(userPreferences?.silentHours?.start || DEFAULT_SILENT_HOURS_START));
    setSilentHoursEnd(String(userPreferences?.silentHours?.end || DEFAULT_SILENT_HOURS_END));
  }, [userPreferences]);

  const buildPreferences = (overrides = {}) => ({
    alertsEnabled,
    notificationTypes: {
      expiryAlerts: notifyExpiryReminders,
      stockAlerts: notifyStockAlerts,
      systemEvents: notifySystemEvents,
    },
    silentHours: {
      enabled: silentHoursEnabled,
      start: silentHoursStart,
      end: silentHoursEnd,
    },
    ...overrides,
  });

  const handleToggleAlerts = async () => {
    if (!("Notification" in window)) {
      showError("This browser does not support notifications");
      setPermission("unsupported");
      return;
    }

    const next = !alertsEnabled;

    if (next) {
      const perm = await requestPermissionAndRegister();
      setPermission(perm);
      if (perm !== "granted") {
        showError("Notification permission was not granted");
        return;
      }
    }

    const previous = alertsEnabled;
    setAlertsEnabled(next);

    try {
      await saveUserPreferences(buildPreferences({ alertsEnabled: next }));
      showSuccess(`Alerts ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setAlertsEnabled(previous);
      showError(toUserFacingErrorMessage(error, "Could not update alerts. Please try again"));
    }
  };

  const handleToggleExpiryReminders = async () => {
    const next = !notifyExpiryReminders;
    const previous = notifyExpiryReminders;
    setNotifyExpiryReminders(next);

    try {
      await saveUserPreferences(
        buildPreferences({
          notificationTypes: {
            expiryAlerts: next,
            stockAlerts: notifyStockAlerts,
            systemEvents: notifySystemEvents,
          },
        }),
      );
      showSuccess(`Expiry reminders ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setNotifyExpiryReminders(previous);
      showError(toUserFacingErrorMessage(error, "Could not update reminders. Please try again"));
    }
  };

  const handleToggleStockAlerts = async () => {
    const next = !notifyStockAlerts;
    const previous = notifyStockAlerts;
    setNotifyStockAlerts(next);

    try {
      await saveUserPreferences(
        buildPreferences({
          notificationTypes: {
            expiryAlerts: notifyExpiryReminders,
            stockAlerts: next,
            systemEvents: notifySystemEvents,
          },
        }),
      );
      showSuccess(`Stock alerts ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setNotifyStockAlerts(previous);
      showError(toUserFacingErrorMessage(error, "Could not update stock alerts. Please try again"));
    }
  };

  const handleToggleSystemEvents = async () => {
    const next = !notifySystemEvents;
    const previous = notifySystemEvents;
    setNotifySystemEvents(next);

    try {
      await saveUserPreferences(
        buildPreferences({
          notificationTypes: {
            expiryAlerts: notifyExpiryReminders,
            stockAlerts: notifyStockAlerts,
            systemEvents: next,
          },
        }),
      );
      showSuccess(`System event alerts ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setNotifySystemEvents(previous);
      showError(`Could not update system event alerts. ${error?.message || ""}`);
    }
  };

  const handleSilentHoursToggle = async () => {
    const next = !silentHoursEnabled;
    const previous = silentHoursEnabled;
    setSilentHoursEnabled(next);

    try {
      await saveUserPreferences(
        buildPreferences({
          silentHours: {
            enabled: next,
            start: silentHoursStart,
            end: silentHoursEnd,
          },
        }),
      );
      showSuccess(`Silent hours ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setSilentHoursEnabled(previous);
      showError(toUserFacingErrorMessage(error, "Could not update silent hours. Please try again"));
    }
  };

  const handleSaveSilentHoursRange = async () => {
    if (!silentHoursStart || !silentHoursEnd) {
      showError("Please select both start and end times");
      return;
    }

    try {
      await saveUserPreferences(buildPreferences());
      showSuccess("Silent hours updated");
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not update silent hours. Please try again"));
    }
  };

  return {
    permission,
    alertsEnabled,
    notifyExpiryReminders,
    notifyStockAlerts,
    notifySystemEvents,
    silentHoursEnabled,
    silentHoursStart,
    setSilentHoursStart,
    silentHoursEnd,
    setSilentHoursEnd,
    handleToggleAlerts,
    handleToggleExpiryReminders,
    handleToggleStockAlerts,
    handleToggleSystemEvents,
    handleSilentHoursToggle,
    handleSaveSilentHoursRange,
  };
}
