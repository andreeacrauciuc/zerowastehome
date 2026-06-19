import React from "react";
import { Heart, Sparkles, RefreshCw, RotateCcw } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";
import "./RecipeList.scss";

const RecipeMissingBadge = ({ ingredients }) => {
  const missing = Array.isArray(ingredients)
    ? ingredients.filter((ing) => ing.isMissing).length
    : 0;

  if (missing === 0) return null;

  const isOne = missing === 1;
  return (
    <span
      style={{
        fontSize: "0.78rem",
        fontWeight: 600,
        padding: "0.2rem 0.55rem",
        borderRadius: "999px",
        display: "inline-block",
        alignSelf: "flex-start",
        marginBottom: "0.25rem",
        background: isOne ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.08)",
        color: isOne ? "#92400e" : "#991b1b",
        border: `1px solid ${isOne ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.2)"}`,
      }}
    >
      {isOne ? "1 missing" : `${missing} missing`}
    </span>
  );
};

const RecipeCard = ({ recipe, isSelected, onViewRecipe, getRecipeImageUrl, onRecipeImageError, isLiked, onToggleLike }) => {
  const cookingTime = recipe.cookingTime || "20 mins";

  return (
    <article className={`recipe-card ${isSelected ? "active" : ""}`} role="listitem">
      <div className="recipe-card-image" style={{ position: "relative" }}>
        <img src={getRecipeImageUrl(recipe)} alt={recipe.title} onError={onRecipeImageError} />
        <button
          type="button"
          className={`recipe-like-btn ${isLiked ? "is-liked" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleLike(recipe); }}
          aria-label={isLiked ? "Remove from liked recipes" : "Like this recipe"}
          title={isLiked ? "Unlike" : "Save recipe"}
        >
          <Heart
            size={18}
            fill={isLiked ? "#e53935" : "none"}
            stroke={isLiked ? "#e53935" : "rgba(255,255,255,0.9)"}
            strokeWidth={2}
            className="recipe-like-icon"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="recipe-card-content">
        <h3>{recipe.title}</h3>
        <RecipeMissingBadge ingredients={recipe.ingredients} />

        <div className="recipe-card-footer">
          <span>{cookingTime}</span>
          <button type="button" onClick={() => onViewRecipe(recipe)}>
            View recipe
          </button>
        </div>
      </div>
    </article>
  );
};

const MORE_PLACEHOLDER_COUNT = 4;

const RecipeList = ({
  loading,
  isLoadingMore,
  recipes,
  economyStats,
  showOnlyCanMake,
  isMakeableEmpty,
  onToggleShowOnlyCanMake,
  selectedRecipeTitle,
  onMoreIdeas,
  onNewSearch,
  onViewRecipe,
  getRecipeImageUrl,
  onRecipeImageError,
  getRecipeKey,
  isLiked,
  onToggleLike,
  showLiked,
  onToggleShowLiked,
  likedRecipes,
}) => {
  const { currencyConfig } = useCurrency();
  const fridgeValueRaw = Number(economyStats?.totalValueToSave);
  const fridgeValue = formatCurrency(
    Number.isFinite(fridgeValueRaw) && fridgeValueRaw > 0 ? fridgeValueRaw : 0,
    currencyConfig,
  );

  return (
    <section className="recipe-list">
      <div className="recipe-list-top-bar">
        <button className="recipe-list-btn secondary" type="button" onClick={onNewSearch}>
          <RotateCcw size={15} />
          New search
        </button>

        <div className="recipe-list-right-controls">
          <button
            className={`recipe-list-btn secondary ${showLiked ? "active" : ""}`}
            type="button"
            onClick={onToggleShowLiked}
            aria-pressed={showLiked}
          >
            <Heart size={15} fill={showLiked ? "#e53935" : "none"} stroke="currentColor" strokeWidth={2} aria-hidden="true" />
            Saved recipes
          </button>

          <div
            className="recipe-tooltip-wrap"
            data-tooltip="Shows only recipes you can make with ingredients already in your fridge"
          >
            <button
              className={`recipe-list-btn secondary ${showOnlyCanMake ? "active" : ""}`}
              type="button"
              onClick={onToggleShowOnlyCanMake}
            >
              What I can make
            </button>
          </div>

          <button
            className="recipe-list-btn primary"
            type="button"
            onClick={onMoreIdeas}
            disabled={loading}
            aria-busy={isLoadingMore}
          >
            {loading ? <RefreshCw className="spinner" size={15} /> : <Sparkles size={15} />}
            {isLoadingMore ? "Adding recipes…" : loading ? "Loading..." : "Generate more"}
          </button>
        </div>
      </div>

      <div className="recipe-list-stats">
        <span>
          Ingredients analyzed: <strong>{economyStats.selectedCount}</strong>
        </span>
        <span>
          Current fridge value: <strong>{fridgeValue}</strong>
        </span>
      </div>

      {showLiked ? (
        Array.isArray(likedRecipes) && likedRecipes.length > 0 ? (
          <div className="recipe-grid" role="list" aria-label="Saved recipes">
            {likedRecipes.map((recipe, index) => {
              const recipeKey = getRecipeKey(recipe) || recipe.title || index;
              return (
                <RecipeCard
                  key={recipeKey}
                  recipe={recipe}
                  isSelected={Boolean(selectedRecipeTitle && selectedRecipeTitle === recipe.title)}
                  onViewRecipe={onViewRecipe}
                  getRecipeImageUrl={getRecipeImageUrl}
                  onRecipeImageError={onRecipeImageError}
                  isLiked={true}
                  onToggleLike={onToggleLike}
                />
              );
            })}
          </div>
        ) : (
          <div className="recipe-list-empty">
            <Heart size={48} fill="none" stroke="rgba(40,90,72,0.35)" strokeWidth={1.5} aria-hidden="true" />
            <p>No saved recipes yet</p>
            <p className="recipe-list-empty-hint">Tap the heart on any recipe card to save it here</p>
          </div>
        )
      ) : isMakeableEmpty ? (
        <div className="recipe-list-empty">
          <p>
            No recipes match all your ingredients. Try turning off the filter to see all generated
            recipes
          </p>
          <button
            type="button"
            className="recipe-list-btn secondary"
            onClick={onToggleShowOnlyCanMake}
          >
            Show all recipes
          </button>
        </div>
      ) : (
        <div className="recipe-grid" role="list" aria-label="Generated recipes">
          {recipes.map((recipe, index) => {
            const recipeKey = getRecipeKey(recipe) || recipe.title || index;
            return (
              <RecipeCard
                key={recipeKey}
                recipe={recipe}
                isSelected={Boolean(selectedRecipeTitle && selectedRecipeTitle === recipe.title)}
                onViewRecipe={onViewRecipe}
                getRecipeImageUrl={getRecipeImageUrl}
                onRecipeImageError={onRecipeImageError}
                isLiked={isLiked(recipe)}
                onToggleLike={onToggleLike}
              />
            );
          })}

          {/* Append-style skeletons for "Generate more": they extend the grid
              below the existing cards instead of replacing or hiding them. */}
          {isLoadingMore
            ? Array.from({ length: MORE_PLACEHOLDER_COUNT }).map((_, index) => (
                <article
                  key={`recipe-skeleton-${index}`}
                  className="recipe-card recipe-card-skeleton"
                  aria-hidden="true"
                >
                  <div className="recipe-card-image" />
                  <div className="recipe-card-content">
                    <span className="skeleton-line skeleton-title" />
                    <span className="skeleton-line skeleton-meta" />
                  </div>
                </article>
              ))
            : null}
        </div>
      )}

      <p className="recipe-list-loading-status" role="status" aria-live="polite">
        {isLoadingMore ? "Finding more recipes for you…" : ""}
      </p>
    </section>
  );
};

export { RecipeCard };
export default RecipeList;
