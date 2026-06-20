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
import {
  computeRecipeValueEur,
  getIngredientExpiryMeta,
} from "../utils/recipeModalUtils";
import {
  AVERAGE_MISSING_INGREDIENT_COST,
  CO2_DRIVING_KM_FACTOR,
} from "../constants";
import "./RecipeModal.scss";

const nutritionKeys = ["calories", "protein", "carbs", "fat"];
const normalizeName = (value) => String(value || "").trim().toLowerCase();

const getEcoScoreTier = (score) => {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
};

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

  if (!recipe) return null;

  const usedInventory = Array.isArray(recipe.usedInventory) ? recipe.usedInventory : [];

  const recipeValueEur = computeRecipeValueEur(usedInventory, inventoryById, inventory);

  const swaps = Array.isArray(recipe.pantrySwaps)
    ? recipe.pantrySwaps
    : Array.isArray(recipe.smartSubstitutions)
      ? recipe.smartSubstitutions
      : [];

  const swapMissingNames = new Set(swaps.map((swap) => normalizeName(swap?.missingIngredient)));
  const unresolvedMissingCount = (recipe.ingredients || []).filter(
    (ingredient) => ingredient?.isMissing && !swapMissingNames.has(normalizeName(ingredient?.name))
  ).length;
  const spendEur = unresolvedMissingCount > 0
    ? Number((unresolvedMissingCount * AVERAGE_MISSING_INGREDIENT_COST).toFixed(2))
    : 0;

  const co2SavedKg = Number(recipe.co2SavedKg) || 0;
  const drivingKmEquivalent = Math.round(co2SavedKg * CO2_DRIVING_KM_FACTOR);
  const ecoScoreTier = getEcoScoreTier(recipe.sustainabilityScore);

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
                <span className="recipe-modal-spend-note">
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
                  className={`recipe-eco-badge ${ecoScoreTier}`}
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
                const expiryMeta = getIngredientExpiryMeta(ingredient, {
                  usedInventory,
                  inventoryById,
                  inventory,
                  getExpiryStatus,
                });

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