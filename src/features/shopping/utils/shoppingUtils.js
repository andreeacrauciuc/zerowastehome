import {
  buildCrossListDuplicateGuard,
  hasNameOverlap,
  normalizeItemName,
} from "../../../utils/itemDeduplication";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { formatCurrency } from "../../../utils/currency";
import { EUR_TO_CO2_KG } from "../../../constants/co2";
import { t } from "../../../locales";

export const PANTRY_ESSENTIALS = [
  "salt",
  "pepper",
  "oil",
  "olive oil",
  "eggs",
  "egg",
  "flour",
  "sugar",
  "rice",
  "pasta",
  "butter",
  "vinegar",
  "milk",
];

export { EUR_TO_CO2_KG };
export const SWAP_SAVINGS_STORAGE_KEY = "zw_pantry_swap_savings";

export const normalizeName = normalizeItemName;

export const formatQuantity = (value) => {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty <= 0) return "0";
  if (Number.isInteger(qty)) return String(qty);
  return String(Number(qty.toFixed(2)));
};

export const getItemLabel = (item) =>
  typeof item?.name === "object" ? item?.name?.name || "Ingredient" : item?.name;

export const getExplicitPrice = (item) => {
  const raw = item?.estimatedPrice;
  if (raw === null || raw === undefined || raw === "") return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

export const readLocalSwapSavings = () => {
  if (typeof window === "undefined") return 0;

  try {
    const raw = localStorage.getItem(SWAP_SAVINGS_STORAGE_KEY);
    if (!raw) return 0;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.date !== getTodayKey()) return 0;

    const total = Number(parsed.total);
    return Number.isFinite(total) && total > 0 ? total : 0;
  } catch {
    return 0;
  }
};

