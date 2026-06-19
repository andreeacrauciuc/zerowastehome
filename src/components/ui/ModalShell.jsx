import React from "react";
import { X } from "lucide-react";
import "../../styles/components/common/UI/ModalShell.scss";

const ModalShell = ({ isOpen, title, onClose, children, className = "" }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-shell-overlay" onClick={onClose}>
      <div className={`modal-shell-card ${className}`.trim()} onClick={(event) => event.stopPropagation()}>
        <div className="modal-shell-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default ModalShell;
