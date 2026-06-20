import { convertUnit } from "../../../utils/formatters";

export const toLocalDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();

  const parts = raw.split("-").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    const [year, month, day] = parts;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
};

export const getExpiryInfo = (expiry) => {
  if (!expiry) {
    return { label: "N/A", daysLeft: null, status: "na" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = toLocalDate(expiry);
  if (!exp) {
    return { label: "N/A", daysLeft: null, status: "na" };
  }
  exp.setHours(0, 0, 0, 0);

  const diffMs = exp - today;
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: "Expired", daysLeft, status: "expired" };
  if (daysLeft === 0) return { label: "Today", daysLeft, status: "today" };
  if (daysLeft <= 3) return { label: `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`, daysLeft, status: "soon" };

  return { label: `${daysLeft} days left`, daysLeft, status: "ok" };
};

export const getCategoryName = (item) => {
  if (typeof item?.category === "object" && item?.category !== null) {
    return item.category.name || item.category.id || "Other";
  }
  return item?.category || item?.categoryName || "Other";
};

export const getConvertedWeightLabel = (item) => {
  const converted = convertUnit(item?.quantity, item?.unit);
  if (!converted) return null;

  const sourceUnit = String(item?.unit || "").toLowerCase();
  const sourceQty = Number(item?.quantity);

  if (!Number.isFinite(sourceQty)) return null;

  if ((sourceUnit === "gr" || sourceUnit === "g") && sourceQty >= 1000) {
    return `~ ${converted.label}`;
  }

  if (sourceUnit === "kg" && sourceQty < 1) {
    return `~ ${converted.label}`;
  }

  return null;
};

export const getAddedTimestamp = (item) => {
  const raw = item?.createdAt || item?.addedAt;
  const parsed = raw ? new Date(raw).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};
