import React from "react";
import { Plus, Search } from "lucide-react";
import { t } from "../../../locales";
import NoFoodImg from "../../../assets/Nofood.png";

function InventoryEmptyState({
  totalItems,
  isSearchActive,
  activeCategory,
  onAddFood,
  onClearFilters,
}) {
  if (totalItems === 0) {
    return (
      <div className="empty-inventory-minimalist">
        <div className="img-wrapper">
          <img src={NoFoodImg} alt="Empty" className="floating-img" />
          <div className="shadow-blur" />
        </div>
        <h2>{t("inventory.emptyTitle")}</h2>
        <p>{t("inventory.emptyBody")}</p>
        <button className="btn-minimalist-add" onClick={onAddFood}>
          <Plus size={22} /> <span>Start adding</span>
        </button>
      </div>
    );
  }

  if (isSearchActive) {
    return (
      <div className="empty-inventory-minimalist empty-search-state">
        <div className="empty-search-icon" aria-hidden="true">
          <Search size={40} strokeWidth={1.2} />
        </div>
        <h2 className="empty-search-title">No items found</h2>
        <p className="empty-search-body">
          No results for your current search or filter
        </p>
        <button className="btn-minimalist-add btn-clear-filters" onClick={onClearFilters}>
          <span>Clear filters</span>
        </button>
      </div>
    );
  }

  return (
    <div className="empty-inventory-minimalist">
      <div className="img-wrapper">
        <img src={NoFoodImg} alt="Empty category" className="floating-img" />
        <div className="shadow-blur" />
      </div>
      <h2>Nothing in {activeCategory} yet</h2>
      <p>You have no {activeCategory.toLowerCase()} items in your fridge right now</p>
      <button className="btn-minimalist-add" onClick={onAddFood}>
        <Plus size={22} /> <span>Add food</span>
      </button>
    </div>
  );
}

export default InventoryEmptyState;
