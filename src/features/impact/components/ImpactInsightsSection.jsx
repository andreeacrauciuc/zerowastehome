import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { useCurrency } from "../../../hooks/useCurrency";
import { useImpactMotion } from "../hooks/useImpactMotion";
import smartTipsImg from "../../../assets/smart-tips.png";
import topCategoriesImg from "../../../assets/top-categories.png";

const MotionSection = motion.section;

const ImpactInsightsSection = ({ analytics }) => {
  const { currencyConfig } = useCurrency();
  const { cardMotion } = useImpactMotion();

  return (
    <>
      <section className="insights-grid">
        <MotionSection
          className="glass-card smart-tips-card"
          initial="rest"
          whileHover="hover"
          variants={cardMotion}
        >
          <div className="section-head section-head--compact">
            <img src={smartTipsImg} alt="Smart Tips" style={{ width: "35px", height: "35px", objectFit: "contain", marginRight: "12px" }} />
            <div>
              <h3>Smart tips</h3>
              <p>Personalised suggestions for this period</p>
            </div>
          </div>
          <ul className="tips-list">
            {analytics.smartTips.map((tip, index) => (
              <li key={`tip-${index}`} className="tips-list-item">
                <span className="tips-dot" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </MotionSection>

        <MotionSection
          className="glass-card category-card"
          initial="rest"
          whileHover="hover"
          variants={cardMotion}
        >
          <div className="section-head section-head--compact">
            <img src={topCategoriesImg} alt="Top Categories" style={{ width: "35px", height: "35px", objectFit: "contain", marginRight: "12px" }} />
            <div>
              <h3>
                Top <span className="impact-word impact-word--wasted">wasted</span> categories
              </h3>
              <p>Where your food budget slipped away</p>
            </div>
          </div>

          {analytics.topLossCategories.length > 0 ? (
            <ul className="category-loss-list">
              {analytics.topLossCategories.map((item, index) => (
                <li key={item.category} className="category-loss-item">
                  <span className="category-loss-rank">#{index + 1}</span>
                  <span className="category-loss-name">{item.category}</span>
                  <span className="category-loss-value impact-value--wasted">
                    -{formatCurrency(item.value, currencyConfig)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">No wasted categories yet. Keep it up!</p>
          )}
        </MotionSection>
      </section>

      {!analytics.hasData && (
        <section className="glass-card empty-state-card">
          <div className="empty-state-icon">
            <Leaf size={22} />
          </div>
          <div>
            <h4>Start your journey</h4>
            <p>Add inventory and mark food as saved or wasted to unlock your Impact Hub</p>
          </div>
        </section>
      )}
    </>
  );
};

ImpactInsightsSection.propTypes = {
  analytics: PropTypes.shape({
    hasData: PropTypes.bool.isRequired,
    smartTips: PropTypes.arrayOf(PropTypes.string).isRequired,
    topLossCategories: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
      }),
    ).isRequired,
  }).isRequired,
};

export default ImpactInsightsSection;
