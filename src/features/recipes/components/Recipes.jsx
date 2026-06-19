import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Heart } from "lucide-react";
import { useDataStore } from "../../../hooks/useDataStore";
import { showSuccess } from "../../../utils/toast";
import { RecipeSelectionProvider, useRecipeSelection } from "../context/RecipeSelectionContext";
import { useFetchRecipes } from "../hooks/useFetchRecipes";
import { useLikedRecipes } from "../hooks/useLikedRecipes";
import { useRecipeActions } from "../hooks/useRecipeActions";
import { useAuth } from "../../auth/context/AuthContext";
import { useIngredientPagination } from "../hooks/useIngredientPagination";
import { calculateSavings } from "../utils/pricing";
import { getExpiryStatus, getMatchScore, getRecipeImageUrl, getRecipeKey, handleRecipeImageError } from "../utils/recipesUtils";
import IngredientSelector from "./IngredientSelector";
import RecipeList, { RecipeCard } from "./RecipeList";
import RecipeModal from "./RecipeModal";
import CookConfirmModal from "./CookConfirmModal";
import RecipeIllustration from "../../../assets/recipe.svg";
import "../Recipes.scss";

const RecipesContent = () => {
  const location = useLocation();
  const prefillKeyRef = useRef("");
  const { inventoryItems, isLoading } = useDataStore();
  const { selectedIngredients, setSelectedIngredients, toggleIngredient, clearSelection } =
    useRecipeSelection();

  const safeInventoryItems = useMemo(
    () => (Array.isArray(inventoryItems) ? inventoryItems : []),
    [inventoryItems],
  );
  const safeSelectedIngredients = useMemo(
    () => (Array.isArray(selectedIngredients) ? selectedIngredients : []),
    [selectedIngredients],
  );

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showOnlyMakeable, setShowOnlyMakeable] = useState(false);

  const { currentUser } = useAuth();
  const { likedRecipes, toggleLike, isLiked } = useLikedRecipes(currentUser?.uid);
  const [showLiked, setShowLiked] = useState(false);
  const onToggleShowLiked = useCallback(() => setShowLiked((prev) => !prev), []);

  const { loading, isLoadingMore, generatedRecipes, handleGenerate, handleMoreIdeas, resetRecipes } =
    useFetchRecipes();

  const {
    isCookingRecipe,
    isAddingToShopping,
    cookConfirmPending,
    cookSuccess,
    clearCookSuccess,
    handleCookedRecipe,
    handleConfirmCook,
    handleCancelCook,
    handleAddToShoppingList,
  } = useRecipeActions(safeInventoryItems);

  const {
    sortedInventory,
    visibleItems,
    emptySlots,
    safeIngredientPage,
    ingredientPageCount,
    onPrevPage,
    onNextPage,
    resetPage,
  } = useIngredientPagination(safeInventoryItems);

  const selectedInventory = useMemo(
    () => safeInventoryItems.filter((item) => safeSelectedIngredients.includes(item.id)),
    [safeInventoryItems, safeSelectedIngredients],
  );

  const selectedEconomyStats = useMemo(
    () => ({
      selectedCount: selectedInventory.length,
      totalValueToSave: calculateSavings(selectedInventory),
    }),
    [selectedInventory],
  );

  const sortedRecipes = useMemo(() => {
    if (!generatedRecipes.length) return [];
    return [...generatedRecipes].sort(
      (a, b) => getMatchScore(b, selectedInventory) - getMatchScore(a, selectedInventory),
    );
  }, [generatedRecipes, selectedInventory]);

  const displayedRecipes = useMemo(
    () =>
      showOnlyMakeable
        ? sortedRecipes.filter((r) => getMatchScore(r, selectedInventory) >= 0.8)
        : sortedRecipes,
    [sortedRecipes, showOnlyMakeable, selectedInventory],
  );

  const isMakeableEmpty =
    showOnlyMakeable && sortedRecipes.length > 0 && displayedRecipes.length === 0;

  const expiringIds = useMemo(
    () =>
      sortedInventory
        .filter((item) => {
          const status = getExpiryStatus(item);
          return status === "expired" || status === "today" || status === "soon";
        })
        .map((item) => item.id),
    [sortedInventory],
  );

  const isExpiringSelected =
    expiringIds.length > 0 && expiringIds.every((id) => safeSelectedIngredients.includes(id));

  useEffect(() => {
    if (isLoading) return;
    if (!Array.isArray(selectedIngredients)) { setSelectedIngredients([]); return; }
    const validIds = new Set(safeInventoryItems.map((item) => item.id));
    const filtered = selectedIngredients.filter((id) => validIds.has(id));
    if (filtered.length !== selectedIngredients.length) setSelectedIngredients(filtered);
  }, [safeInventoryItems, selectedIngredients, setSelectedIngredients, isLoading]);
  useEffect(() => {
    const fromImpact = location?.state?.source === "impact-recovery";
    const incomingIds = Array.isArray(location?.state?.preselectedItemIds)
      ? location.state.preselectedItemIds.filter(Boolean)
      : [];

    if (!fromImpact || incomingIds.length === 0) return;

    const validIds = new Set(safeInventoryItems.map((item) => item.id));
    const filteredIds = incomingIds.filter((id) => validIds.has(id));
    if (filteredIds.length === 0) return;

    const navigationKey = location?.key || `ids:${filteredIds.slice().sort().join("|")}`;
    if (prefillKeyRef.current === navigationKey) return;

    prefillKeyRef.current = navigationKey;
    queueMicrotask(() => {
      resetRecipes();
      setSelectedRecipe(null);
      setShowOnlyMakeable(false);
      resetPage();
      setSelectedIngredients(filteredIds);
      showSuccess(`Recovery mode: ${filteredIds.length} expiring item(s) pre-selected.`);
    });
  }, [safeInventoryItems, location?.key, location?.state, setSelectedIngredients, resetPage, resetRecipes]);

  const handleSelectExpiring = () => {
    if (isExpiringSelected) {
      const expiringSet = new Set(expiringIds);
      setSelectedIngredients(safeSelectedIngredients.filter((id) => !expiringSet.has(id)));
    } else if (expiringIds.length > 0) {
      setSelectedIngredients(expiringIds);
    }
  };

  const handleNewSearch = () => {
    resetRecipes();
    setSelectedRecipe(null);
    setShowOnlyMakeable(false);
    setShowLiked(false);
    clearSelection();
  };

  useEffect(() => {
    if (!showLiked) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setShowLiked(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showLiked]);

  const isSelectionMode = generatedRecipes.length === 0;

  return (
    <section className={`recipes-page${isSelectionMode ? "" : " results-view"}`}>
      {isSelectionMode && (
        <>
          <div className="glass-ellipse" />
          <img src={RecipeIllustration} alt="Decorative Recipe" className="decorative-illustration" />
        </>
      )}

      {isLoading ? null : (
        <div className={`recipes-stage ${isSelectionMode ? "selection" : "results"}`}>
          {isSelectionMode ? (
            <IngredientSelector
              loading={loading}
              selectedItemIds={safeSelectedIngredients}
              selectedEconomyStats={selectedEconomyStats}
              visibleItems={visibleItems}
              emptySlots={emptySlots}
              safeIngredientPage={safeIngredientPage}
              ingredientPageCount={ingredientPageCount}
              isInventoryEmpty={safeInventoryItems.length === 0}
              onPrevIngredientPage={onPrevPage}
              onNextIngredientPage={onNextPage}
              onToggleSelect={toggleIngredient}
              onGenerate={() => handleGenerate(selectedInventory)}
              onSelectExpiring={handleSelectExpiring}
              isExpiringSelected={isExpiringSelected}
              likedCount={likedRecipes.length}
              onViewSaved={onToggleShowLiked}
            />
          ) : (
            <RecipeList
              loading={loading}
              isLoadingMore={isLoadingMore}
              recipes={displayedRecipes}
              economyStats={selectedEconomyStats}
              showOnlyCanMake={showOnlyMakeable}
              isMakeableEmpty={isMakeableEmpty}
              onToggleShowOnlyCanMake={() => setShowOnlyMakeable((prev) => !prev)}
              selectedRecipeTitle={selectedRecipe?.title || ""}
              onMoreIdeas={() => handleMoreIdeas(selectedInventory, () => setShowOnlyMakeable(false))}
              onNewSearch={handleNewSearch}
              onViewRecipe={setSelectedRecipe}
              getRecipeImageUrl={getRecipeImageUrl}
              onRecipeImageError={handleRecipeImageError}
              getRecipeKey={getRecipeKey}
              isLiked={isLiked}
              onToggleLike={toggleLike}
              showLiked={showLiked}
              onToggleShowLiked={onToggleShowLiked}
              likedRecipes={likedRecipes}
            />
          )}
        </div>
      )}

      {showLiked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(17,24,20,0.35)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            overflowY: "auto",
            padding: "clamp(1rem, 3vw, 2rem)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
          onClick={() => setShowLiked(false)}
        >
          <div
            style={{
              width: "min(1080px, 100%)",
              background: "rgba(255,255,255,0.78)",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 24px 58px rgba(9,20,14,0.22)",
              padding: "clamp(1rem, 2.5vw, 1.75rem)",
              marginTop: "auto",
              marginBottom: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <Heart size={22} fill="#e53935" stroke="#e53935" strokeWidth={2} aria-hidden="true" />
                <h2 style={{ margin: 0, fontFamily: "var(--font-serif, serif)", fontSize: "clamp(1.3rem, 2.2vw, 1.75rem)", color: "#214336" }}>
                  Saved recipes
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLiked(false)}
                style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "#245a39", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}
                aria-label="Close saved recipes"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {likedRecipes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <Heart size={52} fill="none" stroke="rgba(40,90,72,0.3)" strokeWidth={1.5} aria-hidden="true" />
                <p style={{ margin: 0, color: "#214336", fontWeight: 700, fontSize: "1rem" }}>No saved recipes yet</p>
                <p style={{ margin: 0, color: "#5a7d6e", fontSize: "0.88rem" }}>Tap the heart on any recipe card to save it here</p>
              </div>
            ) : (
              <div className="recipe-grid" role="list" aria-label="Saved recipes" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "1rem" }}>
                {likedRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isSelected={false}
                    onViewRecipe={(r) => { setShowLiked(false); setSelectedRecipe(r); }}
                    getRecipeImageUrl={getRecipeImageUrl}
                    onRecipeImageError={handleRecipeImageError}
                    isLiked={true}
                    onToggleLike={toggleLike}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <RecipeModal
        recipe={selectedRecipe}
        inventory={safeInventoryItems}
        getExpiryStatus={getExpiryStatus}
        getRecipeImageUrl={getRecipeImageUrl}
        onRecipeImageError={handleRecipeImageError}
        onClose={() => { clearCookSuccess(); setSelectedRecipe(null); }}
        onCookedRecipe={() => handleCookedRecipe(selectedRecipe)}
        onAddToShoppingList={() => handleAddToShoppingList(selectedRecipe)}
        isCooking={isCookingRecipe}
        isAdding={isAddingToShopping}
        cookSuccess={cookSuccess}
      />

      <CookConfirmModal
        pending={cookConfirmPending}
        isCooking={isCookingRecipe}
        onConfirm={handleConfirmCook}
        onCancel={handleCancelCook}
      />
    </section>
  );
};

const Recipes = () => (
  <RecipeSelectionProvider>
    <RecipesContent />
  </RecipeSelectionProvider>
);

export default Recipes;
