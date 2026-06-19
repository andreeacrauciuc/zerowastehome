import { useCallback, useMemo } from "react";
import {
  EUR_TO_CO2_KG,
  buildHistoricalPriceByName,
  buildInventoryByName,
  buildRecipeItemBuckets,
  buildSourceCostTotals,
  getItemLabel,
  groupItemsBySource,
  resolveItemPrice,
} from "../utils/shoppingUtils";

export function useShoppingFilters({ items, inventory, activeTab, searchValue }) {
  const historicalPriceByName = useMemo(() => buildHistoricalPriceByName(inventory), [inventory]);
  const inventoryByName = useMemo(() => buildInventoryByName(inventory), [inventory]);

  const resolvePrice = useCallback(
    (item) => resolveItemPrice(item, historicalPriceByName),
    [historicalPriceByName],
  );

  const checkedItems = useMemo(() => items.filter((i) => i.checked), [items]);
  const uncheckedItems = useMemo(
    () => items.filter((item) => !item.checked && !item.isPurchased),
    [items],
  );

  const groupedItems = useMemo(
    () => groupItemsBySource(items, inventoryByName),
    [items, inventoryByName],
  );

  const recipeItemBuckets = useMemo(
    () => buildRecipeItemBuckets(groupedItems["recipe-missing"]),
    [groupedItems],
  );

  const sourceCostTotals = useMemo(
    () => buildSourceCostTotals(groupedItems, resolvePrice),
    [groupedItems, resolvePrice],
  );

  const manualItems = useMemo(
    () => [...(groupedItems.manual || []), ...(groupedItems.restock || [])],
    [groupedItems],
  );

  const groups = useMemo(
    () => [
      {
        key: "manual",
        title: "Manual",
        className: "source-manual",
        items: manualItems,
      },
      {
        key: "recipe-missing",
        title: "Recipe missing",
        className: "source-recipe",
        items: groupedItems["recipe-missing"],
      },
    ],
    [manualItems, groupedItems],
  );

  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredGroups = useMemo(
    () =>
      groups
        .filter((group) => activeTab === "all" || group.key === activeTab)
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            const label = String(getItemLabel(item) || "").toLowerCase();
            const categoryLabel = String(item.category || "").toLowerCase();
            const recipeTitle = String(item.sourceRecipeTitle || "").toLowerCase();
            if (!normalizedSearch) return true;
            return (
              label.includes(normalizedSearch) ||
              categoryLabel.includes(normalizedSearch) ||
              recipeTitle.includes(normalizedSearch)
            );
          }),
        }))
        .filter((group) => group.items.length > 0 || activeTab !== "all"),
    [groups, activeTab, normalizedSearch],
  );

  const pricedItems = useMemo(
    () => items.map((item) => ({ item, priceMeta: resolvePrice(item) })),
    [items, resolvePrice],
  );

  const marketPriceTotal = useMemo(
    () => pricedItems.reduce((sum, entry) => sum + (entry.priceMeta.price || 0), 0),
    [pricedItems],
  );

  const unknownPriceCount = useMemo(
    () => pricedItems.filter((entry) => entry.priceMeta.source === "unknown").length,
    [pricedItems],
  );

  const estimatedCo2Kg = marketPriceTotal * EUR_TO_CO2_KG;

  return {
    resolvePrice,
    inventoryByName,
    checkedItems,
    uncheckedItems,
    groupedItems,
    recipeItemBuckets,
    sourceCostTotals,
    manualItems,
    filteredGroups,
    pricedItems,
    marketPriceTotal,
    unknownPriceCount,
    estimatedCo2Kg,
  };
}
