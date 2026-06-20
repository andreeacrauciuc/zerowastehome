import React from "react";
import { showError } from "../../../utils/toast";
import { getItemLabel } from "../utils/shoppingUtils";

function UnknownPriceAlert({ pricedItems, unknownPriceCount, onReveal }) {
  if (unknownPriceCount === 0) return null;

  const unknownNames = pricedItems
    .filter((entry) => entry.priceMeta.source === "unknown")
    .map((entry) => getItemLabel(entry.item))
    .filter(Boolean);

  const handleClick = () => {
    onReveal?.();
    showError(
      `${unknownPriceCount} item${unknownPriceCount > 1 ? "s" : ""} without price: ${unknownNames.join(", ")}. Edit them to add a price.`
    );
  };

  return (
    <button
      type="button"
      className="unknown-price-cta"
      onClick={handleClick}
    >
      {unknownPriceCount} item{unknownPriceCount > 1 ? "s" : ""} without price — tap to see which
    </button>
  );
}

export default UnknownPriceAlert;
