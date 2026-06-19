import React from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { getExpiryStatus, getExpiryLabel } from "../utils/recipesUtils";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";
import HeartImg from "../../../assets/heart.png";
import BakeryImg from "../../../assets/Bakery.png";
import FruitsImg from "../../../assets/Fruits.png";
import VeggiesImg from "../../../assets/Vegetables.png";
import MeatImg from "../../../assets/Meat.png";
import DairyImg from "../../../assets/Dairy.png";
import GrainsImg from "../../../assets/Grains.png";
import OtherImg from "../../../assets/Other.png";
import IngredientCard from "./IngredientCard";
import "./IngredientSelector.scss";

const categoryImages = {
  Fruits: FruitsImg,
  Vegetables: VeggiesImg,
  Meat: MeatImg,
  Dairy: DairyImg,
  Bakery: BakeryImg,
  Grains: GrainsImg,
  Other: OtherImg,
};

const categoryAliases = {
  fruit: "Fruits",
  fruits: "Fruits",
  vegetable: "Vegetables",
  vegetables: "Vegetables",
  veggie: "Vegetables",
  veggies: "Vegetables",
  meat: "Meat",
  dairy: "Dairy",
  bakery: "Bakery",
  grain: "Grains",
  grains: "Grains",
  other: "Other",
};

const resolveCategoryKey = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Other";
  return categoryAliases[normalized] || "Other";
};

const getInventoryImage = (item) => {
  const directImage = item?.imageUrl || item?.image || item?.photoURL || item?.photo;
  const categoryKey = resolveCategoryKey(item?.category);
  const categoryImage = categoryImages[categoryKey] || categoryImages.Other;

  return {
    image: directImage || categoryImage || null,
    categoryImage: categoryImage || null,
  };
};

const IngredientSelector = ({
  loading,
  selectedItemIds,
  selectedEconomyStats,
  visibleItems,
  emptySlots,
  safeIngredientPage,
  ingredientPageCount,
  isInventoryEmpty,
  onPrevIngredientPage,
  onNextIngredientPage,
  onToggleSelect,
  onGenerate,
  onSelectExpiring,
  isExpiringSelected,
  likedCount = 0,
  onViewSaved,
}) => {
  const { currencyConfig } = useCurrency();
  const safeSelectedItemIds = Array.isArray(selectedItemIds) ? selectedItemIds : [];
  const fridgeValueRaw = Number(selectedEconomyStats?.totalValueToSave);
  const fridgeValue = formatCurrency(
    Number.isFinite(fridgeValueRaw) && fridgeValueRaw > 0 ? fridgeValueRaw : 0,
    currencyConfig
  );

  return (
    <section className="ingredient-selector">
      <div className="ingredient-selector__content">
        <header className="selector-header">
          <div className="selector-header-text">
            <h1 className="page-title">
              Generate <span>recipes</span>
            </h1>
            <p>{isInventoryEmpty ? "No ingredients available in your fridge" : "Choose your ingredients"}</p>
            <button
              type="button"
              className="selector-saved-btn"
              onClick={onViewSaved}
              aria-label={`View saved recipes${likedCount > 0 ? `, ${likedCount} saved` : ""}`}
            >
              <img src={HeartImg} alt="" aria-hidden="true" className="selector-saved-btn-icon" />
              Saved recipes{likedCount > 0 ? ` · ${likedCount}` : ""}
            </button>
          </div>
        </header>

        <div className="selector-stats">
          <span>
            Selected items: <strong>{selectedEconomyStats.selectedCount}</strong>
          </span>
          <span>
            Current fridge value: <strong>{fridgeValue}</strong>
          </span>
          <button
            type="button"
            className={`selector-quick-btn expiring${isExpiringSelected ? " is-active" : ""}`}
            onClick={onSelectExpiring}
            disabled={isInventoryEmpty}
          >
            {isExpiringSelected ? "Deselect expiring soon" : "Select expiring soon"}
          </button>
        </div>

        <div className="selector-carousel">
          <button
            type="button"
            className="carousel-nav"
            onClick={onPrevIngredientPage}
            disabled={safeIngredientPage === 0}
            aria-label="Previous ingredients"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="ingredient-grid" role="list" aria-label="Ingredient selection">
            {visibleItems.map((item) => {
              const status = getExpiryStatus(item);
              const expiryLabel = getExpiryLabel(item);
              const isSelected = safeSelectedItemIds.includes(item.id);
              const { image, categoryImage } = getInventoryImage(item);

              return (
                <IngredientCard
                  key={item.id}
                  item={item}
                  image={image}
                  fallbackImage={categoryImage}
                  status={status}
                  expiryLabel={expiryLabel}
                  isSelected={isSelected}
                  onToggle={() => onToggleSelect(item.id)}
                />
              );
            })}

            {Array.from({ length: emptySlots }).map((_, index) => (
              <div key={`empty-${index}`} className="ingredient-tile-empty" aria-hidden="true" />
            ))}
          </div>

          <button
            type="button"
            className="carousel-nav"
            onClick={onNextIngredientPage}
            disabled={safeIngredientPage >= ingredientPageCount - 1}
            aria-label="Next ingredients"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        <button
          type="button"
          className="generate-btn"
          onClick={onGenerate}
          disabled={loading || isInventoryEmpty || selectedEconomyStats.selectedCount === 0}
        >
          {loading ? (
            <>
              <RefreshCw size={20} className="spinner" />
              Finding recipes...
            </>
          ) : (
            "Generate"
          )}
        </button>
      </div>
    </section>
  );
};

export default IngredientSelector;
