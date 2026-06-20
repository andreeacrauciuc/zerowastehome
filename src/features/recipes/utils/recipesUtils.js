import { parseRecipeAmount } from "./recipeShoppingUtils";
import {
  buildInventoryByName,
  findInventoryCollision,
} from "../../shopping/utils/shoppingUtils";

export const GRID_SLOTS = 6;

export const normalizeName = (value) => String(value || "").trim().toLowerCase();

const normalizeUnit = (value) => String(value || "").trim().toLowerCase();

const convertUnits = (amount, fromUnit, toUnit) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;

  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to || from === to) return value;

  const massUnits = { g: 1, kg: 1000 };
  const volumeUnits = { ml: 1, l: 1000 };

  if (massUnits[from] && massUnits[to]) {
    return Number(((value * massUnits[from]) / massUnits[to]).toFixed(4));
  }

  if (volumeUnits[from] && volumeUnits[to]) {
    return Number(((value * volumeUnits[from]) / volumeUnits[to]).toFixed(4));
  }

  return value;
};

export const getRecipeKey = (recipe) =>
  normalizeName(recipe?.title)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const getDaysLeft = (item) => {
  const maybeDaysLeft = item?.daysLeft;
  if (
    maybeDaysLeft !== null &&
    maybeDaysLeft !== undefined &&
    maybeDaysLeft !== ""
  ) {
    const parsed = Number(maybeDaysLeft);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }

  const rawExpiry = item?.expiryDate || item?.expiry || item;
  if (!rawExpiry) {
    return null;
  }

  const exp = new Date(rawExpiry);
  if (Number.isNaN(exp.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);

  return Math.round((exp - today) / 86_400_000);
};

export const getExpiryStatus = (itemOrExpiry) => {
  const days = getDaysLeft(itemOrExpiry);
  if (days === null) return "na";

  if (days < 0) return "expired";
  if (days <= 1) return "today";
  if (days <= 3) return "soon";
  return "fresh";
};

export const getExpiryLabel = (itemOrExpiry) => {
  const status = getExpiryStatus(itemOrExpiry);
  const days = getDaysLeft(itemOrExpiry);
  if (status === "na") return "N/A";
  if (status === "expired") return "Expired";
  if (!Number.isFinite(days)) return "N/A";
  if (status === "today") return days <= 0 ? "Today" : "1 day left";
  if (status === "soon") return `${days} ${days === 1 ? "day" : "days"} left`;
  if (status === "fresh") return `${days} ${days === 1 ? "day" : "days"} left`;
  return "N/A";
};

export const getMatchScore = (recipe, inventoryItems) => {
  const ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients
    : [];

  if (ingredients.length === 0) return 0;

  const safeInventoryItems = inventoryItems || [];
  const inventoryByName = buildInventoryByName(safeInventoryItems);
  const matchedCount = ingredients.reduce((count, ingredient) => {
    const collision = findInventoryCollision(
      ingredient,
      inventoryByName,
      safeInventoryItems,
    );
    return collision ? count + 1 : count;
  }, 0);

  return matchedCount / ingredients.length;
};

export const inferUsageFromIngredients = (recipe, inventory) => {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const usage = [];

  ingredients
    .filter((ing) => !ing?.isMissing)
    .forEach((ingredient) => {
      const target = normalizeName(ingredient?.name);
      if (!target) return;

      const matched = (inventory || []).find((item) => {
        const itemName = normalizeName(item?.name);
        if (!itemName || !target) return false;
        if (itemName === target) return true;

        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const targetWords = target.split(/\s+/).filter((w) => w.length >= 3);
        const itemWords = itemName.split(/\s+/).filter((w) => w.length >= 3);

        if (targetWords.length === 0 || itemWords.length === 0) return false;

        const allTargetWordsInItem = targetWords.every((word) =>
          new RegExp(`(^|\\s)${escapeRegex(word)}(\\s|$)`).test(itemName)
        );
        if (allTargetWordsInItem) return true;

        const allItemWordsInTarget = itemWords.every((word) =>
          new RegExp(`(^|\\s)${escapeRegex(word)}(\\s|$)`).test(target)
        );
        if (allItemWordsInTarget) return true;

        return false;
      });

      if (!matched) return;

      const parsed = parseRecipeAmount(ingredient?.amount);
      const recipeQty = Number(parsed?.quantity);
      const safeRecipeQty = Number.isFinite(recipeQty) && recipeQty > 0 ? recipeQty : 1;
      const recipeUnit = parsed?.unit || "unit";
      const inventoryUnit = matched?.unit || recipeUnit;
      const converted = convertUnits(safeRecipeQty, recipeUnit, inventoryUnit);

      const unitsAreCompatible =
        recipeUnit === inventoryUnit ||
        (converted !== null &&
          converted !== safeRecipeQty &&
          Number.isFinite(converted) &&
          converted > 0);

      const finalQty = unitsAreCompatible
        ? converted
        : Math.min(safeRecipeQty, Number(matched?.quantity) || 1);

      usage.push({
        id: matched.id,
        name: matched.name,
        quantity: finalQty,
        unit: inventoryUnit,
        sourceQuantity: safeRecipeQty,
        sourceUnit: recipeUnit,
      });
    });

  return usage;
};

const RECIPE_IMAGE_FALLBACKS = [
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1600&q=80",
];

const hashString = (value) => {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickStableFallback = (recipe) =>
  RECIPE_IMAGE_FALLBACKS[
    hashString(recipe?.title || "food") % RECIPE_IMAGE_FALLBACKS.length
  ];

export const getRecipeImageUrl = (recipe) =>
  recipe?.thumbnail || pickStableFallback(recipe);

export const handleRecipeImageError = (event) => {
  const tries = Number(event.currentTarget.dataset.fallbackTries || "0");
  const nextIndex = tries;
  const nextFallback = RECIPE_IMAGE_FALLBACKS[nextIndex];

  if (nextFallback) {
    event.currentTarget.dataset.fallbackTries = String(nextIndex + 1);
    event.currentTarget.src = nextFallback;
  } else {
    event.currentTarget.style.display = "none";
  }
};
