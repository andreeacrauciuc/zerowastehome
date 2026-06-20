import React from "react";
import "./CookConfirmModal.scss";

function CookConfirmModal({ pending, isCooking, onConfirm, onCancel }) {
  if (!pending) return null;

  return (
    <div className="cook-confirm-overlay" onClick={onCancel}>
      <div className="cook-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cook-confirm-header">
          <h3>Confirm cooking</h3>
          <button type="button" className="cook-confirm-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <p className="cook-confirm-body">
          This will use {pending.summary} from your inventory.
        </p>

        {pending.warning && (
          <p className="cook-confirm-warning">
            <span>⚠</span>
            <span>{pending.warning}</span>
          </p>
        )}

        <div className="cook-confirm-actions">
          <button type="button" className="cook-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="cook-confirm-submit"
            onClick={onConfirm}
            disabled={isCooking}
          >
            {isCooking ? "Updating..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookConfirmModal;
