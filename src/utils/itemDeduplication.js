export const normalizeItemName = (value) => String(value || "").trim().toLowerCase();

export const hasNameOverlap = (leftName, rightName) => {
  const left = normalizeItemName(leftName);
  const right = normalizeItemName(rightName);

  if (!left || !right) return false;
  if (left === right) return true;

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;

  if (shorter.length < 3) return false;

  const wordPattern = new RegExp(`(^|\\s)${shorter}(\\s|$)`);
  return wordPattern.test(longer);
};

export const findDuplicateByName = (items = [], targetName, predicate = null) => {
  const normalizedTarget = normalizeItemName(targetName);
  if (!normalizedTarget) return null;

  return (
    items.find((item) => {
      if (typeof predicate === "function" && !predicate(item)) return false;
      return hasNameOverlap(normalizedTarget, item?.name);
    }) || null
  );
};

export const buildCrossListDuplicateGuard = ({
  name,
  inventoryItems = [],
  shoppingItems = [],
  excludeShoppingItemId = null,
}) => {
  const normalizedTarget = normalizeItemName(name);
  if (!normalizedTarget) {
    return { isDuplicate: false, source: null, matchedItem: null };
  }

  const shoppingMatch = findDuplicateByName(
    shoppingItems,
    normalizedTarget,
    (item) => item?.id !== excludeShoppingItemId
  );
  if (shoppingMatch) {
    return { isDuplicate: true, source: "shopping", matchedItem: shoppingMatch };
  }

  const inventoryMatch = findDuplicateByName(
    inventoryItems,
    normalizedTarget,
    (item) => (Number(item?.quantity) || 0) > 0
  );
  if (inventoryMatch) {
    return { isDuplicate: true, source: "inventory", matchedItem: inventoryMatch };
  }

  return { isDuplicate: false, source: null, matchedItem: null };
};
