import PropTypes from "prop-types";

const ImpactEmptyState = ({ onNavigate }) => (
  <div
    style={{
      background: "rgba(34, 197, 94, 0.06)",
      border: "1px solid rgba(34, 197, 94, 0.18)",
      borderRadius: "16px",
      padding: "1.25rem 1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      marginBottom: "1.5rem",
      flexWrap: "wrap",
    }}
  >
    <div style={{ flex: 1, minWidth: 200 }}>
      <p
        style={{
          fontWeight: 600,
          fontSize: "0.95rem",
          marginBottom: "0.25rem",
        }}
      >
        Your impact journey starts here
      </p>
      <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: 0 }}>
        Mark items as eaten or wasted in your Inventory to start tracking your
        food waste impact.
      </p>
    </div>
    <button
      type="button"
      onClick={onNavigate}
      style={{
        background: "linear-gradient(135deg, #166534, #14532d)",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "0.6rem 1.2rem",
        fontWeight: 600,
        fontSize: "0.875rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 12px rgba(22, 101, 52, 0.3)",
      }}
    >
      Go to Inventory →
    </button>
  </div>
);

ImpactEmptyState.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};

export default ImpactEmptyState;
