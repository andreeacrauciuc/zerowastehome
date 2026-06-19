const CATEGORY_AVERAGE_PRICE_EUR = {
  Fruits: 2.5,
  Vegetables: 2.2,
  Meat: 8.9,
  Dairy: 3.6,
  Bakery: 2.8,
  Grains: 2.9,
  Other: 0,
};

const CATEGORY_AVERAGE_PRICE_RON = {
  Fruits: 8.0,
  Vegetables: 6.5,
  Meat: 35.0,
  Dairy: 12.0,
  Bakery: 9.0,
  Grains: 7.0,
  Other: 0,
};

const getCategoryPriceTable = (currency) =>
  String(currency || "EUR").toUpperCase() === "RON"
    ? CATEGORY_AVERAGE_PRICE_RON
    : CATEGORY_AVERAGE_PRICE_EUR;

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const sanitizeText = (value) => String(value || "").replace(/[<>]/g, "").trim();

const parseCategory = (category) => {
  if (category && typeof category === "object") {
    return sanitizeText(category.name || category.id || "Other") || "Other";
  }
  return sanitizeText(category || "Other") || "Other";
};

const hasPriceInput = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
};

const normalizeUnit = (value) => {
  const unit = String(value || "").trim().toLowerCase();
  if (!unit) return "pcs";
  if (unit === "gr") return "g";
  return unit;
};

const parseNumericPrice = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return roundMoney(parsed);
};

export const getCategoryAveragePrice = (category, currency = "EUR") => {
  const key = parseCategory(category);
  const table = getCategoryPriceTable(currency);
  const avg = table[key];
  if (!Number.isFinite(avg) || avg < 0) return 0;
  return roundMoney(avg);
};

export const normalizeProductForStorage = (product = {}, existingProduct = null, currency = "EUR") => {
  const category = parseCategory(product.category || existingProduct?.category);
  const quantity = Number(product.quantity);
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Number(quantity.toFixed(2)) : 1;

  const userProvidedPrice = hasPriceInput(product.price) ? parseNumericPrice(product.price) : null;

  let price;
  let isPriceEstimated;

  if (Number.isFinite(userProvidedPrice) && userProvidedPrice >= 0) {
    price = userProvidedPrice;
    isPriceEstimated = false;
  } else if (hasPriceInput(product.price)) {
    price = getCategoryAveragePrice(category, currency);
    isPriceEstimated = true;
  } else if (existingProduct && Number.isFinite(Number(existingProduct.price))) {
    price = roundMoney(existingProduct.price);
    isPriceEstimated = Boolean(existingProduct.isPriceEstimated);
  } else {
    price = getCategoryAveragePrice(category, currency);
    isPriceEstimated = true;
  }

  const existingInitialQty = Number(existingProduct?.initialQuantity);
  const initialQuantity =
    Number.isFinite(existingInitialQty) && existingInitialQty > 0
      ? existingInitialQty
      : safeQuantity;

  const existingInitialInvestment = Number(existingProduct?.initialInvestment);
  const initialInvestment =
    Number.isFinite(existingInitialInvestment) && existingInitialInvestment >= 0
      ? existingInitialInvestment
      : price;

  const unitPrice =
    initialQuantity > 0 ? Number((initialInvestment / initialQuantity).toFixed(4)) : 0;

  const safeFraction = initialQuantity > 0 ? Math.min(safeQuantity / initialQuantity, 1) : 1;
  const investedValueLeft = Number((safeFraction * initialInvestment).toFixed(2));

  return {
    ...product,
    name: sanitizeText(product.name || existingProduct?.name || ""),
    category,
    quantity: safeQuantity,
    unit: normalizeUnit(product.unit || existingProduct?.unit || "pcs"),
    expiry: product.expiry || existingProduct?.expiry || "",
    price,
    isPriceEstimated,
    estimatedPrice: isPriceEstimated ? price : null,
    initialQuantity,
    initialInvestment,
    unitPrice,
    investedValueLeft,
  };
};
