import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { formatCurrency } from "../utils/formatters";
import { useCurrency } from "../../../hooks/useCurrency";
import { DATE_FILTERS, SAVINGS_MODES } from "../utils/constants";
import { useImpactMotion } from "../hooks/useImpactMotion";
import CountUp from "./CountUp";

const MotionSection = motion.section;

const ImpactBanner = ({
  analytics,
  hasHistory,
  dateFilter,
  onDateFilterChange,
  savingsMode,
  onSavingsModeChange,
}) => {
  const { currencyConfig } = useCurrency();
  const { pageMotion } = useImpactMotion();

  return (
    <MotionSection
      className="impact-hero-banner"
      initial="hidden"
      animate="visible"
      variants={pageMotion}
    >
      <div className="impact-hero-glowbg" aria-hidden="true" />
      <div className="impact-hero-content">
        <p className="impact-hero-eyebrow">Your food waste impact</p>
        <h1 className="impact-hero-headline">
          {hasHistory ? (
            <CountUp
              value={analytics.lifetimeSavings}
              formatter={(num) => formatCurrency(num, currencyConfig)}
            />
          ) : (
            <span style={{ color: "var(--slate-soft)" }}>—</span>
          )}
        </h1>
        {hasHistory ? (
          <p className="impact-hero-headline-caption">
            Saved since you started using ZeroWasteHome
          </p>
        ) : null}

        <div className="impact-hero-substats">
          <div className="impact-hero-substat">
            <span className="impact-hero-substat-value">
              {hasHistory ? (
                <CountUp
                  value={analytics.totalFoodSavedKg}
                  formatter={(num) => `${num.toFixed(1)} kg`}
                />
              ) : (
                <span style={{ color: "var(--slate-soft)" }}>—</span>
              )}
            </span>
            <span className="impact-hero-substat-label">food saved</span>
          </div>
          <div className="impact-hero-substat">
            <span className="impact-hero-substat-value">
              {hasHistory ? (
                <CountUp
                  value={analytics.lifetimeCo2Saved}
                  formatter={(num) => `${num.toFixed(1)} kg`}
                />
              ) : (
                <span style={{ color: "var(--slate-soft)" }}>—</span>
              )}
            </span>
            <span className="impact-hero-substat-label">CO₂ prevented</span>
          </div>
          <div className="impact-hero-substat">
            <span className="impact-hero-substat-value">
              {hasHistory ? (
                <CountUp
                  value={analytics.treesPlanted}
                  formatter={(num) => `~${num.toFixed(1)}`}
                />
              ) : (
                <span style={{ color: "var(--slate-soft)" }}>—</span>
              )}
            </span>
            <span className="impact-hero-substat-label">
              trees equivalent
              <span
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  opacity: 0.55,
                  marginTop: 2,
                }}
              >
                {analytics.treesPlantedNote}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="impact-hero-filters">
        <div
          className="impact-filter-pills"
          role="tablist"
          aria-label="Time range"
        >
          {DATE_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={dateFilter === item.value}
              className={`filter-pill ${dateFilter === item.value ? "active" : ""}`}
              onClick={() => onDateFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          className="impact-filter-pills"
          role="tablist"
          aria-label="Savings mode"
        >
          {SAVINGS_MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={savingsMode === item.value}
              className={`filter-pill ${savingsMode === item.value ? "active" : ""}`}
              onClick={() => onSavingsModeChange(item.value)}
              title={item.tooltip}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </MotionSection>
  );
};

ImpactBanner.propTypes = {
  analytics: PropTypes.shape({
    lifetimeSavings: PropTypes.number.isRequired,
    totalFoodSavedKg: PropTypes.number.isRequired,
    lifetimeCo2Saved: PropTypes.number.isRequired,
    treesPlanted: PropTypes.number.isRequired,
    treesPlantedNote: PropTypes.string.isRequired,
  }).isRequired,
  hasHistory: PropTypes.bool.isRequired,
  dateFilter: PropTypes.string.isRequired,
  onDateFilterChange: PropTypes.func.isRequired,
  savingsMode: PropTypes.string.isRequired,
  onSavingsModeChange: PropTypes.func.isRequired,
};

export default ImpactBanner;
