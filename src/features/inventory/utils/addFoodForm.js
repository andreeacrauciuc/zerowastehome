import {
  DEFAULT_CATEGORY,
  DEFAULT_UNIT,
  EXPIRY_MIN_DAYS_BACK,
  FRACTIONAL_UNITS,
} from "../constants";

export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getEmptyFormState = () => {
  const today = getLocalDateString();
  return {
    name: "",
    price: "",
    expiry: today,
    addedAt: today,
    category: DEFAULT_CATEGORY,
    quantity: "1",
    unit: DEFAULT_UNIT,
  };
};

export const getFormKey = (initialData) =>
  initialData
    ? JSON.stringify({
        id: initialData.id || null,
        name: initialData.name || "",
        price: initialData.price ?? "",
        expiry: initialData.expiry || "",
        category: initialData.category || DEFAULT_CATEGORY,
        quantity: initialData.quantity ?? "1",
        unit: initialData.unit || DEFAULT_UNIT,
      })
    : "create-item";

export const getExpiryMinDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - EXPIRY_MIN_DAYS_BACK);
  return getLocalDateString(date);
};

export const getQuantityStep = (unit) =>
  FRACTIONAL_UNITS.has(String(unit).toLowerCase()) ? "0.1" : "1";

export const isFormDirty = (formData) => {
  const empty = getEmptyFormState();
  return (
    formData.name.trim() !== "" ||
    String(formData.price ?? "").trim() !== "" ||
    formData.expiry !== empty.expiry ||
    formData.category !== DEFAULT_CATEGORY ||
    String(formData.quantity) !== "1"
  );
};

export const parseQuantity = (rawValue) => {
  const raw = String(rawValue ?? "").trim();
  const parsed = Number(raw);
  if (raw === "" || !Number.isFinite(parsed) || parsed <= 0) {
    return { error: "Quantity must be a number greater than 0" };
  }
  return { value: parsed };
};

export const cleanFormData = (formData, parsedQuantity) => ({
  ...formData,
  price: String(formData.price ?? "").trim() === "" ? null : Number(formData.price),
  quantity: parsedQuantity,
});
