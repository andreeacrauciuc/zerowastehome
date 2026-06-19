import { useMemo } from "react";
import {
  calculateCo2AvoidedKg,
  estimateDrivingKmEquivalent,
} from "../../../utils/co2";
import { formatCurrency } from "../utils/formatters";
import { deriveEarnedBadges } from "../utils/badges";
import {
  parseDate,
  parseMoney,
  parseCategoryName,
  parseQuantity,
  getSavedWeightKg,
  safeNumber,
  toDayKey,
  toMonthKey,
} from "../utils/parsers";
import {
  SAVED_STATUSES,
  WASTED_STATUSES,
  DATE_FILTERS,
  MONTH_LABEL,
} from "../utils/constants";
import { DAY_LABEL } from "../utils/formatters";

const MAX_TREND_MONTHS = 6;

const buildMonthlyTrendMap = (history) => {
  const trendMap = new Map();
  const entriesWithDates = history
    .map((entry) => ({
      entry,
      when: parseDate(entry?.actionDate || entry?.updatedAt || entry?.createdAt),
    }))
    .filter((row) => row.when)
    .sort((a, b) => a.when - b.when);

  if (entriesWithDates.length === 0) return trendMap;

  const last = new Date();
  const lastMonth = new Date(last.getFullYear(), last.getMonth(), 1);
  const earliestAllowed = new Date(lastMonth);
  earliestAllowed.setMonth(lastMonth.getMonth() - (MAX_TREND_MONTHS - 1));

  const first = new Date(entriesWithDates[0].when);
  const cursor = new Date(Math.max(
    new Date(first.getFullYear(), first.getMonth(), 1).getTime(),
    earliestAllowed.getTime(),
  ));

  let remaining = MAX_TREND_MONTHS;
  while (cursor <= lastMonth && remaining > 0) {
    const key = toMonthKey(cursor);
    trendMap.set(key, {
      key,
      label: MONTH_LABEL.format(cursor),
      consumption: 0,
      waste: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
    remaining -= 1;
  }
  return trendMap;
};

const buildDailyTrendMap = (days) => {
  const trendMap = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = toDayKey(date);
    trendMap.set(key, { key, label: DAY_LABEL.format(date), consumption: 0, waste: 0 });
  }
  return trendMap;
};

export const useImpactAnalytics = ({
  filteredHistory,
  impactHistory,
  inventory,
  dateFilter,
  swapSavingsToday,
  savingsMode,
  safeLifetimeSavings,
  safeTotalFoodSaved,
  currencyConfig,
}) => {
  return useMemo(() => {
    const safeHistory = Array.isArray(filteredHistory) ? filteredHistory : [];
    const safeInventory = Array.isArray(inventory) ? inventory : [];
    const now = new Date();

    let eatenCount = 0;
    let wastedCount = 0;
    let moneySaved = 0;
    let verifiedSavings = 0;
    let estimatedSavings = 0;
    let moneyLost = 0;
    let pantrySwapProfit = 0;
    let procurementEfficiencyCount = 0;
    let savedWeightKg = 0;

    const lossesByCategory = new Map();

    const trendMap =
      dateFilter === "total"
        ? buildMonthlyTrendMap(safeHistory)
        : buildDailyTrendMap(dateFilter === "week" ? 7 : 30);

    safeHistory.forEach((entry) => {
      const status = String(entry?.status || "").toLowerCase();
      const amount = safeNumber(parseMoney(entry));
      const isEstimatedPrice = Boolean(entry?.isPriceEstimated);
      const category = parseCategoryName(entry);
      const actionDate = parseDate(
        entry?.actionDate || entry?.updatedAt || entry?.createdAt,
      );

      if (SAVED_STATUSES.has(status)) {
        eatenCount += 1;
        moneySaved += amount;
        if (isEstimatedPrice) estimatedSavings += amount;
        else verifiedSavings += amount;
        savedWeightKg += getSavedWeightKg(entry);
      }

      if (WASTED_STATUSES.has(status)) {
        wastedCount += 1;
        moneyLost += amount;
        lossesByCategory.set(category, (lossesByCategory.get(category) || 0) + amount);
      }

      const isSwap =
        Boolean(entry?.isPantrySwap) ||
        Boolean(entry?.swapAccepted) ||
        String(entry?.sourceType || "").toLowerCase().includes("swap");
      if (isSwap) {
        procurementEfficiencyCount += 1;
        const explicitSwapValue = Number(entry?.swapSavedPrice);
        pantrySwapProfit +=
          Number.isFinite(explicitSwapValue) && explicitSwapValue > 0
            ? explicitSwapValue
            : amount;
      }

      if (!actionDate) return;
      const key =
        dateFilter === "total"
          ? toMonthKey(actionDate)
          : (() => {
              const d = new Date(actionDate);
              d.setHours(0, 0, 0, 0);
              return toDayKey(d);
            })();
      const bucket = trendMap.get(key);
      if (!bucket) return;
      if (SAVED_STATUSES.has(status)) bucket.consumption += amount;
      if (WASTED_STATUSES.has(status)) bucket.waste += amount;
    });

    const healthScore =
      eatenCount + wastedCount > 0
        ? (eatenCount / (eatenCount + wastedCount)) * 100
        : 0;

    const expiringRiskItems = safeInventory.filter((item) => {
      const expiry = parseDate(item?.expiryDate || item?.expiry);
      if (!expiry) return false;
      const hoursLeft = (expiry.getTime() - now.getTime()) / 3600000;
      return hoursLeft <= 48;
    });

    const moneyAtRisk = expiringRiskItems.reduce((sum, item) => {
      const quantity = parseQuantity(item);
      const unitPrice = Number(item?.unitPrice);
      const initialQuantity = Number(item?.initialQuantity);
      const unitPriceIsTrustworthy =
        Number.isFinite(unitPrice) &&
        unitPrice > 0 &&
        !(Number.isFinite(initialQuantity) && initialQuantity > 0 && initialQuantity < 0.1);
      const itemRisk = unitPriceIsTrustworthy ? unitPrice * quantity : parseMoney(item);
      return sum + itemRisk;
    }, 0);

    const trendData = Array.from(trendMap.values()).map((row) => ({
      ...row,
      consumption: Number(safeNumber(row.consumption).toFixed(2)),
      waste: Number(safeNumber(row.waste).toFixed(2)),
    }));

    const topLossCategories = Array.from(lossesByCategory.entries())
      .map(([category, value]) => ({ category, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const co2Saved = calculateCo2AvoidedKg(savedWeightKg);
    const periodFoodSavedKg = Number(savedWeightKg.toFixed(2));
    const treesPlanted = Number((co2Saved / 21).toFixed(1));
    const treesPlantedNote = "est. 21 kg CO₂/tree/year (UN FAO, 2020)";
    const kmEquivalent = estimateDrivingKmEquivalent(co2Saved);

    const scoreLabel =
      healthScore >= 80
        ? "Eco-warrior"
        : healthScore >= 50
          ? "Smart planner"
          : "Room to improve";

    const lifetimeSavingsValue = safeNumber(safeLifetimeSavings);
    const lifetimeCo2Saved = calculateCo2AvoidedKg(safeTotalFoodSaved);

    const allHistory = impactHistory || [];

    const allTimeEatenCount = allHistory.filter((entry) => {
      const s = String(entry?.status || "").toLowerCase();
      return s === "eaten" || s === "saved" || s === "consumed";
    }).length;

    const allTimeWastedCount = allHistory.filter((entry) => {
      const s = String(entry?.status || "").toLowerCase();
      return s === "wasted" || s === "thrown" || s === "discarded";
    }).length;

    const allTimeTotal = allTimeEatenCount + allTimeWastedCount;
    const allTimeHealthScore =
      allTimeTotal > 0 ? Math.round((allTimeEatenCount / allTimeTotal) * 100) : 0;

    const earnedBadges = deriveEarnedBadges(
      {
        co2Saved: lifetimeCo2Saved,
        procurementEfficiencyCount: allTimeEatenCount,
        healthScore: allTimeHealthScore,
        eatenCount: allTimeEatenCount,
        moneySaved: lifetimeSavingsValue,
      },
      (value) => formatCurrency(value, currencyConfig),
    );

    let balanceTip;
    if (moneySaved > moneyLost) {
      balanceTip =
        "Your kitchen is trending positive. Keep prioritizing near-expiry ingredients";
    } else if (moneyLost > 0 && moneyLost >= moneySaved) {
      balanceTip =
        "Waste is higher than savings right now. Focus on 2-3 quick recipes this week";
    } else {
      balanceTip = "Keep tracking your food to see your savings grow";
    }

    const smartTips =
      moneySaved === 0 && moneyLost === 0 && eatenCount === 0 && wastedCount === 0
        ? ["Welcome! Start adding items to your fridge to track your food waste impact"]
        : [
            pantrySwapProfit > 0
              ? `You saved ${formatCurrency(pantrySwapProfit, currencyConfig)} using pantry swaps in this period`
              : "Try pantry swaps in recipes to reduce shopping costs",
            moneyAtRisk > 0
              ? `${formatCurrency(moneyAtRisk, currencyConfig)} is at risk in your fridge. Cook these items first`
              : "No urgent risk detected in the next 48 hours. Great planning!",
            balanceTip,
            procurementEfficiencyCount > 0
              ? `${procurementEfficiencyCount} shopping items were avoided via pantry swaps`
              : "Efficiency can improve by swapping recipe ingredients from pantry stock",
          ];

    const displayedSavings =
      savingsMode === "verified"
        ? verifiedSavings
        : savingsMode === "estimated"
          ? estimatedSavings
          : moneySaved;

    return {
      hasData: safeHistory.length > 0 || safeInventory.length > 0,
      hasScoreData: eatenCount + wastedCount > 0,
      healthScore: Number(safeNumber(healthScore).toFixed(1)),
      eatenCount,
      wastedCount,
      moneySaved: Number(safeNumber(displayedSavings).toFixed(2)),
      lifetimeSavings: Number(safeNumber(safeLifetimeSavings).toFixed(2)),
      totalFoodSavedKg: Number(safeNumber(safeTotalFoodSaved).toFixed(2)),
      verifiedSavings: Number(safeNumber(verifiedSavings).toFixed(2)),
      estimatedSavings: Number(safeNumber(estimatedSavings).toFixed(2)),
      totalMoneySaved: Number(safeNumber(moneySaved).toFixed(2)),
      savingsMode,
      moneyLost: Number(safeNumber(moneyLost).toFixed(2)),
      pantrySwapProfit: Number(safeNumber(pantrySwapProfit).toFixed(2)),
      procurementEfficiencyCount,
      swapSavingsToday: Number(safeNumber(swapSavingsToday).toFixed(2)),
      moneyAtRisk: Number(safeNumber(moneyAtRisk).toFixed(2)),
      expiringRiskItems,
      scoreLabel,
      trendData,
      topLossCategories,
      co2Saved,
      periodFoodSavedKg,
      lifetimeCo2Saved,
      treesPlanted,
      treesPlantedNote,
      kmEquivalent,
      smartTips,
      earnedBadges,
    };
  }, [
    filteredHistory,
    impactHistory,
    inventory,
    dateFilter,
    swapSavingsToday,
    savingsMode,
    safeLifetimeSavings,
    safeTotalFoodSaved,
    currencyConfig,
  ]);
};
