import React from "react";

function CookConfirmModal({ pending, isCooking, onConfirm, onCancel }) {
  if (!pending) return null;

  return (
    <div
      style={{
        zIndex: 1000,
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,20,0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "rgba(255,255,255,0.96)",
          borderRadius: "16px",
          padding: "1.5rem",
          boxShadow: "0 16px 40px rgba(9,20,14,0.22)",
          border: "1px solid rgba(255,255,255,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h3>Confirm cooking</h3>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.1rem",
              color: "#285a48",
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            padding: "0 1.5rem 0.5rem",
            color: "var(--slate-soft)",
            fontSize: "0.9rem",
          }}
        >
          This will use {pending.summary} from your inventory.
        </p>

        {pending.warning && (
          <p
            style={{
              padding: "0 1.5rem 1rem",
              color: "#f59e0b",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.4rem",
            }}
          >
            <span>⚠</span>
            <span>{pending.warning}</span>
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            marginTop: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "10px",
              border: "1px solid rgba(64,138,113,0.28)",
              background: "transparent",
              color: "#285a48",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCooking}
            style={{
              padding: "0.6rem 1.1rem",
              borderRadius: "10px",
              border: "none",
              background: "#245a39",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              opacity: isCooking ? 0.6 : 1,
            }}
          >
            {isCooking ? "Updating..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookConfirmModal;
