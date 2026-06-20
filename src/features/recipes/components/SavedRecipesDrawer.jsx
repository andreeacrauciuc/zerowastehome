import React from "react";
import { Heart, X } from "lucide-react";
import { RecipeCard } from "./RecipeList";
import heartIcon from "../../../assets/heart.png";
import "./SavedRecipesDrawer.scss";

const SavedRecipesDrawer = ({
  likedRecipes,
  onClose,
  onViewRecipe,
  onToggleLike,
  getRecipeImageUrl,
  onRecipeImageError,
}) => {
  return (
    <div className="saved-recipes-overlay" onClick={onClose}>
      <div className="saved-recipes-panel" onClick={(e) => e.stopPropagation()}>
        <div className="saved-recipes-header">
          <div className="saved-recipes-title">
            <img src={heartIcon} alt="" className="saved-recipes-title-icon" aria-hidden="true" />
            <h2>Saved recipes</h2>
          </div>
          <button
            type="button"
            className="saved-recipes-close"
            onClick={onClose}
            aria-label="Close saved recipes"
          >
            <X size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {likedRecipes.length === 0 ? (
          <div className="saved-recipes-empty">
            <Heart size={52} fill="none" stroke="rgba(40,90,72,0.3)" strokeWidth={1.5} aria-hidden="true" />
            <p className="saved-recipes-empty-title">No saved recipes yet</p>
            <p className="saved-recipes-empty-hint">
              Tap the heart on any recipe card to save it here
            </p>
          </div>
        ) : (
          <div className="recipe-grid" role="list" aria-label="Saved recipes">
            {likedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isSelected={false}
                onViewRecipe={onViewRecipe}
                getRecipeImageUrl={getRecipeImageUrl}
                onRecipeImageError={onRecipeImageError}
                isLiked={true}
                onToggleLike={onToggleLike}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedRecipesDrawer;
