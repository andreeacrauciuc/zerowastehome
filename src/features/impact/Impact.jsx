import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "../../hooks/useDataStore";
import { useAuth } from "../auth/context/AuthContext";
import { useHousehold } from "../household/HouseholdContext";
import { useCurrency } from "../../hooks/useCurrency";
import { parseDate, parseMoney } from "./utils/parsers";
import { SAVED_STATUSES, WASTED_STATUSES, DATE_FILTERS } from "./utils/constants";
import { useImpactMotion } from "./hooks/useImpactMotion";
import { useSwapSavings } from "./hooks/useSwapSavings";
import { useImpactAnalytics } from "./hooks/useImpactAnalytics";
import ImpactBanner from "./components/ImpactBanner";
import ImpactEmptyState from "./components/ImpactEmptyState";
import ImpactHeroSection from "./components/ImpactHeroSection";
import ImpactStatsSection from "./components/ImpactStatsSection";
import ImpactChartsSection from "./components/ImpactChartsSection";
import ImpactInsightsSection from "./components/ImpactInsightsSection";
import ImpactBadgesSection from "./components/ImpactBadgesSection";
import ImpactTimeline from "./components/ImpactTimeline";
import "../../styles/features/impact/Impact.scss";

const MotionDiv = motion.div;

const Impact = () => {
  const { impactHistory, inventoryItems } = useDataStore();
  const { currentUser } = useAuth();
  const { household } = useHousehold();
  const { currencyConfig } = useCurrency();
  const { pageMotion, reduced } = useImpactMotion();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState("month");
  const [savingsMode, setSavingsMode] = useState("all");

  const history = useMemo(() => impactHistory || [], [impactHistory]);
  const inventory = useMemo(() => inventoryItems || [], [inventoryItems]);
  const hasHistory = history.length > 0;

  const swapSavingsToday = useSwapSavings({ currentUser, household });

  const safeTotalFoodSaved = useMemo(
    () =>
      history.reduce((acc, entry) => {
        const status = String(entry?.status || "").toLowerCase();
        if (!["eaten", "saved", "consumed", "cooked"].includes(status)) return acc;
        const qty = Number(entry?.quantity || entry?.initialQuantity || 0);
        const unit = String(entry?.unit || "").toLowerCase();
        let kg = 0;
        if (unit === "kg" || unit === "l") kg = qty;
        else if (unit === "g" || unit === "ml") kg = qty / 1000;
        else kg = qty * 0.3;
        return acc + kg;
      }, 0),
    [history],
  );

  const safeLifetimeSavings = useMemo(
    () =>
      history.reduce((acc, entry) => {
        const status = String(entry?.status || "").toLowerCase();
        if (!["eaten", "saved", "consumed", "cooked"].includes(status)) return acc;
        const consumedValue = Number(entry?.consumedValue);
        if (Number.isFinite(consumedValue) && consumedValue > 0) return acc + consumedValue;
        const price = Number(entry?.price);
        if (Number.isFinite(price) && price > 0) return acc + price;
        const investment = Number(entry?.initialInvestment);
        if (Number.isFinite(investment) && investment > 0) return acc + investment;
        return acc;
      }, 0),
    [history],
  );

  const filteredHistory = useMemo(() => {
    const selected = DATE_FILTERS.find((f) => f.value === dateFilter);
    if (!selected || !selected.days) return history;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(now.getDate() - (selected.days - 1));
    start.setHours(0, 0, 0, 0);

    return history.filter((entry) => {
      const when = parseDate(entry?.actionDate || entry?.updatedAt || entry?.createdAt);
      return when && when >= start && when <= now;
    });
  }, [history, dateFilter]);

  const analytics = useImpactAnalytics({
    filteredHistory,
    impactHistory,
    inventory,
    dateFilter,
    swapSavingsToday,
    savingsMode,
    safeLifetimeSavings,
    safeTotalFoodSaved,
    currencyConfig,
  });

  const timelineEvents = useMemo(() => {
    const safeHistory = Array.isArray(filteredHistory) ? filteredHistory : [];
    return safeHistory
      .map((entry, index) => {
        const status = String(entry?.status || "").toLowerCase();
        const type = SAVED_STATUSES.has(status)
          ? "saved"
          : WASTED_STATUSES.has(status)
            ? "wasted"
            : "other";
        const when = parseDate(entry?.actionDate || entry?.updatedAt || entry?.createdAt);
        return {
          id:
            entry?.id ||
            `${entry?.name || "item"}-${entry?.actionDate || entry?.createdAt || index}`,
          name: String(entry?.name || "Food item"),
          rawStatus: status || "logged",
          type,
          value: parseMoney(entry),
          when,
        };
      })
      .filter((event) => event.type !== "other")
      .sort((a, b) => (b.when?.getTime() || 0) - (a.when?.getTime() || 0));
  }, [filteredHistory]);

  const handleRecoveryAction = () => {
    const selectedIds = analytics.expiringRiskItems.map((item) => item?.id).filter(Boolean);
    if (selectedIds.length === 0) return;
    navigate("/recipes", { state: { preselectedItemIds: selectedIds, source: "impact-recovery" } });
  };

  return (
    <div className="impact-hub-shell">
      <ImpactBanner
        analytics={analytics}
        hasHistory={hasHistory}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        savingsMode={savingsMode}
        onSavingsModeChange={setSavingsMode}
      />

      <AnimatePresence mode="wait">
        <MotionDiv
          key={`${dateFilter}-${savingsMode}`}
          className="impact-hub-grid"
          initial="hidden"
          animate="visible"
          variants={pageMotion}
          exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
        >
          {hasHistory ? (
            <>
              <ImpactHeroSection
                analytics={analytics}
                handleRecoveryAction={handleRecoveryAction}
              />
              <ImpactStatsSection analytics={analytics} />
              <ImpactChartsSection analytics={analytics} />
              <ImpactBadgesSection badges={analytics.earnedBadges} />
              <ImpactInsightsSection analytics={analytics} />
              <ImpactTimeline events={timelineEvents} />
            </>
          ) : (
            <ImpactEmptyState onNavigate={() => navigate("/home")} />
          )}
        </MotionDiv>
      </AnimatePresence>
    </div>
  );
};

export default Impact;
