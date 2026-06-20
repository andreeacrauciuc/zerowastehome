import { normalizeName } from "./recipesUtils";
import { getEffectivePrice } from "./pricing";

export const findInventoryItem = (inventory, ingredientName) => {
  const target = normalizeName(ingredientName);
  if (!target) return undefined;

  return (inventory || []).find((item) => {
    const itemName = normalizeName(item?.name);
    if (!itemName) return false;
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
    return allItemWordsInTarget;
  });
};

export const computeRecipeValueEur = (usedInventory, inventoryById, inventory) => {
  try {
    const total = (usedInventory || []).reduce((sum, used) => {
      try {
        const matched =
          (used?.id ? inventoryById.get(used.id) : null) || findInventoryItem(inventory, used?.name);
        if (!matched) return sum;

        const itemPrice = getEffectivePrice(matched);
        const currentQty = Number(matched?.quantity);
        const safeCurrentQty = Number.isFinite(currentQty) && currentQty > 0 ? currentQty : 1;
        const usedQty = Number(used?.quantity);
        const safeUsedQty = Number.isFinite(usedQty) && usedQty > 0 ? usedQty : 1;
        const usedRatio = Math.min(1, safeUsedQty / safeCurrentQty);

        return sum + itemPrice * usedRatio;
      } catch {
        return sum;
      }
    }, 0);

    return Number(total.toFixed(2));
  } catch {
    return 0;
  }
};

export const getIngredientExpiryMeta = (
  ingredient,
  { usedInventory, inventoryById, inventory, getExpiryStatus }
) => {
  if (ingredient?.isMissing) return { status: null, label: null };

  const usedMatch = (usedInventory || []).find(
    (used) => normalizeName(used?.name) === normalizeName(ingredient?.name)
  );

  const matchedInventory =
    (usedMatch?.id && inventoryById.get(usedMatch.id)) || findInventoryItem(inventory, ingredient?.name);

  if (!matchedInventory) return { status: null, label: null };

  const status = getExpiryStatus(matchedInventory);
  if (!status || status === "fresh" || status === "na") {
    return { status: null, label: null };
  }

  if (status === "expired") return { status, label: "expired - use now" };
  if (status === "today") return { status, label: "expires today" };
  return { status, label: "near expiry" };
};
