import { useEffect, useMemo } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../features/auth/context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { calculateNotifications } from "../services/notificationService";

const getExpiryInfo = (expiry) => {
  if (!expiry) return { status: "na" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(expiry);
  exp.setHours(0, 0, 0, 0);

  const daysLeft = Math.round((exp - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: "expired" };
  if (daysLeft === 0) return { status: "today" };
  if (daysLeft <= 3) return { status: "soon" };
  return { status: "ok" };
};

const getConsumptionHabitSummary = (impactHistory = []) => {
  const now = Date.now();
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const eatenStatuses = new Set(["eaten", "saved", "consumed"]);

  let consumedCount = 0;
  (impactHistory || []).forEach((entry) => {
    const when = Number(new Date(entry?.actionDate || entry?.createdAt || 0).getTime());
    if (!Number.isFinite(when) || now - when > fourteenDaysMs) return;

    const status = String(entry?.status || "").toLowerCase();
    if (eatenStatuses.has(status)) {
      consumedCount += 1;
    }
  });

  if (consumedCount >= 12) return "high";
  if (consumedCount >= 6) return "medium";
  return "low";
};

export const useNotifications = (items = [], impactHistory = []) => {
  const { currentUser } = useAuth();
  const { userPreferences } = useSettings();
  const alertsEnabled = Boolean(userPreferences?.alertsEnabled);
  const activeHouseholdId = currentUser?.householdId || null;

  const urgentSummary = useMemo(() => {
    const summary = { expired: 0, today: 0, soon: 0 };
    (items || []).forEach((it) => {
      const info = getExpiryInfo(it.expiry);
      if (info.status === "expired") summary.expired += 1;
      if (info.status === "today") summary.today += 1;
      if (info.status === "soon") summary.soon += 1;
    });
    return summary;
  }, [items]);

  const consumptionHabit = useMemo(
    () => getConsumptionHabitSummary(impactHistory),
    [impactHistory]
  );

  useEffect(() => {
    if (!alertsEnabled) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const pushCandidates = calculateNotifications(items, userPreferences, {
      channel: "push",
    });
    const expiryAndStock = pushCandidates.filter(
      (entry) => entry.type === "expiry" || entry.type === "stock"
    );
    if (expiryAndStock.length === 0) return;

    const key = "zw_last_alert_ts";
    const last = Number(localStorage.getItem(key) || "0");
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;
    if (now - last < twelveHours) return;

    localStorage.setItem(key, String(now));

    const msgParts = [];
    const expiredCount = expiryAndStock.filter(
      (entry) => entry.type === "expiry" && Number(entry.hoursUntilExpiry) <= 0
    ).length;
    const expiringSoonCount = expiryAndStock.filter(
      (entry) => entry.type === "expiry" && Number(entry.hoursUntilExpiry) > 0
    ).length;
    const lowStockCount = expiryAndStock.filter((entry) => entry.type === "stock").length;

    if (expiredCount) msgParts.push(`${expiredCount} expired`);
    if (expiringSoonCount) msgParts.push(`${expiringSoonCount} expiring soon`);
    if (lowStockCount) msgParts.push(`${lowStockCount} low stock`);

    if (consumptionHabit === "low" && (urgentSummary.expired > 0 || urgentSummary.soon > 0)) {
      msgParts.push("Consider cooking expiring ingredients today");
    }

    new Notification("Zero Waste Alert", { body: msgParts.join(" • ") });
  }, [alertsEnabled, consumptionHabit, items, urgentSummary.expired, urgentSummary.soon, userPreferences]);

  useEffect(() => {
    if (!alertsEnabled) return undefined;
    if (!currentUser?.uid) return undefined;
    if (!activeHouseholdId) return undefined;
    if (!("Notification" in window)) return undefined;
    if (Notification.permission !== "granted") return undefined;

    const scopeKey = activeHouseholdId || currentUser.uid;
    const timestampKey = `zw_last_event_alert_ts_${scopeKey}`;
    const eventsQuery = query(collection(db, "householdEvents"), where("householdId", "==", activeHouseholdId));

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snap) => {
        const events = snap.docs
          .map((entry) => ({ id: entry.id, ...entry.data() }))
          .sort((a, b) => {
            const aTime = Number(new Date(a?.createdAt || 0).getTime());
            const bTime = Number(new Date(b?.createdAt || 0).getTime());
            return bTime - aTime;
          });
        const lastTs = Number(localStorage.getItem(timestampKey) || "0");

        const scopedEvents = events.filter(
          (entry) => String(entry.householdId || "") === String(activeHouseholdId)
        );

        const newest = scopedEvents.find((entry) => {
          const createdAtTs = Number(new Date(entry.createdAt || 0).getTime());
          return Number.isFinite(createdAtTs) && createdAtTs > lastTs && entry.actorId !== currentUser.uid;
        });

        if (!newest) return;

        const allowed = calculateNotifications([], userPreferences, {
          channel: "push",
          systemEvents: [newest],
        });
        if (allowed.length === 0) return;

        const createdAtTs = Number(new Date(newest.createdAt || Date.now()).getTime());
        localStorage.setItem(timestampKey, String(createdAtTs));

        new Notification(activeHouseholdId ? "Household Update" : "Your Update", {
          body: newest.message || "New activity detected.",
        });
      },
      (error) => {
        console.error("useNotifications: householdEvents listener failed.", error);
      }
    );

    return () => unsubscribe();
  }, [activeHouseholdId, alertsEnabled, currentUser?.uid, userPreferences]);

  return { urgentSummary, consumptionHabit };
};
