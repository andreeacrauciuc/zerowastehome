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
      onClick={handleClick}
      style={{
        display: "block",
        width: "100%",
        marginTop: "0.65rem",
        padding: "0.6rem 0.85rem",
        borderRadius: "10px",
        border: "1px solid rgba(245,158,11,0.28)",
        background: "rgba(245,158,11,0.07)",
        color: "#92400e",
        fontSize: "0.78rem",
        fontWeight: 600,
        textAlign: "left",
        cursor: "pointer",
        lineHeight: 1.4,
      }}
    >
      {unknownPriceCount} item{unknownPriceCount > 1 ? "s" : ""} without price — tap to see which
    </button>
  );
}

export default UnknownPriceAlert;
