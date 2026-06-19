import React from "react";
import { motion } from "framer-motion";
import { Check, PencilLine, Trash2 } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";
import { t } from "../../../locales";
import { findInventoryCollision, formatQuantity, getAiSubstituteSuggestion, getItemLabel } from "../utils/shoppingUtils";

const listItemMotion = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

const MotionDiv = motion.div;

function ShoppingItemRow({ item, resolvePrice, inventoryByName, inventory, onToggle, onEdit, onDelete, onAcceptSwap }) {
  const { currencyConfig } = useCurrency();
  const displayPrice = resolvePrice(item);
  const substituteHint = getAiSubstituteSuggestion(item, displayPrice);
  const showEstimated = displayPrice.source === "historical";
  const stockCollision = findInventoryCollision(item, inventoryByName, inventory);
  const stockCollisionQty = formatQuantity(stockCollision?.quantity);
  const stockCollisionUnit = stockCollision?.unit || "pcs";

  return (
    <MotionDiv
      key={item.id}
      className={`list-row shopping-item-row ${item.checked ? "is-checked" : ""} ${item.isPantrySwap ? "is-swap-item" : ""}`}
      variants={listItemMotion}
      exit="exit"
      layout
    >
      <div className="row-left shopping-item-main">
        <button
          type="button"
          className={`check-box shopping-checkbox ${item.checked ? "active" : ""}`}
          onClick={() => onToggle(item)}
        >
          {item.checked && <Check size={14} />}
        </button>

        <div className="info shopping-item-info">
          <div className="item-title-line shopping-item-heading">
            <span className="item-title shopping-item-title">{getItemLabel(item)}</span>
            {item.isPantrySwap && <span className="swap-item-badge">Swapped Item</span>}
          </div>

          <span className="item-sub shopping-item-meta">
            <span className="cat-tag">{item.category}</span>
            <span>{item.quantity} {item.unit}</span>
            {displayPrice.price !== null ? (
              <span className="inline-price-readonly">
                {showEstimated ? "~" : ""}
                {formatCurrency(displayPrice.price, currencyConfig)}
              </span>
            ) : (
              <button
                type="button"
                className="inline-price-readonly price-missing"
                onClick={() => onEdit(item)}
                style={{ cursor: "pointer" }}
              >
                {t("shopping.unknownPrice")}
              </button>
            )}
          </span>

          {item.sourceRecipeTitle && (
            <span
              className="recipe-context"
              title={item.sourceRecipeTitle}
              style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
            >
              For: {item.sourceRecipeTitle}
            </span>
          )}

          {stockCollision && (
            <span className="stock-collision-badge">
              Already in fridge: {stockCollisionQty} {stockCollisionUnit}
            </span>
          )}

          {substituteHint && <span className="swap-hint">{substituteHint}</span>}
          {substituteHint && (
            <button type="button" className="swap-accept-btn" onClick={() => onAcceptSwap(item)}>
              Use pantry swap
            </button>
          )}
        </div>
      </div>

      <div className="shopping-inline-actions">
        <button
          type="button"
          className="row-action-btn row-action-edit"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${getItemLabel(item)}`}
          title={`Edit ${getItemLabel(item)}`}
        >
          <PencilLine size={15} />
        </button>
        <button
          type="button"
          className="del-btn shopping-delete-btn"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </MotionDiv>
  );
}

export default ShoppingItemRow;
