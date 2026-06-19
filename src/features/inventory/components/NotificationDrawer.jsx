import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ListChecks, ShoppingCart, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { showError } from "../../../utils/toast";
import "../../../styles/components/common/UI/ModalShell.scss";
import "../../../styles/features/inventory/NotificationDrawer.scss";

const EXIT_ANIMATION_MS = 220;

const MotionArticle = motion.article;

const getListCandidate = (notification) => {
  const item = notification?.item || {};
  return {
    id: item?.id || null,
    name: item?.name || "",
    category: item?.category || item?.categoryName || "Other",
    quantity: item?.quantity || 1,
    unit: item?.unit || "pcs",
  };
};

function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onConsume,
  onAddToList,
}) {
  const [exitingIds, setExitingIds] = useState(() => new Set());
  const [resolvedIds, setResolvedIds] = useState(() => new Set());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const exitTimers = useRef(new Set());

  const visibleNotifications = useMemo(() => {
    return (notifications || []).filter((notification) => !resolvedIds.has(notification.id));
  }, [notifications, resolvedIds]);

  const selectedVisibleNotifications = useMemo(
    () =>
      visibleNotifications.filter(
        (notification) => selectedIds.has(notification.id) && !exitingIds.has(notification.id)
      ),
    [exitingIds, selectedIds, visibleNotifications]
  );

  const areAllVisibleSelected =
    visibleNotifications.length > 0 && selectedVisibleNotifications.length === visibleNotifications.length;

  const selectedCriticalCount = useMemo(
    () => selectedVisibleNotifications.filter((n) => n.level === "critical").length,
    [selectedVisibleNotifications]
  );
  const selectedWarningCount = selectedVisibleNotifications.length - selectedCriticalCount;

  const allCriticalSelected =
    selectedVisibleNotifications.length > 0 && selectedWarningCount === 0;

  const allWarningSelected =
    selectedVisibleNotifications.length > 0 && selectedCriticalCount === 0;

  const isMixedSelection = selectedCriticalCount > 0 && selectedWarningCount > 0;

  const bulkActionLabel = allCriticalSelected
    ? "Mark as used"
    : allWarningSelected
      ? "Add to shopping list"
      : `Resolve ${selectedVisibleNotifications.length} selected`;

  const mixedActionHint = isMixedSelection
    ? `${selectedCriticalCount} expiring ${selectedCriticalCount === 1 ? "item" : "items"} marked as used, ` +
      `and ${selectedWarningCount} low-stock ${selectedWarningCount === 1 ? "item" : "items"} added to your shopping list.`
    : null;

  const BulkActionIcon = allCriticalSelected
    ? AlertTriangle
    : allWarningSelected
      ? ShoppingCart
      : ListChecks;

  const startExit = useCallback((notificationId) => {
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.add(notificationId);
      return next;
    });
  }, []);

  const completeExit = useCallback((notificationId) => {
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.delete(notificationId);
      return next;
    });

    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(notificationId);
      return next;
    });
  }, []);

  const resolveNotification = useCallback(
    async (notification) => {
      if (notification.level === "critical") {
        const consumeItemId =
          notification.itemId || notification.item?.id || notification.id || null;
        await onConsume?.(consumeItemId);
      } else {
        await onAddToList?.(getListCandidate(notification));
      }

      startExit(notification.id);
      const timerId = window.setTimeout(() => {
        completeExit(notification.id);
        exitTimers.current.delete(timerId);
      }, EXIT_ANIMATION_MS);
      exitTimers.current.add(timerId);
    },
    [completeExit, onAddToList, onConsume, startExit]
  );

  const handleNotificationAction = useCallback(
    async (notification) => {
      if (!notification?.id || exitingIds.has(notification.id)) return;

      try {
        await resolveNotification(notification);
      } catch (error) {
        console.error("Failed to resolve notification action", error);
        showError("Could not update this notification. Please try again");
      }
    },
    [exitingIds, resolveNotification]
  );

  useEffect(() => () => {
    exitTimers.current.forEach((timerId) => window.clearTimeout(timerId));
    exitTimers.current.clear();
  }, []);

  const toggleSelected = useCallback((notificationId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (areAllVisibleSelected) return new Set();

      const next = new Set(prev);
      visibleNotifications.forEach((entry) => {
        if (!exitingIds.has(entry.id)) {
          next.add(entry.id);
        }
      });
      return next;
    });
  }, [areAllVisibleSelected, exitingIds, visibleNotifications]);

  const handleBulkAction = useCallback(async () => {
    if (isProcessingBulk || selectedVisibleNotifications.length === 0) return;

    const batch = selectedVisibleNotifications.filter(
      (notification) => notification?.id && !exitingIds.has(notification.id)
    );
    if (batch.length === 0) return;

    setIsProcessingBulk(true);
    setSelectedIds(new Set());

    const results = await Promise.allSettled(
      batch.map((notification) => resolveNotification(notification))
    );

    setIsProcessingBulk(false);

    if (results.some((result) => result.status === "rejected")) {
      const failed = results.filter((result) => result.status === "rejected");
      failed.forEach((result) =>
        console.error("Failed to resolve notification action", result.reason)
      );
      showError(
        failed.length === results.length
          ? "Could not update these notifications. Please try again."
          : "Some notifications could not be updated. Please try again."
      );
    }
  }, [exitingIds, isProcessingBulk, resolveNotification, selectedVisibleNotifications]);

  const criticalCount = useMemo(
    () => visibleNotifications.filter((notification) => notification.level === "critical").length,
    [visibleNotifications]
  );

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
