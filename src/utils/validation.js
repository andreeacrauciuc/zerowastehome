export const validateInventoryItem = (item) => {
  const name = String(item?.name || "").trim();
  const quantity = Number(item?.quantity);

  if (!name) {
    return { isValid: false, error: "Item name is required." };
  }

  if (name.length < 2 || name.length > 50) {
    return { isValid: false, error: "Item name must be between 2 and 50 characters." };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { isValid: false, error: "Quantity must be greater than 0." };
  }

  if (item?.price !== null && item?.price !== undefined && String(item.price).trim() !== "") {
    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) {
      return { isValid: false, error: "Price must be 0 or greater when provided." };
    }
  }

  const VALID_CATEGORIES = ["Fruits", "Vegetables", "Meat", "Dairy", "Bakery", "Grains", "Other"];
  if (item?.category && !VALID_CATEGORIES.includes(item.category)) {
    return { isValid: false, error: "Invalid category." };
  }

  const VALID_UNITS = ["pcs", "kg", "g", "l", "ml", "pack"];
  if (item?.unit && !VALID_UNITS.includes(item.unit)) {
    return { isValid: false, error: "Invalid unit." };
  }

  if (item?.expiry !== null && item?.expiry !== undefined && String(item.expiry).trim() !== "") {
    const parsed = new Date(item.expiry);
    if (isNaN(parsed.getTime())) {
      return { isValid: false, error: "Invalid expiry date." };
    }
  }

  return { isValid: true, error: null };
};
