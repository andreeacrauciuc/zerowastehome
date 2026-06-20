import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Edit3, Plus, X } from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";

const MotionDiv = motion.div;

const CATEGORIES = ["Fruits", "Vegetables", "Meat", "Dairy", "Bakery", "Grains", "Other"];
const UNITS = ["pcs", "kg", "g", "l", "ml"];

function InventoryWarningBanner({ warning, onCancel, onConfirm }) {
  return (
    <div className="inventory-warning-banner">
      <p className="inventory-warning-text">
        {warning}
      </p>
      <div className="inventory-warning-actions">
        <button
          type="button"
          className="inventory-warning-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inventory-warning-confirm"
          onClick={onConfirm}
        >
          Add anyway
        </button>
      </div>
    </div>
  );
}

function AddItemModal({ isOpen, initialState, onClose, onSave }) {
  const { currencyConfig } = useCurrency();
  const currencySymbol = currencyConfig?.currency === "RON" ? "RON" : "€";

  const [name, setName] = useState(initialState?.name || "");
  const [price, setPrice] = useState(initialState?.price || "");
  const [qty, setQty] = useState(initialState?.qty || "1");
  const [unit, setUnit] = useState(initialState?.unit || "pcs");
  const [category, setCategory] = useState(initialState?.category || "Other");
  const [inventoryWarning, setInventoryWarning] = useState(null);

  const editingId = initialState?.editingId || null;

  React.useEffect(() => {
    if (!isOpen) return;
    setName(initialState?.name || "");
    setPrice(initialState?.price || "");
    setQty(initialState?.qty || "1");
    setUnit(initialState?.unit || "pcs");
    setCategory(initialState?.category || "Other");
    setInventoryWarning(null);
  }, [isOpen, initialState]);

  const fields = { name, price, qty, unit, category, editingId };

  const handleSave = async () => {
    const result = await onSave(fields);
    if (result === true) { onClose(); return; }
    if (result?.needsConfirm) { setInventoryWarning(result.warning); }
  };

  const handleForceAdd = async () => {
    setInventoryWarning(null);
    const result = await onSave(fields, { bypassInventoryCheck: true });
    if (result === true) onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          className="shopping-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <MotionDiv
            className="shopping-add-modal"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shopping-add-modal-header">
              <h3>{editingId ? "Edit item" : "Add new item"}</h3>
              <button type="button" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="shopping-add-modal-grid">
              <label>
                Name
                <input
                  type="text"
                  placeholder="Milk, tomatoes, pasta..."
                  value={name}
                  onChange={(e) => { setName(e.target.value); setInventoryWarning(null); }}
                />
              </label>

              <label>
                Category
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label>
                Quantity
                <input type="number" min="0" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
              </label>

              <label>
                Unit
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>

              <label className="price-field full-width">
                <span className="price-field-label-row">
                  <span>Estimated price </span>
                  <span className="price-currency-chip">{currencySymbol}</span>
                </span>
                <div className="price-input-wrap">
                  <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </label>
            </div>

            {inventoryWarning && (
              <InventoryWarningBanner
                warning={inventoryWarning}
                onCancel={() => setInventoryWarning(null)}
                onConfirm={handleForceAdd}
              />
            )}

            <div className="shopping-add-modal-actions">
              <button type="button" className="ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="primary" onClick={handleSave}>
                {editingId ? <Edit3 size={16} /> : <Plus size={16} />}
                {" "}{editingId ? "Save" : "Add item"}
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

export default AddItemModal;
