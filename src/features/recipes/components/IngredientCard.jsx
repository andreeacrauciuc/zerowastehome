import React, { useState } from "react";
import { Check } from "lucide-react";
import "./IngredientCard.scss";

const IngredientCard = ({ item, image, fallbackImage, status, expiryLabel, isSelected, onToggle }) => {
  const safeStatus = status || "na";
  const safeExpiryLabel = expiryLabel || "N/A";
  const [hasImageError, setHasImageError] = useState(false);
  const displayImage = hasImageError ? null : image || fallbackImage || null;

  const handleImageError = (event) => {
    if (fallbackImage && event.currentTarget.src !== fallbackImage) {
      event.currentTarget.src = fallbackImage;
      return;
    }

    setHasImageError(true);
  };

  return (
    <button
      type="button"
      className={`ingredient-tile ${isSelected ? "active" : ""} expiry-${safeStatus}`}
      onClick={onToggle}
      role="listitem"
      aria-pressed={isSelected}
    >
      {isSelected && (
        <span className="ingredient-check">
          <Check size={12} />
        </span>
      )}

      <div className="ingredient-image-wrap">
        {displayImage ? (
          <img src={displayImage} alt={item.category || item.name} className="ingredient-image" onError={handleImageError} />
        ) : (
          <span className="ingredient-icon">{item.icon || "ðŸ¥—"}</span>
        )}
      </div>

      <span className="ingredient-name">{item.name}</span>
      <span className={`ingredient-expiry ${safeStatus}`}>{safeExpiryLabel}</span>
    </button>
  );
};

export default IngredientCard;