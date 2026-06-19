import { useEffect, useMemo, useState } from "react";
import { getExpiryStatus } from "../utils/recipesUtils";

const getGridSlots = (viewportWidth, itemCount) => {
  if (viewportWidth < 1024) return Math.max(1, itemCount);
  return 6;
};

export function useIngredientPagination(safeInventoryItems) {
  const [ingredientPage, setIngredientPage] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sortedInventory = useMemo(() => {
    const priority = { expired: 0, today: 1, soon: 2, fresh: 3, na: 4 };
    return [...safeInventoryItems].sort(
      (a, b) =>
        (priority[getExpiryStatus(a)] ?? 4) - (priority[getExpiryStatus(b)] ?? 4),
    );
  }, [safeInventoryItems]);

  const gridSlots = useMemo(
    () => getGridSlots(viewportWidth, safeInventoryItems.length),
    [safeInventoryItems.length, viewportWidth],
  );

  const ingredientPageCount = Math.max(1, Math.ceil(sortedInventory.length / gridSlots));
  const safeIngredientPage = Math.min(Math.max(0, ingredientPage), ingredientPageCount - 1);
  const isMobileView = viewportWidth <= 520;

  const visibleItems = useMemo(
    () =>
      isMobileView
        ? sortedInventory
        : sortedInventory.slice(
            safeIngredientPage * gridSlots,
            safeIngredientPage * gridSlots + gridSlots,
          ),
    [isMobileView, safeIngredientPage, sortedInventory, gridSlots],
  );

  const emptySlots = isMobileView ? 0 : Math.max(0, gridSlots - visibleItems.length);

  return {
    sortedInventory,
    visibleItems,
    emptySlots,
    gridSlots,
    safeIngredientPage,
    ingredientPageCount,
    onPrevPage: () => setIngredientPage((prev) => Math.max(0, prev - 1)),
    onNextPage: () => setIngredientPage((prev) => Math.min(ingredientPageCount - 1, prev + 1)),
    resetPage: () => setIngredientPage(0),
  };
}
