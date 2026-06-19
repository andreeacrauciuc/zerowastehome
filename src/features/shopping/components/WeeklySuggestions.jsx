import React, { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, ShoppingBag } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../hooks/useCurrency";
import PinImg from "../../../assets/pin.png";

const NotePin = () => (
  <img src={PinImg} alt="" aria-hidden="true" className="weekly-suggestions-pin" />
);

function WeeklySuggestions({
  suggestions,
  onAddSelected,
  onDismiss,
  onRegenerate,
}) {
  const { currencyConfig } = useCurrency();
  const [checked, setChecked] = useState(() => new Set());
  const [isAdding, setIsAdding] = useState(false);

  const suggestionKey = useMemo(
    () => suggestions.map((s) => s.id).join("|"),
    [suggestions]
  );

  useEffect(() => {
    setChecked(new Set(suggestions.map((s) => s.id)));
  }, [suggestionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!suggestions || suggestions.length === 0) {
    return (
      <section className="weekly-suggestions-note" aria-label="Weekly shopping suggestions">
        <NotePin />
        <header className="weekly-suggestions-head">
          <h3 className="weekly-suggestions-title">Weekly shopping suggestions</h3>
          <p className="weekly-suggestions-subtitle">
            Generated from your household consumption patterns
          </p>
        </header>
        <p className="weekly-suggestions-empty">
          Not enough consumption history yet to spot weekly patterns. Keep using
          your fridge - or pull a starter list now
        </p>
        <div className="weekly-suggestions-actions">
          <button
            type="button"
            className="weekly-ghost-btn weekly-regen-btn"
            onClick={onRegenerate}
            title="Recalculate recommendations now"
          >
            <RefreshCw size={14} />
            Regenerate
          </button>
        </div>
      </section>
    );
  }

  const toggle = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selected = suggestions.filter((s) => checked.has(s.id));
  const estimatedCost = selected.reduce(
    (sum, s) => sum + (Number(s.estimatedPrice) || 0),
    0
  );

  const handleAdd = async () => {
    if (selected.length === 0 || isAdding) return;
    setIsAdding(true);
    try {
      await onAddSelected(selected);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="weekly-suggestions-note" aria-label="Weekly shopping suggestions">
      <NotePin />

      <header className="weekly-suggestions-head">
        <h3 className="weekly-suggestions-title">Weekly shopping suggestions</h3>
        <p className="weekly-suggestions-subtitle">
          Generated from your household consumption patterns
        </p>
      </header>

      <ul className="weekly-suggestions-list">
        {suggestions.map((s) => {
          const isChecked = checked.has(s.id);
          return (
            <li key={s.id} className="weekly-suggestion-row">
              <label className="weekly-suggestion-label">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(s.id)}
                  disabled={isAdding}
                />
                <span className="weekly-suggestion-box" aria-hidden="true">
                  {isChecked && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="weekly-suggestion-name">{s.name}</span>
                <span className="weekly-suggestion-meta">
                  {s.quantity ? `${s.quantity} ${s.unit || "pcs"}` : null}
                  {Number(s.estimatedPrice) > 0
                    ? ` · ${formatCurrency(s.estimatedPrice, currencyConfig)}`
                    : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="weekly-suggestions-footer">
        <div className="weekly-footer-row">
          <span>Suggested Items:</span>
          <strong>{selected.length}</strong>
        </div>
        <div className="weekly-footer-row">
          <span>Estimated Cost:</span>
          <strong>{formatCurrency(estimatedCost, currencyConfig)}</strong>
        </div>
      </div>

      <div className="weekly-suggestions-actions">
        <button
          type="button"
          className="weekly-primary-btn"
          onClick={handleAdd}
          disabled={selected.length === 0 || isAdding}
        >
          <ShoppingBag size={16} />
          {isAdding ? "Adding..." : "Add selected to shopping list"}
        </button>

        <div className="weekly-secondary-row">
          <button type="button" className="weekly-ghost-btn" onClick={onDismiss}>
            Not this week
          </button>
          <button
            type="button"
            className="weekly-ghost-btn weekly-regen-btn"
            onClick={onRegenerate}
            title="Recalculate recommendations now"
          >
            <RefreshCw size={14} />
            Regenerate
          </button>
        </div>
      </div>
    </section>
  );
}

export default WeeklySuggestions;
