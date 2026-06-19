const roundTo = (value, digits) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const convertUnit = (value, unit) => {
  const quantity = Number(value);
  const normalizedUnit = String(unit || "").trim().toLowerCase();

  if (!Number.isFinite(quantity) || quantity < 0) {
    return null;
  }

  if (normalizedUnit === "gr" || normalizedUnit === "g") {
    if (quantity >= 1000) {
      return { value: roundTo(quantity / 1000, 2), unit: "kg", label: `${roundTo(quantity / 1000, 2)} kg` };
    }
    return { value: roundTo(quantity, 2), unit: "g", label: `${roundTo(quantity, 2)} g` };
  }

  if (normalizedUnit === "kg") {
    if (quantity < 1) {
      return { value: roundTo(quantity * 1000, 0), unit: "g", label: `${roundTo(quantity * 1000, 0)} g` };
    }
    return { value: roundTo(quantity, 2), unit: "kg", label: `${roundTo(quantity, 2)} kg` };
  }

  return null;
};
