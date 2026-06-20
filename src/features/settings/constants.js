export const SETTINGS_TABS = [
  { id: "profile", label: "Profile" },
  { id: "household", label: "Household" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Account security" },
];

export const CONSUMED_STATUSES = new Set(["eaten", "saved", "consumed"]);

export const CONSUMED_HISTORY_LIMIT = 5;

export const OWNED_DATA_COLLECTIONS = [
  "inventory",
  "shopping",
  "impact",
  "priceHistory",
];

export const FIRESTORE_BATCH_LIMIT = 450;

export const DEFAULT_SILENT_HOURS_START = "22:00";
export const DEFAULT_SILENT_HOURS_END = "07:00";

export const DEFAULT_CURRENCY = "EUR";
