import { useCallback, useEffect, useMemo, useState } from "react";
import { validateInventoryItem } from "../../../utils/validation";
import { showError } from "../../../utils/toast";
import {
  cleanFormData,
  getEmptyFormState,
  getExpiryMinDate,
  getQuantityStep,
  isFormDirty,
  parseQuantity,
} from "../utils/addFoodForm";

export function useAddFoodForm({ initialData, onClose, onSave, onRequestClose }) {
  const [formData, setFormData] = useState(() => initialData || getEmptyFormState());
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = useMemo(() => isFormDirty(formData), [formData]);
  const expiryMin = getExpiryMinDate();
  const quantityStep = getQuantityStep(formData.unit);

  const updateField = (field, value) => {
    if (validationError) setValidationError("");
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const quantity = parseQuantity(formData.quantity);
    if (quantity.error) {
      setValidationError(quantity.error);
      showError(quantity.error);
      return;
    }

    const cleaned = cleanFormData(formData, quantity.value);

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
      showError("Could not save item. Please try again");
    } finally {
      setIsSaving(false);
    }
  };

  const resetAndClose = useCallback(() => {
    setValidationError("");
    setFormData(initialData || getEmptyFormState());
    onClose();
  }, [initialData, onClose]);

  const handleClose = useCallback(() => {
    if (isDirty && !initialData) {
      setShowCloseConfirm(true);
      return;
    }
    resetAndClose();
  }, [isDirty, initialData, resetAndClose]);

  const cancelClose = () => setShowCloseConfirm(false);

  const confirmClose = () => {
    setShowCloseConfirm(false);
    resetAndClose();
  };

  useEffect(() => {
    if (onRequestClose) onRequestClose(handleClose);
  }, [onRequestClose, handleClose]);

  return {
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
  };
}
