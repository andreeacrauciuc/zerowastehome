import React from "react";
import ModalShell from "../../../components/ui/ModalShell";

const ITEM_CATEGORIES = ["Fruits", "Vegetables", "Meat", "Dairy", "Bakery", "Grains", "Other"];

function ScannerResultModal({ isOpen, form, onFormChange, onSave, onClose, currencySymbol }) {
  const set = (field) => (e) => onFormChange(field, e.target.value);

  return (
    <ModalShell isOpen={isOpen} title="Scan result" onClose={onClose} className="scanner-result-modal">
      <div className="modal-shell-body">
        <div className="shopping-add-modal-grid">
          <label className="full-width">
            Name
            <input
              type="text"
              placeholder="Milk, tomatoes, pasta..."
              value={form.name}
              onChange={set("name")}
            />
          </label>

          <label>
            Category
            <select value={form.category} onChange={set("category")}>
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.quantity}
              onChange={set("quantity")}
            />
          </label>

          <label>
            Unit
            <select value={form.unit} onChange={set("unit")}>
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
              <option value="pack">pack</option>
            </select>
          </label>

          <label className="price-field">
            <span className="price-field-label-row">
              <span>Price</span>
              <span className="price-currency-chip">{currencySymbol}</span>
            </span>
            <div className="price-input-wrap">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={set("price")}
              />
            </div>
          </label>

          <label className="full-width">
            Expiry date
            <input
              type="date"
              value={form.expiry}
              onChange={set("expiry")}
            />
          </label>
        </div>

        <div className="modal-shell-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </ModalShell>
  );
}

export default ScannerResultModal;
