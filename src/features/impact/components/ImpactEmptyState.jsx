import PropTypes from "prop-types";
import "./ImpactEmptyState.scss";

const ImpactEmptyState = ({ onNavigate }) => (
  <div className="impact-empty-state">
    <div className="impact-empty-state-text">
      <p className="impact-empty-state-title">Your impact journey starts here</p>
      <p className="impact-empty-state-desc">
        Mark items as eaten or wasted in your Inventory to start tracking your
        food waste impact.
      </p>
    </div>
    <button type="button" className="impact-empty-state-cta" onClick={onNavigate}>
      Go to Inventory →
    </button>
  </div>
);

ImpactEmptyState.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};

export default ImpactEmptyState;