export const readTodaySwapSavings = async (db, uid) => {
  if (!db || !uid) return readLocalSwapSavings();

  try {
    const todayKey = getTodayKey();
    const ref = doc(db, "users", uid, "swapSavings", todayKey);
    const snap = await getDoc(ref);
    if (!snap.exists()) return readLocalSwapSavings();

    const amount = Number(snap.data()?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return 0;

    if (typeof window !== "undefined") {
      localStorage.setItem(
        SWAP_SAVINGS_STORAGE_KEY,
        JSON.stringify({ date: todayKey, total: Number(amount.toFixed(2)) })
      );
    }

    return Number(amount.toFixed(2));
  } catch {
    return readLocalSwapSavings();
  }
};

export const writeTodaySwapSavings = async (value, db, uid) => {
  if (typeof window === "undefined") return;

  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const total = Number(safe.toFixed(2));
  const todayKey = getTodayKey();
  localStorage.setItem(
    SWAP_SAVINGS_STORAGE_KEY,
    JSON.stringify({ date: todayKey, total })
  );

  if (!db || !uid) return;
  await setDoc(doc(db, "users", uid, "swapSavings", todayKey), {
    date: todayKey,
    amount: total,
  });
};

export const buildHistoricalPriceByName = (inventory = []) =>
  inventory.reduce((acc, inv) => {
    const key = normalizeName(inv?.name);
    if (!key) return acc;

    const storedUnitPrice = Number(inv?.unitPrice);
    const qty = Number(inv?.quantity) || Number(inv?.initialQuantity) || 0;
    const price = Number(inv?.price);
    const initialQuantity = Number(inv?.initialQuantity);
    const isCorruptedTinyQty =
      Number.isFinite(initialQuantity) && initialQuantity > 0 && initialQuantity < 0.1;
    const storedUnitPriceIsTrustworthy =
      Number.isFinite(storedUnitPrice) && storedUnitPrice > 0 && !isCorruptedTinyQty;
    const saneQty = isCorruptedTinyQty ? Math.max(qty, 1) : qty;
    const derivedUnitPrice =
      Number.isFinite(price) && price > 0 && Number.isFinite(saneQty) && saneQty > 0
        ? price / saneQty
        : 0;
    const unitPrice = storedUnitPriceIsTrustworthy ? storedUnitPrice : derivedUnitPrice;

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return acc;

    if (!acc[key]) {
      acc[key] = { sum: 0, count: 0 };
    }

    acc[key].sum += unitPrice;
    acc[key].count += 1;
    return acc;
  }, {});

export const getHistoricalPrice = (item, historicalPriceByName) => {
  const target = normalizeName(item?.name);
  if (!target) return null;

  const exact = historicalPriceByName[target];
  if (exact && exact.count > 0) {
    return exact.sum / exact.count;
  }

  return null;
};

const COMPARABLE_UNIT_GROUPS = [
  new Set(["kg", "g", "gr"]),
  new Set(["l", "ml"]),
  new Set(["pcs", "buc", "unit", "units", "piece", "pieces"]),
];

const unitsAreComparable = (unitA, unitB) => {
  if (!unitA || !unitB) return false;
  const a = String(unitA).trim().toLowerCase();
  const b = String(unitB).trim().toLowerCase();
  if (a === b) return true;
  return COMPARABLE_UNIT_GROUPS.some((group) => group.has(a) && group.has(b));
};

export const resolveItemPrice = (item, historicalPriceByName) => {
  const explicit = getExplicitPrice(item);
  if (explicit !== null) {
    return { price: explicit, source: "explicit" };
  }

  const historical = getHistoricalPrice(item, historicalPriceByName);
  if (historical !== null) {
    const itemUnit = String(item?.unit || "").trim().toLowerCase();
    const matchedItem = historicalPriceByName[normalizeName(item?.name)];
    const inventoryUnit = String(
      matchedItem?.unit || matchedItem?.inventoryUnit || ""
    ).trim().toLowerCase();

    const canScale = unitsAreComparable(itemUnit, inventoryUnit);
    if (canScale) {
      const qty = Number(item?.quantity) || 1;
      const scaled = Number.isFinite(qty) && qty > 0 ? historical * qty : historical;
      return { price: scaled, source: "historical" };
    }

    return { price: historical, source: "historical" };
  }

  return { price: null, source: "unknown" };
};

export const buildInventoryByName = (inventory = []) => {
  const map = new Map();
  (inventory || []).forEach((inv) => {
    const key = normalizeName(inv?.name);
    if (!key) return;
    const existing = map.get(key);
    const existingQty = Number(existing?.quantity) || 0;
    const currentQty = Number(inv?.quantity) || 0;
    if (!existing || currentQty > existingQty) {
      map.set(key, inv);
    }
  });
  return map;
};

export const checkBeforeAdding = ({
  name,
  shoppingItems = [],
  inventoryItems = [],
  excludeShoppingItemId = null,
}) => {
  const result = buildCrossListDuplicateGuard({
    name,
    shoppingItems,
    inventoryItems,
    excludeShoppingItemId,
  });

  if (!result.isDuplicate) return result;
  if (result.source === "shopping") {
    return { ...result, source: "shopping list" };
  }

  return result;
};

export const findInventoryCollision = (shoppingItem, inventoryByName, inventory = []) => {
  const target = normalizeName(shoppingItem?.name);
  if (!target) return null;

  const exact = inventoryByName.get(target);
  if (exact && (Number(exact?.quantity) || 0) > 0) {
    return exact;
  }

  return (
    inventory.find((inv) => {
      const invName = normalizeName(inv?.name);
      if (!invName) return false;
      if ((Number(inv?.quantity) || 0) <= 0) return false;
      return invName.includes(target) || target.includes(invName);
    }) || null
  );
};

export const getAiSubstituteSuggestion = (item, priceMeta) => {
  const reason = String(item?.aiSubstitutionReason || "").trim();
  if (!reason) return null;

  if (!priceMeta || priceMeta.price === null) return reason;
  return `${reason} ${t("shopping.potentialSaving", { value: formatCurrency(priceMeta.price) })}`;
};

export const classifyItem = (item, inventoryByName) => {
  const sourceType = normalizeName(item?.sourceType);
  if (sourceType === "recipe-missing") return "recipe-missing";
  if (sourceType === "restock") return "restock";

  const itemName = normalizeName(item?.name);
  const isPantryEssential = PANTRY_ESSENTIALS.some(
    (essential) => itemName === essential || itemName.includes(essential)
  );

  if (isPantryEssential) {
    const inInventory = inventoryByName.get(itemName);
    const quantity = Number(inInventory?.quantity) || 0;
    if (!inInventory || quantity <= 0) {
      return "restock";
    }
  }

  return "manual";
};

export const groupItemsBySource = (items, inventoryByName) => {
  const groupedItems = {
    "recipe-missing": [],
    restock: [],
    manual: [],
  };

  const bucketedItems = (items || []).map((item) => ({
    item,
    bucket: classifyItem(item, inventoryByName),
  }));

  const nonRestockNames = bucketedItems
    .filter((entry) => entry.bucket !== "restock")
    .map((entry) => entry.item?.name)
    .filter(Boolean);

  const acceptedRestockNames = [];

  bucketedItems.forEach(({ item, bucket }) => {
    if (bucket !== "restock") {
      groupedItems[bucket].push(item);
      return;
    }

    const restockName = item?.name;
    const collidesWithShopping = nonRestockNames.some((name) => hasNameOverlap(restockName, name));
    if (collidesWithShopping) return;

    const alreadySuggested = acceptedRestockNames.some((name) => hasNameOverlap(restockName, name));
    if (alreadySuggested) return;

    acceptedRestockNames.push(restockName);
    groupedItems.restock.push(item);
  });

  return groupedItems;
};

export const buildSourceCostTotals = (groupedItems, resolvePrice) => ({
  manual: groupedItems.manual.reduce((sum, item) => sum + (resolvePrice(item).price || 0), 0),
  recipe: groupedItems["recipe-missing"].reduce(
    (sum, item) => sum + (resolvePrice(item).price || 0),
    0
  ),
  suggestions: groupedItems.restock.reduce((sum, item) => sum + (resolvePrice(item).price || 0), 0),
});

export const buildRecipeItemBuckets = (recipeMissingItems) =>
  recipeMissingItems.reduce((acc, item) => {
    const title = String(item?.sourceRecipeTitle || "").trim();
    if (!title) return acc;

    if (!acc[title]) {
      acc[title] = [];
    }

    acc[title].push(item.id);
    return acc;
  }, {});
