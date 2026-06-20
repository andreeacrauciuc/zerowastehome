import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";
import { getItemLabel } from "../utils/shoppingUtils";

const listItemMotion = {
  hidden: { opacity: 0, y: 10, scale: 0.99 },
  show: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
};

const MotionDiv = motion.div;
const MotionSection = motion.section;

function CheckedSection({ checkedItems, resolvePrice, onToggle, onDelete }) {
  const { currencyConfig } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);

  if (checkedItems.length === 0) return null;

  return (
    <MotionSection
      className="source-group group-card glass-panel checked-section"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <header
        className="source-group-header is-collapsible"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="source-heading-copy">
          <h3 className="checked-section-title">
            <Check size={16} />
            Checked ({checkedItems.length})
          </h3>
          <p className="checked-section-hint">
            {isExpanded ? "Tap to collapse" : "Tap to expand"}
          </p>
        </div>
        <div className="source-header-actions">
          <span className="source-count-pill">{checkedItems.length}</span>
        </div>
      </header>

      <AnimatePresence>
        {isExpanded && (
          <MotionDiv
            className="group-list-motion is-clipped"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {checkedItems.map((item) => {
              const displayPrice = resolvePrice(item);
              return (
                <MotionDiv
                  key={item.id}
                  className="list-row shopping-item-row is-checked"
                  variants={listItemMotion}
                  layout
                >
                  <div className="row-left shopping-item-main">
                    <button
                      type="button"
                      className="check-box shopping-checkbox active"
                      onClick={() => onToggle(item)}
                    >
                      <Check size={14} />
                    </button>
                    <div className="info shopping-item-info">
                      <div className="item-title-line shopping-item-heading">
                        <span className="item-title shopping-item-title is-struck">
                          {getItemLabel(item)}
                        </span>
                      </div>
                      <span className="item-sub shopping-item-meta">
                        <span className="cat-tag">{item.category}</span>
                        <span>{item.quantity} {item.unit}</span>
                        {displayPrice.price !== null && (
                          <span className="inline-price-readonly">
                            {formatCurrency(displayPrice.price, currencyConfig)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="shopping-inline-actions">
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
            })}
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionSection>
  );
}

export default CheckedSection;
