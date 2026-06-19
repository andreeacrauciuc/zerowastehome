import { useCallback, useEffect, useMemo, useState } from "react";

const WEEKS_WINDOW = 6;
const MIN_WEEKS_PRESENT = 3; 
const IN_STOCK_MIN_QTY = 1;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const normalizeName = (value) => String(value || "").trim().toLowerCase();

const weekIndexOf = (date) => Math.floor(date.getTime() / MS_PER_WEEK);

const buildStorageKey = (scopeId) => `zw_weekly_suggestions:${scopeId || "guest"}`;

const readState = (scopeId) => {
  try {
    const raw = localStorage.getItem(buildStorageKey(scopeId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeState = (scopeId, state) => {
  try {
    localStorage.setItem(buildStorageKey(scopeId), JSON.stringify(state));
  } catch {
    /* storage may be unavailable; suggestions still work for the session */
  }
};

const resolveItemPrice = (entry) => {
  const candidates = [entry?.estimatedPrice, entry?.price, entry?.unitPrice];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Number(n.toFixed(2));
  }
  return 0;
};


export const computeWeeklySuggestions = (impactHistory = [], inventoryItems = []) => {
  const nowWeek = weekIndexOf(new Date());
  const oldestWeek = nowWeek - (WEEKS_WINDOW - 1);

  const byName = new Map();

  for (const entry of impactHistory || []) {
    const name = normalizeName(entry?.name);
    if (!name) continue;
    const when = new Date(entry?.actionDate || entry?.createdAt || 0);
    if (Number.isNaN(when.getTime())) continue;
    const wk = weekIndexOf(when);
    if (wk < oldestWeek || wk > nowWeek) continue; 

    const bucket = byName.get(name) || {
      name: entry?.name || name,
      sampleEntry: entry,
      weeks: new Set(),
      count: 0,
    };
    bucket.weeks.add(wk);
    bucket.count += 1;
    byName.set(name, bucket);
  }

  const inStock = new Set(
    (inventoryItems || [])
      .filter((it) => (Number(it?.quantity) || 0) >= IN_STOCK_MIN_QTY)
      .map((it) => normalizeName(it?.name))
      .filter(Boolean)
  );

  const suggestions = [];
  for (const bucket of byName.values()) {
    if (bucket.weeks.size < MIN_WEEKS_PRESENT) continue;
    if (inStock.has(normalizeName(bucket.name))) continue;

    suggestions.push({
      id: `suggest-${normalizeName(bucket.name)}`,
      name: bucket.name,
      category: bucket.sampleEntry?.category || "Other",
      unit: bucket.sampleEntry?.unit || "pcs",
      estimatedPrice: resolveItemPrice(bucket.sampleEntry),
      weeksPresent: bucket.weeks.size,
      timesConsumed: bucket.count,
    });
  }

  suggestions.sort(
    (a, b) => b.weeksPresent - a.weeksPresent || b.timesConsumed - a.timesConsumed
  );

  return suggestions;
};

const DEFAULT_PANTRY = [
  { name: "Milk", category: "Dairy", unit: "l" },
  { name: "Bread", category: "Bakery", unit: "pcs" },
  { name: "Eggs", category: "Dairy", unit: "pcs" },
  { name: "Tomatoes", category: "Vegetables", unit: "kg" },
  { name: "Bananas", category: "Fruits", unit: "kg" },
];

export const computeFallbackSuggestions = (impactHistory = [], inventoryItems = []) => {
  const inStock = new Set(
    (inventoryItems || [])
      .filter((it) => (Number(it?.quantity) || 0) >= IN_STOCK_MIN_QTY)
      .map((it) => normalizeName(it?.name))
      .filter(Boolean)
  );

  const seen = new Set();
  const out = [];
  const push = (name, category, unit, estimatedPrice) => {
    const key = normalizeName(name);
    if (!key || seen.has(key) || inStock.has(key)) return;
    seen.add(key);
    out.push({
      id: `suggest-${key}`,
      name,
      category: category || "Other",
      unit: unit || "pcs",
      estimatedPrice: Number(estimatedPrice) > 0 ? Number(Number(estimatedPrice).toFixed(2)) : 0,
      weeksPresent: 0,
      timesConsumed: 0,
    });
  };

  for (const e of [...(impactHistory || [])].reverse()) {
    if (out.length >= 5) break;
    push(e?.name, e?.category, e?.unit, e?.estimatedPrice ?? e?.price);
  }
  for (const it of inventoryItems || []) {
    if (out.length >= 5) break;
    push(it?.name, it?.category, it?.unit, it?.estimatedPrice ?? it?.price);
  }
  for (const d of DEFAULT_PANTRY) {
    if (out.length >= 5) break;
    push(d.name, d.category, d.unit);
  }

  return out;
};

export function useWeeklySuggestions({ impactHistory, inventoryItems, scopeId }) {
  const [cycle, setCycle] = useState(() => weekIndexOf(new Date()));
  const [dismissedCycle, setDismissedCycle] = useState(null);
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const thisWeek = weekIndexOf(new Date());
      const saved = readState(scopeId);
      setCycle(thisWeek);
      if (saved && saved.cycle === thisWeek) {
        setDismissedCycle(saved.dismissed ? thisWeek : null);
        setAddedCount(Number(saved.addedCount) || 0);
      } else {
        setDismissedCycle(null);
        setAddedCount(0);
      }
    });
    return () => {
      active = false;
    };
  }, [scopeId]);

  const [showFallback, setShowFallback] = useState(false);

  const ruleSuggestions = useMemo(
    () => computeWeeklySuggestions(impactHistory, inventoryItems),
    [impactHistory, inventoryItems]
  );

  const fallbackSuggestions = useMemo(
    () => computeFallbackSuggestions(impactHistory, inventoryItems),
    [impactHistory, inventoryItems]
  );

  const suggestions =
    ruleSuggestions.length > 0
      ? ruleSuggestions
      : showFallback
        ? fallbackSuggestions
        : [];

  const hasRuleSuggestions = ruleSuggestions.length > 0;

  const isDismissed = dismissedCycle === cycle;

  const dismiss = useCallback(() => {
    setDismissedCycle(cycle);
    writeState(scopeId, { cycle, dismissed: true, addedCount });
  }, [cycle, scopeId, addedCount]);

  const regenerate = useCallback(() => {
    const thisWeek = weekIndexOf(new Date());
    setCycle(thisWeek);
    setDismissedCycle(null);
    setAddedCount(0);
    setShowFallback(true);
    writeState(scopeId, { cycle: thisWeek, dismissed: false, addedCount: 0 });
  }, [scopeId]);

  const markAdded = useCallback(
    (count) => {
      const n = Number(count) || 0;
      setAddedCount(n);
      writeState(scopeId, { cycle, dismissed: false, addedCount: n });
    },
    [cycle, scopeId]
  );

  return {
    suggestions,
    hasRuleSuggestions,
    isDismissed,
    addedCount,
    dismiss,
    regenerate,
    markAdded,
  };
}
