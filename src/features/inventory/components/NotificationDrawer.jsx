import React from "react";
import { AlertTriangle, ShoppingCart, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationDrawer } from "../hooks/useNotificationDrawer";
import "../../../styles/components/common/UI/ModalShell.scss";
import "./NotificationDrawer.scss";

const MotionArticle = motion.article;

function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onConsume,
  onAddToList,
}) {
  const {
    visibleNotifications,
    selectedVisibleNotifications,
    areAllVisibleSelected,
    bulkActionLabel,
    mixedActionHint,
    criticalCount,
    exitingIds,
    selectedIds,
    isProcessingBulk,
    toggleSelected,
    handleToggleSelectAll,
    handleNotificationAction,
    handleBulkAction,
  } = useNotificationDrawer({ notifications, onConsume, onAddToList });

  return (
    <div
      className={`notification-drawer-overlay modal-shell-overlay ${isOpen ? "is-open" : ""}`}
      onClick={onClose}
      role="presentation"
      aria-hidden={!isOpen}
    >
      <aside
        className={`notification-drawer-card modal-shell-card ${isOpen ? "is-open" : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications drawer"
      >
        <div className="modal-shell-header">
          <h3>Notifications ({criticalCount} critical)</h3>
          <button type="button" onClick={onClose} aria-label="Close notifications drawer">
            <X size={18} />
          </button>
        </div>

        <div className="modal-shell-body notification-drawer-body">
          {visibleNotifications.length > 0 ? (
            <div className="notification-toolbar-group">
              <div className="notification-toolbar">
                <label className="notification-select-all">
                  <input
                    type="checkbox"
                    checked={areAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                    disabled={isProcessingBulk}
                  />
                  <span>Select all</span>
                </label>

                <motion.button
                  type="button"
                  className="inventory-action-btn primary notification-bulk-btn"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isProcessingBulk || selectedVisibleNotifications.length === 0}
                  aria-busy={isProcessingBulk}
                  aria-describedby={mixedActionHint ? "notification-mixed-hint" : undefined}
                  onClick={handleBulkAction}
                >
                  <span>{isProcessingBulk ? "Processing…" : bulkActionLabel}</span>
                </motion.button>
              </div>

              {mixedActionHint ? (
                <p id="notification-mixed-hint" className="notification-mixed-hint">
                  <AlertTriangle size={13} aria-hidden="true" />
                  <span>{mixedActionHint}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {visibleNotifications.length === 0 ? (
            <div className="notification-card notification-empty-state">
              <div className="notification-content">
                <strong>All clear</strong>
                <p>No inventory alerts right now</p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visibleNotifications.map((notification) => {
                const isCritical = notification.level === "critical";
                const isExiting = exitingIds.has(notification.id);
                const isSelected = selectedIds.has(notification.id);
                const Icon = isCritical ? AlertTriangle : ShoppingCart;

                return (
                  <MotionArticle
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: isExiting ? 0 : 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`notification-card ${isCritical ? "critical" : "warning"} ${
                      isExiting ? "is-exiting" : ""
                    } ${isSelected ? "is-selected" : ""}`}
                  >
                    <label className="notification-select-item" aria-label="Select notification">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(notification.id)}
                        disabled={isExiting || isProcessingBulk}
                      />
                    </label>

                    <div className="notification-icon-wrap" aria-hidden="true">
                      <Icon size={18} />
                    </div>

                    <div className="notification-content">
                      <strong>{isCritical ? "Expiry alert" : "Low Stock"}</strong>
                      <p>{notification.message}</p>
                    </div>

                    <div className="modal-shell-actions notification-actions">
                      <motion.button
                        type="button"
                        className={`inventory-action-btn ${isCritical ? "primary" : "secondary"}`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNotificationAction(notification)}
                        disabled={isExiting || isProcessingBulk}
                      >
                        <span>{isCritical ? "Consume" : "Add to List"}</span>
                      </motion.button>
                    </div>
                  </MotionArticle>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </aside>
    </div>
  );
}

export default NotificationDrawer;
