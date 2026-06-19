import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../utils/formatters";
import { useCurrency } from "../../../hooks/useCurrency";
import { useImpactMotion } from "../hooks/useImpactMotion";
import { ArrowRight } from "lucide-react";
import moneyRiskImg from "../../../assets/money-risk.png";
import healthScoreImg from "../../../assets/health-score.png";
import CountUp from "./CountUp";

const MotionArticle = motion.article;
const MotionDiv = motion.div;

const SCORE_THRESHOLDS = [
  {
    min: 80,
    color: "#006241",
    textColor: "#006241",
    trackColor: "rgba(0,98,65,0.15)",
    badge: "Eco-warrior",
  },
  {
    min: 50,
    color: "#E49B0F",
    textColor: "#8A5A00",
    trackColor: "rgba(228,155,15,0.15)",
    badge: "Smart planner",
  },
  {
    min: 0,
    color: "#880808",
    textColor: "#880808",
    trackColor: "rgba(136,8,8,0.15)",
    badge: "Room to improve",
  },
];

const getScoreTheme = (score) =>
  SCORE_THRESHOLDS.find((t) => score >= t.min) || SCORE_THRESHOLDS[2];

const NEUTRAL_THEME = {
  color: "var(--slate-soft)",
  textColor: "var(--slate-soft)",
  trackColor: "rgba(15, 23, 42, 0.08)",
  badge: "No data yet",
};

const ImpactHeroSection = ({ analytics, handleRecoveryAction }) => {
  const { currencyConfig } = useCurrency();
  const { cardMotion } = useImpactMotion();
  const hasScoreData = analytics.hasScoreData !== false;
  const theme = hasScoreData
    ? getScoreTheme(analytics.healthScore)
    : NEUTRAL_THEME;

  const scoreData = [
    { value: hasScoreData ? analytics.healthScore : 0, fill: theme.color },
  ];

  return (
    <section className="hero-grid">
      <MotionArticle
        className="glass-card health-score-card"
        initial="rest"
        whileHover="hover"
        variants={cardMotion}
      >
        <div
          className="health-score-top"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img
              src={healthScoreImg}
              alt="Health"
              style={{ width: "54px", height: "54px" }}
            />
            <p className="eyebrow" style={{ margin: 0 }}>
              Kitchen health score
            </p>
          </div>
          <div
            className="health-score-badge"
            style={{ "--score-color": theme.textColor }}
          >
            <span>{theme.badge}</span>
          </div>
        </div>

        <div
          className="radial-wrap"
          style={{ "--track-color": theme.trackColor }}
        >
          <div className="radial-track" aria-hidden="true" />
          <ResponsiveContainer width="99%" height="100%" minHeight={170} debounce={50}>
            <RadialBarChart
              data={scoreData}
              innerRadius="68%"
              outerRadius="96%"
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="value"
                fill={theme.color}
                cornerRadius={20}
                background={{ fill: theme.trackColor }}
              />
              {hasScoreData ? (
                <>
                  <text
                    x="50%"
                    y="46%"
                    textAnchor="middle"
                    className="radial-center-text"
                    fill={theme.textColor}
                  >
                    {analytics.healthScore.toFixed(0)}
                  </text>
                  <text
                    x="50%"
                    y="58%"
                    textAnchor="middle"
                    className="radial-center-pct"
                    fill="rgba(15,23,42,0.5)"
                  >
                    out of 100
                  </text>
                </>
              ) : (
                <text
                  x="50%"
                  y="52%"
                  textAnchor="middle"
                  className="radial-center-pct"
                  fill="var(--slate-soft)"
                >
                  No data yet
                </text>
              )}
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        <div className="health-score-footer">
          <MotionDiv className="health-score-metrics">
            <div className="hsm-item">
              <span className="hsm-value hsm-value--saved">
                <CountUp
                  value={analytics.eatenCount ?? 0}
                  formatter={(n) => String(Math.round(n))}
                />
              </span>
              <span className="hsm-label">items saved</span>
            </div>
            <div className="hsm-divider" aria-hidden="true" />
            <div className="hsm-item">
              <span className="hsm-value hsm-value--wasted">
                <CountUp
                  value={analytics.wastedCount ?? 0}
                  formatter={(n) => String(Math.round(n))}
                />
              </span>
              <span className="hsm-label">items wasted</span>
            </div>
          </MotionDiv>
        </div>
      </MotionArticle>

      <MotionArticle
        className="glass-card risk-card"
        initial="rest"
        whileHover="hover"
        variants={cardMotion}
      >
        <div className="risk-head">
          <img
            src={moneyRiskImg}
            alt="Money at risk"
            style={{
              width: "45px",
              height: "45px",
              objectFit: "contain",
              marginRight: "8px",
            }}
          />
          <p>Money at risk</p>
        </div>

        <h2 className="risk-amount">
          <CountUp
            value={analytics.moneyAtRisk}
            formatter={(num) => formatCurrency(num, currencyConfig)}
          />
        </h2>

        <p className="risk-description">
          {analytics.expiringRiskItems.length > 0
            ? `${analytics.expiringRiskItems.length} item${analytics.expiringRiskItems.length > 1 ? "s" : ""} expiring within 48 hours. Act now to recover this value!`
            : "No urgent risk in the next 48 hours. Great planning!"}
        </p>

        <button
          type="button"
          className="recovery-action-btn"
          onClick={handleRecoveryAction}
          disabled={analytics.expiringRiskItems.length === 0}
        >
          Recovery action
          <ArrowRight size={16} />
        </button>

        <div className="eco-caption">
          <span>
            {analytics.co2Saved.toFixed(1)} kg CO₂ prevented ·{" "}
            {analytics.treesPlanted.toFixed(1)} tree equivalent
          </span>
        </div>
      </MotionArticle>
    </section>
  );
};

ImpactHeroSection.propTypes = {
  analytics: PropTypes.shape({
    healthScore: PropTypes.number.isRequired,
    hasScoreData: PropTypes.bool,
    scoreLabel: PropTypes.string.isRequired,
    eatenCount: PropTypes.number,
    wastedCount: PropTypes.number,
    moneyAtRisk: PropTypes.number.isRequired,
    expiringRiskItems: PropTypes.arrayOf(PropTypes.object).isRequired,
    co2Saved: PropTypes.number.isRequired,
    treesPlanted: PropTypes.number.isRequired,
    kmEquivalent: PropTypes.number.isRequired,
  }).isRequired,
  handleRecoveryAction: PropTypes.func.isRequired,
};

export default ImpactHeroSection;
