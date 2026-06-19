import React from "react";
import { Repeat, ShoppingBag } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";

function ShoppingSummary({ totalItems, marketPrice, swapSavings, estimatedTotal, onCheckout, canCheckout }) {
  const { currencyConfig } = useCurrency();

  return (
    <aside className="shopping-summary-sidebar">
      <section className="shopping-summary-card">
        <p className="summary-eyebrow">SHOPPING summary</p>

        <div className="summary-rows">
          <div className="summary-row">
            <span>Total items</span>
            <strong>{totalItems}</strong>
          </div>
          <div className="summary-row">
            <span>Market price est.</span>
            <strong>{formatCurrency(marketPrice, currencyConfig)}</strong>
          </div>
          <div className="summary-row is-swap">
            <span>
              <Repeat size={14} /> Pantry swaps
            </span>
            <strong>- {formatCurrency(swapSavings, currencyConfig)}</strong>
          </div>
        </div>

        <div className="summary-divider" />

        <div className="summary-total">
          <span>Estimated total</span>
          <h3>{formatCurrency(estimatedTotal, currencyConfig)}</h3>
        </div>

        <button
          type="button"
          className="summary-checkout-btn"
          onClick={onCheckout}
          disabled={!canCheckout}
          aria-describedby={!canCheckout ? "checkout-disabled-hint" : undefined}
        >
          <ShoppingBag size={18} />
          Checkout and add to fridge
        </button>

        {!canCheckout && (
          <p id="checkout-disabled-hint" className="checkout-disabled-hint" role="note">
            Check off items above to enable checkout
          </p>
        )}

        <p className="summary-subtext">
          This will mark items as bought and update your digital fridge inventory instantly
        </p>

        {marketPrice === 0 && totalItems > 0 && (
          <p style={{ fontSize: "0.72rem", color: "var(--slate-soft, #64748b)", textAlign: "center", marginTop: "0.5rem", lineHeight: 1.45, opacity: 0.8 }}>
            Prices show 0 because no price history exists yet. Add prices to items or complete a purchase first.
          </p>
        )}
      </section>
    </aside>
  );
}

export default ShoppingSummary;
