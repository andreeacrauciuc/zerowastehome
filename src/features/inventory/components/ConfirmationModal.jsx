import React from "react";
import "./ConfirmationModal.scss";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.28)",
  zIndex: 999,
};

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  width: "380px",
  minHeight: "180px",
  maxWidth: "90vw",
  background: "rgba(255, 255, 255, 0.8)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.4)",
  borderRadius: "24px",
  padding: "28px",
  boxShadow: "0 15px 40px rgba(0, 0, 0, 0.12)",
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 1000,
};

const titleStyle = {
  fontSize: "1.2rem",
  fontWeight: 700,
  marginBottom: "20px",
  color: "#1a1a1a",
};

const actionsStyle = {
  display: "flex",
  gap: "12px",
  marginTop: "auto",
};

function ConfirmationModal({ isOpen, itemName, onWasted, onDeleteError, onCancel }) {
  if (!isOpen) return null;

  return (
    <>
      <div style={overlayStyle} onClick={onCancel} />
      <section style={containerStyle} role="dialog" aria-modal="true" aria-label="Discard Item dialog">
        <h3 style={titleStyle}>
          Discard {itemName ? <strong>"{itemName}"</strong> : "this item"}?
        </h3>

        <div style={actionsStyle}>
          <button
            type="button"
            className="confirmation-modal-btn confirmation-modal-btn--wasted"
            onClick={onWasted}
          >
            Wasted
          </button>
          <button
            type="button"
            className="confirmation-modal-btn confirmation-modal-btn--delete"
            onClick={onDeleteError}
          >
            Just delete
          </button>
          <button
            type="button"
            className="confirmation-modal-btn confirmation-modal-btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </section>
    </>
  );
}

export default ConfirmationModal;
