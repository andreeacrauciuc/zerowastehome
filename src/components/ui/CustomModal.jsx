import React from "react";

const backdropStyle = {
  background: "rgba(0, 0, 0, 0.35)",
};

const cardStyle = {
  maxWidth: "560px",
  width: "calc(100% - 2rem)",
  background: "#fff",
  padding: "1rem",
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1rem",
};

function CustomModal({
  isOpen,
  title,
  message,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  hideCancel = false,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={backdropStyle} onClick={onClose}>
      <div className="modal-container animate-pop" style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{title || "Notice"}</h2>
        </header>

        {message ? <p>{message}</p> : null}
        {children || null}

        <div style={actionsStyle}>
          {!hideCancel && (
            <button type="button" className="inventory-action-btn" onClick={onClose}>
              {cancelLabel}
            </button>
          )}
          <button type="button" className="save-item-btn" onClick={onConfirm || onClose}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomModal;
