import React from "react";

const LogoutConfirm = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay" role="dialog" aria-modal="true">
      <div className="logout-modal">
        <h3>Log out?</h3>
        <p>You can sign back in anytime.</p>
        <div className="logout-modal-actions">
          <button type="button" className="logout-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="logout-confirm" onClick={onConfirm}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirm;
