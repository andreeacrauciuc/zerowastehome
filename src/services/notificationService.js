const CRITICAL_WINDOW_HOURS = 48;
const EXPIRED_AUTODISMISS_HOURS = 7 * 24;

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getExpiryDate = (item) => {
  const rawDate = item?.expiryDate || item?.expiry;
  if (!rawDate) return null;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const getHoursUntil = (date, nowTs) => {
  if (!date) return null;
  return (date.getTime() - nowTs) / (1000 * 60 * 60);
};

const normalizePreferences = (userPreferences = {}) => ({
  alertsEnabled:
    typeof userPreferences?.alertsEnabled === "boolean" ? userPreferences.alertsEnabled : true,
  notificationTypes: {
    expiryAlerts: userPreferences?.notificationTypes?.expiryAlerts !== false,
    stockAlerts: userPreferences?.notificationTypes?.stockAlerts !== false,
    systemEvents: userPreferences?.notificationTypes?.systemEvents !== false,
  },
  silentHours: {
    enabled: Boolean(userPreferences?.silentHours?.enabled),
    start: String(userPreferences?.silentHours?.start || "22:00"),
    end: String(userPreferences?.silentHours?.end || "07:00"),
  },
});

const parseTimeToMinutes = (value) => {
  const text = String(value || "");
  const [hh, mm] = text.split(":").map((part) => Number(part));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
};

export const isWithinSilentHours = (userPreferences = {}, now = new Date()) => {
  const prefs = normalizePreferences(userPreferences);
  if (!prefs.silentHours.enabled) return false;

  const startMinutes = parseTimeToMinutes(prefs.silentHours.start);
  const endMinutes = parseTimeToMinutes(prefs.silentHours.end);
  if (startMinutes === null || endMinutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const buildCriticalAlert = (item, hoursUntilExpiry) => {
  const safeHours = Math.max(0, Math.ceil(hoursUntilExpiry));
  return {
    id: `critical-${item.id}`,
    itemId: item.id,
    level: "critical",
    type: "expiry",
    priority: 0,
    hoursUntilExpiry: safeHours,
    message: `${item.name} expires in ${safeHours}h`,
    item,
  };
};

const buildWarningAlert = (item, quantity, minThreshold) => {
  const shortage = Number((minThreshold - quantity).toFixed(2));
  return {
    id: `warning-${item.id}`,
    itemId: item.id,
    level: "warning",
    type: "stock",
    priority: 1,
    shortage,
    message: `${item.name} is below minimum stock`,
    item,
  };
};

const toSystemAlert = (event) => ({
  id: `system-${event.id || event.createdAt || Math.random().toString(16).slice(2)}`,
  itemId: null,
  level: "info",
  type: "system",
  priority: 2,
  message: event?.message || "New system activity.",
  item: null,
  event,
});

const sortNotifications = (a, b) => {
  if (a.priority !== b.priority) return a.priority - b.priority;

  if (a.level === "critical" && b.level === "critical") {
    return a.hoursUntilExpiry - b.hoursUntilExpiry;
  }

  if (a.level === "warning" && b.level === "warning") {
    return b.shortage - a.shortage;
  }

  return a.message.localeCompare(b.message);
};

export const calculateNotifications = (
  inventory = [],
  userPreferences = {},
  options = {}
) => {
  if (!Array.isArray(inventory)) {
    return [];
  }

  if (options?.systemEvents != null && !Array.isArray(options.systemEvents)) {
    return [];
  }

  const now = options?.now ? new Date(options.now) : new Date();
  const nowTs = now.getTime();
  const prefs = normalizePreferences(userPreferences);
  const channel = options?.channel === "push" ? "push" : "in-app";
  const inSilentWindow = channel === "push" && isWithinSilentHours(prefs, now);

  if (!prefs.alertsEnabled) return [];
  if (inSilentWindow) return [];

  const notifications = [];

  (inventory || []).forEach((item) => {
    if (!item?.id || !item?.name) return;

    const expiryDate = getExpiryDate(item);
    const hoursUntilExpiry = getHoursUntil(expiryDate, nowTs);

    if (
      prefs.notificationTypes.expiryAlerts &&
      hoursUntilExpiry !== null &&
      hoursUntilExpiry < CRITICAL_WINDOW_HOURS &&
      hoursUntilExpiry >= -EXPIRED_AUTODISMISS_HOURS
    ) {
      notifications.push(buildCriticalAlert(item, hoursUntilExpiry));
    }

    const quantity = toFiniteNumber(item?.quantity);
    const minThreshold =
      toFiniteNumber(item?.minThreshold) ??
      toFiniteNumber(item?.minimumThreshold) ??
      toFiniteNumber(item?.minQuantity);

    if (
      prefs.notificationTypes.stockAlerts &&
      quantity !== null &&
      minThreshold !== null &&
      quantity < minThreshold
    ) {
      notifications.push(buildWarningAlert(item, quantity, minThreshold));
    }
  });

  if (prefs.notificationTypes.systemEvents) {
    (options?.systemEvents || []).forEach((event) => {
      notifications.push(toSystemAlert(event));
    });
  }

  return notifications.sort(sortNotifications);
};

