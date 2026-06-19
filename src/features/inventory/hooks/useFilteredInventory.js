import { useMemo } from "react";
import { getCategoryName, getAddedTimestamp } from "../utils/itemUtils";

export const useFilteredInventory = (inventoryItems = [], searchTerm = "", activeCategory = "All", sortBy = "expiry") => {
  return useMemo(() => {
    const normalizedSearch = String(searchTerm || "").trim().toLowerCase();

    const getSafeName = (item) => String(item?.name || "");
    const getSafeLowerName = (item) => getSafeName(item).toLowerCase();

    const items = (inventoryItems || []).filter((item) => {
      const matchesSearch = getSafeLowerName(item).includes(normalizedSearch);
      const matchesCategory = activeCategory === "All" || getCategoryName(item) === activeCategory;
      return matchesSearch && matchesCategory;
    });

    const sorted = items.sort((a, b) => {
      if (sortBy === "expiry") {
        const aDate = a.expiry ? new Date(a.expiry).getTime() : Infinity;
        const bDate = b.expiry ? new Date(b.expiry).getTime() : Infinity;
        if (aDate !== bDate) return aDate - bDate;
        return getSafeName(a).localeCompare(getSafeName(b));
      }
      if (sortBy === "price-highest") {
        const priceA = Number(a.price) || 0;
        const priceB = Number(b.price) || 0;

        if (priceA !== priceB) return priceB - priceA;
        return getSafeName(a).localeCompare(getSafeName(b));
      }

      if (sortBy === "recent") {
        const addedA = getAddedTimestamp(a);
        const addedB = getAddedTimestamp(b);

        if (addedA !== addedB) return addedB - addedA;
        return getSafeName(a).localeCompare(getSafeName(b));
      }

      return getSafeName(a).localeCompare(getSafeName(b));
    });

    return { filteredItems: sorted, totalItems: (inventoryItems || []).length };
  }, [inventoryItems, searchTerm, activeCategory, sortBy]);
};
