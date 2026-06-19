import React from "react";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";

function ShoppingHeader({ items, marketPriceTotal, estimatedCo2Kg, safeSwapSavings, remainingCount, checkedCount }) {
  const { currencyConfig } = useCurrency();

  return (
    <header className="shop-header">
      <div className="shop-heading">
        <h1 className="page-title">Smart <span>shopping</span></h1>
        <p>Organized, recipe-aware shopping for zero waste cooking</p>
      </div>

      <div className="shop-stats">
        {items.length === 0 ? (
          <div className="stat-pill" style={{ gridColumn: "1 / -1", opacity: 0.6 }}>
            <span className="label">Your list is empty</span>
            <strong style={{ fontSize: "0.88rem", fontWeight: 600 }}>
              Add items to see cost estimates
            </strong>
          </div>
        ) : (
          <>
            <div className="stat-pill">
              <span className="label">Total estimate</span>
              <strong>{formatCurrency(marketPriceTotal, currencyConfig)}</strong>
              <small className="stat-note">Estimated CO2: {estimatedCo2Kg.toFixed(2)} kg</small>
            </div>
            <div className="stat-pill eco">
              <span className="label">Pantry swap savings</span>
              <strong>{formatCurrency(safeSwapSavings, currencyConfig)}</strong>
              <small className="stat-note">Saved today via pantry swaps</small>
            </div>
            <div className="stat-pill soft">
              <span className="label">Remaining</span>
              <strong>{remainingCount}</strong>
            </div>
            <div className="stat-pill success">
              <span className="label">Checked</span>
              <strong>{checkedCount}</strong>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default ShoppingHeader;
