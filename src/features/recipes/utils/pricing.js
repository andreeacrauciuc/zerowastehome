export const computeInvestedValueLeft = (item) => {
  const investedValueLeft = Number(item?.investedValueLeft);
  if (Number.isFinite(investedValueLeft) && investedValueLeft >= 0) {
    return investedValueLeft;
  }

  const currentQty = Number(item?.quantity);
  const safeCurrentQty = Number.isFinite(currentQty) && currentQty >= 0 ? currentQty : 0;

  const unitPrice = Number(item?.unitPrice);
  if (Number.isFinite(unitPrice) && unitPrice > 0 && safeCurrentQty > 0) {
    return Number((safeCurrentQty * unitPrice).toFixed(2));
  }


  const initialQty = Number(item?.initialQuantity);
  const purchasePrice = Number(item?.price);

  if (
    Number.isFinite(initialQty) &&
    initialQty > 0 &&
    Number.isFinite(purchasePrice) &&
    purchasePrice >= 0 &&
    safeCurrentQty >= 0
  ) {
    const ratio = safeCurrentQty / initialQty;
    const safeFraction = Math.min(ratio, 1);
    return Number((safeFraction * purchasePrice).toFixed(2));
  }

  if (Number.isFinite(purchasePrice) && purchasePrice > 0) {
    return purchasePrice;
  }

  const estimatedPrice = Number(item?.estimatedPrice);
  if (Number.isFinite(estimatedPrice) && estimatedPrice > 0) {
    return estimatedPrice;
  }

  return 0;
};

export const calculateSavings = (items = []) => {
  try {
    const safeItems = Array.isArray(items) ? items : [];

    const total = safeItems.reduce((sum, item) => {
      try {
        return sum + computeInvestedValueLeft(item);
      } catch {
        return sum;
      }
    }, 0);

    if (!Number.isFinite(total) || total <= 0) {
      return 0;
    }

    return Number(total.toFixed(2));
  } catch {
    return 0;
  }
};
export const getEffectivePrice = computeInvestedValueLeft;