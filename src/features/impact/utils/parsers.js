export const parseDate = (value) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const parseMoney = (entry) => {
  const price = Number(entry?.price);
  if (Number.isFinite(price) && price >= 0) return price;

  const candidates = [
    entry?.consumedValue,
    entry?.initialInvestment,
    entry?.investedValueLeft,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const parsed = Number(candidates[i]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

export const parseCategoryName = (entry) => {
  if (entry?.category && typeof entry.category === "object") {
    return (
      String(
        entry.category.name || entry.category.id || entry?.categoryName || "Other",
      ).trim() || "Other"
    );
  }
  return String(entry?.categoryName || entry?.category || "Other").trim() || "Other";
};

export const parseQuantity = (entry) => {
  const candidates = [
    entry?.quantity,
    entry?.consumedQuantity,
    entry?.purchasedQuantity,
    entry?.initialQuantity,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const parsed = Number(candidates[i]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 1;
};

export const safeNumber = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

const parseWeightValueToKg = (value, unitHint = "") => {
  if (value === null || value === undefined || value === "") return 0;
  const hint = String(unitHint || "").toLowerCase().trim();
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num) || num <= 0) return 0;

  if (hint === "mg") return num / 1_000_000;
  if (hint === "g") return num / 1000;
  if (hint === "kg") return num;
  if (hint === "ml") return num / 1000;
  if (hint === "l") return num;
  if (hint === "oz") return num * 0.0283495;
  if (hint === "lb") return num * 0.453592;
  return num;
};

export const getSavedWeightKg = (entry) => {
  const qty = parseQuantity(entry);

  const totalWeightCandidates = [
    entry?.totalWeightKg,
    entry?.weightTotalKg,
    entry?.totalWeight,
    entry?.weightTotal,
  ];
  for (let i = 0; i < totalWeightCandidates.length; i += 1) {
    const parsed = parseWeightValueToKg(totalWeightCandidates[i], entry?.weightUnit);
    if (parsed > 0) return parsed;
  }

  const perItemWeightCandidates = [
    entry?.weightKg,
    entry?.weightPerItemKg,
    entry?.weight,
    entry?.unitWeight,
  ];
  for (let i = 0; i < perItemWeightCandidates.length; i += 1) {
    const parsed = parseWeightValueToKg(
      perItemWeightCandidates[i],
      entry?.weightUnit || entry?.unit,
    );
    if (parsed > 0) return parsed * qty;
  }

  return qty * 0.2;
};

export const toDayKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const toMonthKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const LIFETIME_SAVED_STATUSES = ["eaten", "saved", "consumed", "cooked"];

const isLifetimeSavedEntry = (entry) =>
  LIFETIME_SAVED_STATUSES.includes(String(entry?.status || "").toLowerCase());

export const sumLifetimeFoodSavedKg = (history) =>
  (Array.isArray(history) ? history : []).reduce((acc, entry) => {
    if (!isLifetimeSavedEntry(entry)) return acc;
    const qty = Number(entry?.quantity || entry?.initialQuantity || 0);
    const unit = String(entry?.unit || "").toLowerCase();
    let kg = 0;
    if (unit === "kg" || unit === "l") kg = qty;
    else if (unit === "g" || unit === "ml") kg = qty / 1000;
    else kg = qty * 0.3;
    return acc + kg;
  }, 0);

export const sumLifetimeSavings = (history) =>
  (Array.isArray(history) ? history : []).reduce((acc, entry) => {
    if (!isLifetimeSavedEntry(entry)) return acc;
    const consumedValue = Number(entry?.consumedValue);
    if (Number.isFinite(consumedValue) && consumedValue > 0) return acc + consumedValue;
    const price = Number(entry?.price);
    if (Number.isFinite(price) && price > 0) return acc + price;
    const investment = Number(entry?.initialInvestment);
    if (Number.isFinite(investment) && investment > 0) return acc + investment;
    return acc;
  }, 0);
