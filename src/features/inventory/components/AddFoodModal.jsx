import React, { useCallback } from "react";
import { X } from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { useAddFoodForm } from "../hooks/useAddFoodForm";
import { getFormKey } from "../utils/addFoodForm";
import { FOOD_CATEGORIES, UNIT_OPTIONS } from "../constants";
import AddFoodImg from "../../../assets/inventory.png";
import "./AddFoodModal.scss";

const AddFoodForm = ({ initialData, onClose, onSave, onRequestClose }) => {
  const { currencyConfig } = useCurrency();
  const currencySymbol = currencyConfig?.currency === "RON" ? "RON" : "€";

  const {
    formData,
    validationError,
    isSaving,
    showCloseConfirm,
    expiryMin,
    quantityStep,
    updateField,
    handleSubmit,
    handleClose,
    cancelClose,
    confirmClose,
  } = useAddFoodForm({ initialData, onClose, onSave, onRequestClose });

  return (
    <form className="add-food-form" onSubmit={handleSubmit}>
      <div className="input-group">
        <label>Item name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
        />
      </div>

      <div className="input-row">
        <div className="input-group input-group--quantity">
          <label>Quantity</label>
          <input
            type="number"
            step={quantityStep}
            value={formData.quantity}
            onChange={(e) => updateField("quantity", e.target.value)}
            required
            min={quantityStep}
          />
        </div>
        <div className="input-group input-group--unit">
          <label>Unit</label>
          <select
            className="unit-select"
            value={formData.unit}
            onChange={(e) => updateField("unit", e.target.value)}
          >
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="input-row">
        <div className="input-group has-helper">
          <label className="price-label">
            <span>Price</span>
            <span className="currency-tag">{currencySymbol}</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => updateField("price", e.target.value)}
            min="0"
          />
          <small className="input-helper">
            Adding a price helps us calculate your savings accurately, but it&apos;s optional
          </small>
        </div>
        <div className="input-group">
          <label>Expiry date</label>
          <input
            type="date"
            value={formData.expiry}
            onChange={(e) => updateField("expiry", e.target.value)}
            required
            min={expiryMin}
          />
        </div>
      </div>

      <div className="category-section">
        <label className="section-label">Category</label>
        <div className="category-grid">
          {FOOD_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-item ${formData.category === cat.id ? "active" : ""}`}
              onClick={() => updateField("category", cat.id)}
            >
              <span className="cat-icon">
                <img src={cat.icon} alt={cat.id} />
              </span>
              <span className="cat-label">{cat.id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="cancel-item-btn" onClick={handleClose}>
          Cancel
        </button>
        <button type="submit" className="save-item-btn" disabled={isSaving}>
          {isSaving ? "Saving..." : initialData ? "Update item" : "Add item"}
        </button>
      </div>

      {validationError ? (
        <p role="alert" className="form-error">
          {validationError}
        </p>
      ) : null}

      {showCloseConfirm && (
        <div className="close-confirm-overlay">
          <div className="close-confirm-dialog">
            <strong className="close-confirm-title">Discard changes?</strong>
            <p className="close-confirm-text">
              You have unsaved changes. Are you sure you want to close?
            </p>
            <div className="close-confirm-actions">
              <button type="button" className="close-confirm-keep" onClick={cancelClose}>
                Keep editing
              </button>
              <button type="button" className="close-confirm-discard" onClick={confirmClose}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

const AddFoodModal = ({ isOpen, onClose, onSave, initialData }) => {
  const modalKey = getFormKey(initialData);
  const formCloseRef = React.useRef(null);

  const handleHeaderClose = () => {
    if (formCloseRef.current) {
      formCloseRef.current();
    } else {
      onClose();
    }
  };

  const registerFormClose = useCallback((fn) => {
    formCloseRef.current = fn;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay add-food-modal-overlay">
      <div
        className="add-food-background"
        style={{ backgroundImage: `url(${AddFoodImg})` }}
        aria-hidden="true"
      />
      <div
        className="modal-container add-food-modal-container animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{initialData ? "Edit item" : "Add to fridge"}</h2>
          <button type="button" className="close-btn" onClick={handleHeaderClose}>
            <X />
          </button>
        </header>

        <AddFoodForm
          key={modalKey}
          initialData={initialData}
          onClose={onClose}
          onSave={onSave}
          onRequestClose={registerFormClose}
        />
      </div>
    </div>
  );
};

export default AddFoodModal;
