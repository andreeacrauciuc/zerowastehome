import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ListChecks, ShoppingCart } from "lucide-react";
import { showError } from "../../../utils/toast";

const EXIT_ANIMATION_MS = 220;

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

export const useNotificationDrawer = ({ notifications, onConsume, onAddToList }) => {
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

  return {
    visibleNotifications,
    selectedVisibleNotifications,
    areAllVisibleSelected,
    bulkActionLabel,
    mixedActionHint,
    BulkActionIcon,
    criticalCount,
    exitingIds,
    selectedIds,
    isProcessingBulk,
    toggleSelected,
    handleToggleSelectAll,
    handleNotificationAction,
    handleBulkAction,
  };
};
