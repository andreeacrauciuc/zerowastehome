import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { useCurrency } from "../../../hooks/useCurrency";
import { useImpactMotion } from "../hooks/useImpactMotion";
import moneySavedImg from "../../../assets/money-saved.png";
import moneyWastedImg from "../../../assets/money-wasted.png";
import periodResultImg from "../../../assets/period-result.png";
import CountUp from "./CountUp";

const MotionArticle = motion.article;


const ImpactStatsSection = ({ analytics }) => {
  const { currencyConfig } = useCurrency();
  const { cardMotion } = useImpactMotion();

  const netBalance = analytics.moneySaved - analytics.moneyLost;
  const isPositive = netBalance >= 0;

  const efficiencyRate = Math.round(analytics.healthScore ?? 0);

  return (
    <section className="stats-row">
      <MotionArticle
        className="glass-card stat-tile stat-tile--saved"
        initial="rest"
        whileHover="hover"
        variants={cardMotion}
      >
        <div className="stat-tile-header">
          <img src={moneySavedImg} alt="Saved" className="stat-tile-icon-img" />
          <span className="tile-period-label">this period</span>
        </div>
        <p className="tile-label">
          Money <span className="impact-word impact-word--saved">saved</span>
        </p>
        <h3 className="tile-value">
          <CountUp
            value={analytics.moneySaved}
            formatter={(num) => formatCurrency(num, currencyConfig)}
          />
        </h3>
        <div className="tile-subrow">
          <ArrowUp size={12} className="tile-sub-icon tile-sub-icon--up" />
          <small>
            <CountUp value={analytics.periodFoodSavedKg ?? analytics.totalFoodSavedKg} formatter={(num) => `${num.toFixed(1)} kg`} /> kept from the bin
          </small>
        </div>
      </MotionArticle>

      <MotionArticle
        className="glass-card stat-tile stat-tile--lost"
        initial="rest"
        whileHover="hover"
        variants={cardMotion}
      >
        <div className="stat-tile-header">
          <img src={moneyWastedImg} alt="Wasted" className="stat-tile-icon-img" />
          <span className="tile-period-label">this period</span>
        </div>
        <p className="tile-label">
          Money <span className="impact-word impact-word--wasted">wasted</span>
        </p>
        <h3 className="tile-value">
          <CountUp
            value={analytics.moneyLost}
            formatter={(num) => formatCurrency(num, currencyConfig)}
          />
        </h3>
        <div className="tile-subrow">
          <ArrowDown size={12} className="tile-sub-icon tile-sub-icon--down" />
          <small>Food lost before it could be used</small>
        </div>
      </MotionArticle>

      <MotionArticle
        className={`glass-card stat-tile stat-tile--net ${isPositive ? "stat-tile--net-pos" : "stat-tile--net-neg"}`}
        initial="rest"
        whileHover="hover"
        variants={cardMotion}
      >
        <div className="stat-tile-header">
          <img src={periodResultImg} alt="Period" className="stat-tile-icon-img" />
          <span className="tile-period-label">net balance</span>
        </div>
        <p className="tile-label">Period result</p>
        <h3 className={`tile-value ${isPositive ? "impact-value--saved" : "impact-value--wasted"}`}>
          {isPositive ? "+" : ""}
          <CountUp
            value={Math.abs(netBalance)}
            formatter={(num) => formatCurrency(num, currencyConfig)}
          />
        </h3>
        <div className="tile-subrow">
          <RefreshCw size={12} className="tile-sub-icon" />
          <small>
            {efficiencyRate}% efficiency
            {analytics.procurementEfficiencyCount > 0 && (
              <> · {analytics.procurementEfficiencyCount} pantry swap{analytics.procurementEfficiencyCount !== 1 ? "s" : ""}</>
            )}
          </small>
        </div>
      </MotionArticle>
    </section>
  );
};

ImpactStatsSection.propTypes = {
  analytics: PropTypes.shape({
    moneySaved: PropTypes.number.isRequired,
    moneyLost: PropTypes.number.isRequired,
    totalFoodSavedKg: PropTypes.number.isRequired,
    periodFoodSavedKg: PropTypes.number,
    eatenCount: PropTypes.number,
    wastedCount: PropTypes.number,
    procurementEfficiencyCount: PropTypes.number.isRequired,
    swapSavingsToday: PropTypes.number.isRequired,
  }).isRequired,
};

export default ImpactStatsSection;
