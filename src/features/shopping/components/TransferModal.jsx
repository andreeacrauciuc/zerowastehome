import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatCurrency } from "../../../utils/currency";
import { getItemLabel } from "../utils/shoppingUtils";

const MotionDiv = motion.div;
const getFallbackPrice = (item, resolvePrice) => {
  const estimated = resolvePrice?.(item)?.price;
  return Number.isFinite(estimated) ? estimated : 0;
};

const isDraftPriceEmpty = (rawValue) => {
  const value = String(rawValue ?? "").trim();
  if (value === "") return true;
  const parsed = Number.parseFloat(value);
  return !Number.isFinite(parsed);
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getExpiryMinDate = () => {
  const min = new Date();
  min.setDate(min.getDate() - 14);
  return getLocalDateString(min);
};

const getDraftExpiry = (drafts, item) =>
  String(drafts?.[item.id]?.expiry || item?.expiry || "").trim();

function TransferModal({
  isOpen,
  checkedItems,
  transferDrafts,
  resolvePrice,
  isPurchasing,
  onUpdateDraft,
  onConfirm,
  onClose,
}) {
  const { currencyConfig } = useCurrency();
  const currencySymbol = currencyConfig?.currency === "RON" ? "RON" : "€";

  const expiryMin = getExpiryMinDate();

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          className="transfer-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <MotionDiv
            className="transfer-modal"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="transfer-modal-header">
              <h3>Confirm Real Prices</h3>
              <button
                type="button"
                className="transfer-close-btn"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </div>

            <p className="transfer-modal-subtitle">
              Confirm the final paid price and expiry date so inventory
              analytics and expiry alerts stay accurate. Expiry defaults to
              today — adjust it per item.
            </p>

            <div className="transfer-items">
              {checkedItems.map((item) => {
                const draftExpiry = getDraftExpiry(transferDrafts, item);

                const priceIsEmpty = isDraftPriceEmpty(
                  transferDrafts[item.id]?.price,
                );
                const fallbackPrice = getFallbackPrice(item, resolvePrice);
                const hasEstimate = fallbackPrice > 0;

                const expiryIsEmpty = !draftExpiry;

                return (
                  <div
                    className="transfer-item-row"
                    key={`transfer-${item.id}`}
                  >
                    <div className="transfer-item-info">
                      <strong>{getItemLabel(item)}</strong>
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                    </div>

                    <div className="transfer-item-fields">
                      <label className="transfer-field">
                        <span className="transfer-field-label">
                          Price ({currencySymbol})
                        </span>
                        <div className="transfer-price-input-wrap">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={transferDrafts[item.id]?.price || ""}
                            onChange={(e) =>
                              onUpdateDraft(item.id, "price", e.target.value)
                            }
                          />
                        </div>
                        {priceIsEmpty && hasEstimate && (
                          <span className="transfer-price-fallback-hint">
                            <Info size={12} aria-hidden="true" />
                            {`We'll use the estimated ${formatCurrency(fallbackPrice, currencyConfig)}`}
                          </span>
                        )}
                      </label>

                      <label className="transfer-field">
                        <span className="transfer-field-label">
                          Expiry date
                        </span>
                        <div className="transfer-price-input-wrap">
                          <input
                            type="date"
                            aria-label={`Expiry date for ${getItemLabel(item)}`}
                            min={expiryMin}
                            className={
                              expiryIsEmpty ? "transfer-input-warning" : undefined
                            }
                            value={getDraftExpiry(transferDrafts, item)}
                            onChange={(e) =>
                              onUpdateDraft(item.id, "expiry", e.target.value)
                            }
                          />
                        </div>
                        {expiryIsEmpty && (
                          <span className="transfer-price-fallback-hint transfer-expiry-warning">
                            <Info size={12} aria-hidden="true" />
                            No expiry set — you'll be asked to confirm
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="transfer-modal-actions">
              <button
                type="button"
                className="transfer-cancel-btn"
                onClick={onClose}
                disabled={isPurchasing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="transfer-confirm-btn"
                onClick={onConfirm}
                disabled={isPurchasing}
              >
                {isPurchasing ? "Transferring..." : "Confirm & Transfer"}
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

export default TransferModal;
