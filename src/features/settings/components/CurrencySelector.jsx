import PropTypes from "prop-types";
import "./CurrencySelector.scss";

function CurrencySelector({ currency, onCurrencyChange, disabled }) {
  return (
    <div className="currency-selector-wrapper">
      <label className="currency-selector-label">
        Preferred currency
      </label>
      <select
        className="currency-selector-select"
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        disabled={disabled}
      >
        <option value="EUR">EUR</option>
        <option value="RON">RON</option>
      </select>
    </div>
  );
}

CurrencySelector.propTypes = {
  currency: PropTypes.oneOf(["EUR", "RON"]).isRequired,
  onCurrencyChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

CurrencySelector.defaultProps = {
  disabled: false,
};

export default CurrencySelector;
