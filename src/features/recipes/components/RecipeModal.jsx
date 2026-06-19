import React, { useEffect, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Leaf,
  RefreshCw,
  ShoppingBag,
  Users,
  X,
  Zap,
} from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";
import { getEffectivePrice } from "../utils/pricing";
import "./RecipeModal.scss";

const nutritionKeys = ["calories", "protein", "carbs", "fat"];
const normalizeName = (value) => String(value || "").trim().toLowerCase();

const RecipeModal = ({
  recipe,
  inventory,
  getExpiryStatus,
  getRecipeImageUrl,
  onRecipeImageError,
  onClose,
  onCookedRecipe,
  onAddToShoppingList,
  isCooking = false,
  isAdding = false,
  cookSuccess = false,
}) => {
  const { currencyConfig } = useCurrency();

  useEffect(() => {
    if (!cookSuccess) return undefined;
    const timer = window.setTimeout(() => onClose(), 1600);
    return () => window.clearTimeout(timer);
  }, [cookSuccess, onClose]);

  useEffect(() => {
    if (!recipe) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recipe, onClose]);

  const handleCookClick = (event) => {
    event.stopPropagation();
    if (isCooking || cookSuccess) return;
    onCookedRecipe();
  };

  const handleAddIngredientsClick = (event) => {
    event.stopPropagation();
    if (isAdding) return;
    onAddToShoppingList();
  };

  const inventoryById = useMemo(
    () => new Map((inventory || []).map((item) => [item.id, item])),
    [inventory]
  );

  const findInventoryItem = (ingredientName) => {
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

  if (!recipe) return null;

  const usedInventory = Array.isArray(recipe.usedInventory) ? recipe.usedInventory : [];

  const recipeValueEur = (() => {
    try {
      const total = usedInventory.reduce((sum, used) => {
        try {
          const matched = (used?.id ? inventoryById.get(used.id) : null) || findInventoryItem(used?.name);
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
  })();

  const swaps = Array.isArray(recipe.pantrySwaps)
    ? recipe.pantrySwaps
    : Array.isArray(recipe.smartSubstitutions)
      ? recipe.smartSubstitutions
      : [];

  const swapMissingNames = new Set(swaps.map((swap) => normalizeName(swap?.missingIngredient)));
  const unresolvedMissingCount = (recipe.ingredients || []).filter(
    (ingredient) => ingredient?.isMissing && !swapMissingNames.has(normalizeName(ingredient?.name))
  ).length;
  const AVERAGE_MISSING_INGREDIENT_COST = 3.5;
  const spendEur = unresolvedMissingCount > 0
    ? Number((unresolvedMissingCount * AVERAGE_MISSING_INGREDIENT_COST).toFixed(2))
    : 0;

  const co2SavedKg = Number(recipe.co2SavedKg) || 0;
  const drivingKmEquivalent = Math.round(co2SavedKg * 5);

  const getIngredientExpiryMeta = (ingredient) => {
    if (ingredient?.isMissing) return { status: null, label: null };

    const usedMatch = usedInventory.find(
      (used) => normalizeName(used?.name) === normalizeName(ingredient?.name)
    );

    const matchedInventory =
      (usedMatch?.id && inventoryById.get(usedMatch.id)) || findInventoryItem(ingredient?.name);

    if (!matchedInventory) return { status: null, label: null };

    const status = getExpiryStatus(matchedInventory);
    if (!status || status === "fresh" || status === "na") {
      return { status: null, label: null };
    }

    if (status === "expired") return { status, label: "expired - use now" };
    if (status === "today") return { status, label: "expires today" };
    return { status, label: "near expiry" };
  };

  return (
    <div className="recipe-modal-overlay" role="dialog" aria-modal="true" aria-label={recipe.title} onClick={onClose}>
      <div className="recipe-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="recipe-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="recipe-modal-header">
          <div className="recipe-modal-image">
            <img src={getRecipeImageUrl(recipe)} alt={recipe.title} onError={onRecipeImageError} />
          </div>

          <div className="recipe-modal-intro">
            <h3>{recipe.title}</h3>
            <p>
              Recipe value: <strong>{formatCurrency(recipeValueEur, currencyConfig)}</strong>
              {unresolvedMissingCount > 0 && (
                <span style={{ color: "var(--slate-soft)", fontSize: "0.85rem" }}>
                  {" "} ~{formatCurrency(spendEur, currencyConfig)} estimated for {unresolvedMissingCount} missing ingredient{unresolvedMissingCount > 1 ? "s" : ""}
                </span>
              )}
            </p>

            <div className="recipe-modal-meta">
              <span>
                <Clock size={14} />
                {recipe.cookingTime || "-"}
              </span>
              {recipe.servingsYield && (
                <span>
                  <Users size={14} />
                  {recipe.servingsYield} servings
                </span>
              )}
              {Number.isFinite(recipe.sustainabilityScore) && recipe.sustainabilityScore > 0 && (
                <span
                  title="Sustainability score based on how many ingredients you already have and CO₂ saved"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    background: recipe.sustainabilityScore >= 70
                      ? "rgba(16,185,129,0.12)"
                      : recipe.sustainabilityScore >= 40
                        ? "rgba(245,158,11,0.12)"
                        : "rgba(239,68,68,0.12)",
                    color: recipe.sustainabilityScore >= 70
                      ? "#10b981"
                      : recipe.sustainabilityScore >= 40
                        ? "#f59e0b"
                        : "#ef4444",
                    borderRadius: "999px",
                    padding: "0.2rem 0.6rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    border: "1px solid currentColor",
                    opacity: 0.9,
                  }}
                >
                  {recipe.sustainabilityScore}/100 eco score
                </span>
              )}
            </div>

            {cookSuccess ? (
              <div className="recipe-modal-cook-success" role="status" aria-live="polite">
                <CheckCircle2 size={18} />
                <span>Cooked! Your inventory was updated</span>
              </div>
            ) : (
              <div className="recipe-modal-actions">
                <button className="primary" type="button" onClick={handleCookClick} disabled={isCooking}>
                  <Check size={14} />
                  {isCooking ? "Saving..." : "I cooked this"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="recipe-modal-body">
          <section>
            <h4>Ingredients</h4>

            <div className="recipe-modal-list">
              {(recipe.ingredients || []).map((ingredient, index) => {
                const expiryMeta = getIngredientExpiryMeta(ingredient);

                return (
                  <div
                    key={`ingredient-${recipe.title}-${ingredient.name}-${index}`}
                    className={`recipe-modal-item ${ingredient.isMissing ? "missing" : "have"} ${expiryMeta.status ? `expiring-${expiryMeta.status}` : ""}`}
                  >
                    {ingredient.isMissing ? <AlertCircle size={16} /> : <Check size={16} />}
                    <div>
                      <strong>{ingredient.name}</strong>
                      <small>{ingredient.amount}</small>
                    </div>
                    {expiryMeta.label && <span className={`tag ${expiryMeta.status}`}>{expiryMeta.label}</span>}
                  </div>
                );
              })}
            </div>

            {(recipe.ingredients || []).some((ingredient) => ingredient.isMissing) && (
              <button className="modal-add-missing" type="button" onClick={handleAddIngredientsClick} disabled={isAdding}>
                <ShoppingBag size={16} />
                {isAdding ? "Adding..." : "Add missing to shopping list"}
              </button>
            )}

            {recipe.nutrition && (
              <div className="recipe-modal-nutrition">
                <h4>Nutrition</h4>
                <div className="recipe-modal-nutrition-grid">
                  {nutritionKeys.map((key) => (
                    <div key={key}>
                      <strong>{recipe.nutrition[key]}</strong>
                      <span>{key === "calories" ? "cal" : key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {swaps.length > 0 && (
              <div className="recipe-callout">
                <RefreshCw size={18} />
                <div>
                  <strong>Smart swap</strong>
                  {swaps.map((swap, index) => (
                    <p key={`${swap.missingIngredient}-${swap.substituteItem}-${index}`}>
                      I replaced {swap.missingIngredient} with your {swap.substituteItem} so you do not have to go to the store
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <h4>Instructions</h4>

            <div className="recipe-modal-steps">
              {(recipe.instructions || []).map((step, index) => (
                <div key={`step-${recipe.title}-${index}`}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>

            {recipe.leftoverStorageTip && (
              <div className="recipe-callout warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>Smart leftover tip</strong>
                  <p>{recipe.leftoverStorageTip}</p>
                </div>
              </div>
            )}

            {recipe.ecoTip && (
              <div className="recipe-callout">
                <Leaf size={18} />
                <div>
                  <strong>Eco tip</strong>
                  <p>{recipe.ecoTip}</p>
                </div>
              </div>
            )}

            {co2SavedKg > 0 && (
              <div className="recipe-callout">
                <Leaf size={18} />
                <div>
                  <strong>Comparative eco-impact</strong>
                  <p>
                    By cooking this recipe, you saved the equivalent of {co2SavedKg.toFixed(1)} kg of CO2 (about {drivingKmEquivalent} km of driving)
                  </p>
                </div>
              </div>
            )}

            {recipe.whyThisHelps && (
              <div className="recipe-callout why">
                <Zap size={18} />
                <div>
                  <strong>Why this reduces waste</strong>
                  <p>{recipe.whyThisHelps}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;