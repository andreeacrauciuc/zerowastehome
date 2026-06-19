import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "../../../hooks/useCurrency";
import { X } from "lucide-react";
import "../../../styles/features/inventory/AddFoodModal.scss";
import { validateInventoryItem } from "../../../utils/validation";
import { showError } from "../../../utils/toast";
import AddFoodImg from "../../../assets/inventory.png";
import BakeryImg from "../../../assets/Bakery.png";
import FruitsImg from "../../../assets/Fruits.png";
import VeggiesImg from "../../../assets/Vegetables.png";
import MeatImg from "../../../assets/Meat.png";
import DairyImg from "../../../assets/Dairy.png";
import GrainsImg from "../../../assets/Grains.png";
import OtherImg from "../../../assets/Other.png";

const categories = [
  { id: "Fruits", label: "FRUITS", icon: FruitsImg },
  { id: "Vegetables", label: "VEGETABLES", icon: VeggiesImg },
  { id: "Meat", label: "MEAT", icon: MeatImg },
  { id: "Dairy", label: "DAIRY", icon: DairyImg },
  { id: "Bakery", label: "BAKERY", icon: BakeryImg },
  { id: "Grains", label: "GRAINS", icon: GrainsImg },
  { id: "Other", label: "Other", icon: OtherImg },
];

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getEmptyState = () => {
  const today = getLocalDateString();
  return {
    name: "",
    price: "",
    expiry: today,
    addedAt: today,
    category: "Other",
    quantity: "1",
    unit: "pcs",
  };
};

const getFormKey = (initialData) =>
  initialData
    ? JSON.stringify({
        id: initialData.id || null,
        name: initialData.name || "",
        price: initialData.price ?? "",
        expiry: initialData.expiry || "",
        category: initialData.category || "Other",
        quantity: initialData.quantity ?? "1",
        unit: initialData.unit || "pcs",
      })
    : "create-item";

const AddFoodForm = ({ initialData, onClose, onSave, onRequestClose }) => {
  const [formData, setFormData] = useState(() => initialData || getEmptyState());
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const { currencyConfig } = useCurrency();
  const currencySymbol = currencyConfig?.currency === "RON" ? "RON" : "€";
  const isDirty = useMemo(() => {
    const empty = getEmptyState();
    return (
      formData.name.trim() !== "" ||
      String(formData.price ?? "").trim() !== "" ||
      formData.expiry !== empty.expiry ||
      formData.category !== "Other" ||
      String(formData.quantity) !== "1"
    );
  }, [formData]);

  const expiryMinDate = new Date();
  expiryMinDate.setDate(expiryMinDate.getDate() - 14);
  const expiryMin = getLocalDateString(expiryMinDate);
  const fractionalUnits = new Set(["kg", "l"]);
  const quantityStep = fractionalUnits.has(String(formData.unit).toLowerCase())
    ? "0.1"
    : "1";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const rawQuantity = String(formData.quantity ?? "").trim();
    const parsedQuantity = Number(rawQuantity);
    if (rawQuantity === "" || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      const message = "Quantity must be a number greater than 0.";
      setValidationError(message);
      showError(message);
      return;
    }

    const cleaned = {
      ...formData,
      price: String(formData.price ?? "").trim() === "" ? null : Number(formData.price),
      quantity: parsedQuantity,
    };

    const validation = validateInventoryItem(cleaned);
    if (!validation.isValid) {
      setValidationError(validation.error);
      showError(validation.error);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(cleaned);
      setValidationError("");
      onClose();
    } catch {
      showError("Could not save item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field, value) => {
    if (validationError) {
      setValidationError("");
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = useCallback(() => {
    if (isDirty && !initialData) {
      setShowCloseConfirm(true);
      return;
    }
    setValidationError("");
    setFormData(initialData || getEmptyState());
    onClose();
  }, [isDirty, initialData, onClose]);

  const confirmClose = () => {
    setShowCloseConfirm(false);
    setValidationError("");
    setFormData(initialData || getEmptyState());
    onClose();
  };

  useEffect(() => {
    if (onRequestClose) onRequestClose(handleClose);
  }, [onRequestClose, handleClose]);

  return (
    <form className="add-food-form" onSubmit={handleSubmit} style={{ position: "relative" }}>
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
        <div className="input-group" style={{ flex: 2 }}>
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
        <div className="input-group" style={{ flex: 1 }}>
          <label>Unit</label>
          <select
            className="unit-select"
            value={formData.unit}
            onChange={(e) => updateField("unit", e.target.value)}
          >
            <option value="pcs">pcs</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="l">l</option>
            <option value="ml">ml</option>
            <option value="pack">pack</option>
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
          {categories.map((cat) => (
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
        <p role="alert" style={{ color: "#b91c1c", marginTop: "0.5rem" }}>
          {validationError}
        </p>
      ) : null}
      {showCloseConfirm && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,0.2)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          borderRadius: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          padding: "1.5rem",
        }}>
          <div style={{
            background: "#FDFBF7",
            borderRadius: "14px",
            padding: "1.5rem",
            maxWidth: "320px",
            width: "100%",
            border: "1px solid rgba(40,90,72,0.12)",
            boxShadow: "0 16px 40px rgba(40,90,72,0.12)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}>
            <strong style={{ fontSize: "1rem", color: "#0f172a" }}>Discard changes?</strong>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#475569", lineHeight: 1.5 }}>
              You have unsaved changes. Are you sure you want to close?
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "9999px",
                  border: "1px solid rgba(15,23,42,0.15)",
                  background: "transparent",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                }}
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={confirmClose}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "9999px",
                  border: "none",
                  background: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                }}
              >
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
          <h2>{initialData ? "Edit Item" : "Add to fridge"}</h2>
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
