import { useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { useCurrency } from "../../../hooks/useCurrency";
import { useImpactMotion } from "../hooks/useImpactMotion";

const MotionSection = motion.section;

function TooltipInfo({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", marginLeft: 6 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        style={{
          overflow: "visible",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "rgba(79, 159, 130, 0.14)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          cursor: "default",
          userSelect: "none",
          fontWeight: 600,
          color: "#21483f",
        }}
        aria-label={text}
        role="img"
      >
        ?
      </span>
      {visible && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(16,35,31,0.92)",
            color: "#f7f4ee",
            fontSize: 12,
            padding: "8px 12px",
            borderRadius: 8,
            whiteSpace: "normal",
            zIndex: 100,
            pointerEvents: "none",
            maxWidth: 260,
            lineHeight: 1.4,
            textAlign: "center",
            boxShadow: "0 12px 24px rgba(0,0,0,0.18)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

TooltipInfo.propTypes = {
  text: PropTypes.string.isRequired,
};

const ImpactChartsSection = ({ analytics }) => {
  const { currencyConfig } = useCurrency();
  const { cardMotion } = useImpactMotion();
  const trendData = Array.isArray(analytics.trendData) ? analytics.trendData : [];
  const hasTrendData = trendData.length > 0;

  return (
    <MotionSection className="glass-card trend-card" initial="rest" whileHover="hover" variants={cardMotion}>
      <div className="section-head">
        <h3>
          <span className="impact-word impact-word--saved">Saved</span> vs <span className="impact-word impact-word--wasted">wasted</span>
          <TooltipInfo text="Money you saved by eating food in time (green) versus money lost to waste (orange), tracked over the selected period." />
        </h3>
        <p>See what you saved in green and what you wasted in orange over time</p>
      </div>
      <div className="chart-legend" aria-hidden="true">
        <span className="legend-pill legend-pill--saved">Saved</span>
        <span className="legend-pill legend-pill--wasted">Wasted</span>
      </div>
      <div className="trend-chart-wrap">
        {!hasTrendData ? (
          <div className="trend-empty-state" role="status" aria-live="polite">
            <span className="trend-empty-icon" aria-hidden="true">
              <LineChartIcon size={28} strokeWidth={2} />
            </span>
            <p className="trend-empty-title">No data available</p>
            <p className="trend-empty-desc">
              There isn&apos;t enough data for the selected period yet.
            </p>
          </div>
        ) : (
        <ResponsiveContainer width="99%" height="100%" minHeight={300} debounce={50}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f9f82" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#4f9f82" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="wasteGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c88f65" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#c88f65" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(16, 35, 31, 0.12)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={22} />
            <YAxis tickLine={false} axisLine={false} width={46} />
            <Tooltip
              formatter={(value, key) => [formatCurrency(Number(value) || 0, currencyConfig), key === "consumption" ? "Saved" : "Wasted"]}
              contentStyle={{
                borderRadius: 14,
                border: "1px solid rgba(85, 123, 113, 0.18)",
                background: "rgba(249, 245, 238, 0.96)",
                color: "#10231f",
              }}
            />
            <Area type="monotone" dataKey="consumption" stroke="#4f9f82" strokeWidth={2.4} fill="url(#consumptionGradient)" />
            <Area type="monotone" dataKey="waste" stroke="#8b4f33" strokeWidth={2.3} fill="url(#wasteGradient)" />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </MotionSection>
  );
};

ImpactChartsSection.propTypes = {
  analytics: PropTypes.shape({
    trendData: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string,
        label: PropTypes.string,
        consumption: PropTypes.number,
        waste: PropTypes.number,
      })
    ).isRequired,
  }).isRequired,
};

export default ImpactChartsSection;
