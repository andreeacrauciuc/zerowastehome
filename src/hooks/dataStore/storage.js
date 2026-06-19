export const STORAGE_KEYS = {
  inventory: "zw_inventory_items",
  shopping: "zw_shopping_items",
  impact: "zw_impact_history",
  mode: "zw_data_mode_local",
};

const getDataStoreScope = () => {
  try {
    return String(globalThis?.__MW_DATA_STORE_SCOPE__ || "").trim();
  } catch {
    return "";
  }
};

const scopeKey = (key) => {
  const scope = getDataStoreScope();
  return scope ? `${key}:${scope}` : key;
};

const legacyKey = (key) => key;

export const readLocalArray = (key) => {
  try {
    const scopedRaw = localStorage.getItem(scopeKey(key));
    const raw = scopedRaw ?? localStorage.getItem(legacyKey(key));
    const parsed = raw ? JSON.parse(raw) : [];

    if (!scopedRaw && raw) {
      try {
        localStorage.setItem(scopeKey(key), raw);
      } catch {
        // best-effort migration from legacy unscoped cache
      }
    }

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeLocalJson = (key, value) => {
  localStorage.setItem(scopeKey(key), JSON.stringify(value));
};

export const removeLocalItem = (key) => {
  localStorage.removeItem(scopeKey(key));
  localStorage.removeItem(legacyKey(key));
};

export const createLocalId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
