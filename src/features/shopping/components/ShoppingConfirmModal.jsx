import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const MotionDiv = motion.div;

function ShoppingConfirmModal({ isOpen, title, message, confirmLabel, confirmDanger, onConfirm, onCancel, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          className="shopping-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <MotionDiv
            className="shopping-add-modal"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shopping-add-modal-header">
              <h3>{title}</h3>
              <button type="button" onClick={onCancel}>
                <X size={18} />
              </button>
            </div>

            {children || (
              <p style={{ padding: "0 1.25rem 1rem", fontSize: "0.9rem", color: "var(--slate-soft)" }}>
                {message}
              </p>
            )}

            <div className="shopping-add-modal-actions">
              <button type="button" className="ghost" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                style={confirmDanger ? { background: "var(--danger, #e53e3e)" } : undefined}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

export default ShoppingConfirmModal;
