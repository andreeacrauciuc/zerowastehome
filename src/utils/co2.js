import { KM_PER_CO2_KG } from "../constants/co2";

export const FOOD_ITEM_CO2_KG = 2.5;

export const calculateCo2AvoidedKg = (savedItemCount = 0, factor = FOOD_ITEM_CO2_KG) => {
  const count = Number(savedItemCount);
  const perItem = Number(factor);
  if (!Number.isFinite(count) || count <= 0) return 0;
  if (!Number.isFinite(perItem) || perItem <= 0) return 0;
  return Number((count * perItem).toFixed(1));
};

export const estimateDrivingKmEquivalent = (co2Kg = 0, multiplier = KM_PER_CO2_KG) => {
  const value = Number(co2Kg);
  const m = Number(multiplier);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(m) || m <= 0) return 0;
  return Math.round(value * m);
};
