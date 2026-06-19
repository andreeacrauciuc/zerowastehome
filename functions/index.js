const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const APP_TIMEZONE = "Europe/Bucharest";

const parseTimeToMinutes = (value) => {
  const text = String(value || "");
  const [hh, mm] = text.split(":").map((part) => Number(part));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
};

const minutesNowInZone = (now, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hh = Number(parts.find((p) => p.type === "hour")?.value);
  const mm = Number(parts.find((p) => p.type === "minute")?.value);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const isWithinSilentHours = (silentHours, now) => {
  if (!silentHours || silentHours.enabled !== true) return false;

  const startMinutes = parseTimeToMinutes(silentHours.start || "22:00");
  const endMinutes = parseTimeToMinutes(silentHours.end || "07:00");
  if (startMinutes === null || endMinutes === null) return false;
  if (startMinutes === endMinutes) return false;

  const currentMinutes = minutesNowInZone(now, APP_TIMEZONE);
  if (currentMinutes === null) return false;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const toDateKey = (daysFromNow) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

exports.checkExpiringItems = onSchedule(
  {
    schedule: "every day 09:00",
    timeZone: "Europe/Bucharest",
  },
  async () => {
    const now = new Date(); 
    const targetDate = toDateKey(2); 

    const snap = await db
      .collection("inventory")
      .where("expiry", "==", targetDate)
      .get();

    if (snap.empty) {
      logger.info(`No inventory items expiring on ${targetDate}.`);
      return;
    }

    /** @type {Map<string, { type: "household"|"user", id: string, items: any[] }>} */
    const groups = new Map();
    snap.forEach((docSnap) => {
      const item = docSnap.data();
      const householdId = item.householdId || null;
      const ownerId = item.ownerId || null;
      if (!householdId && !ownerId) return;

      const key = householdId ? `household:${householdId}` : `user:${ownerId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          type: householdId ? "household" : "user",
          id: householdId || ownerId,
          items: [],
        });
      }
      groups.get(key).items.push({ id: docSnap.id, ...item });
    });

    let sentCount = 0;
    const staleTokenCleanups = [];

    for (const group of groups.values()) {
      let uids = [];
      if (group.type === "household") {
        const hhSnap = await db.collection("households").doc(group.id).get();
        const hh = hhSnap.exists ? hhSnap.data() : null;
        uids = Array.isArray(hh?.memberIds) ? hh.memberIds.filter(Boolean) : [];
      } else {
        uids = [group.id];
      }
      if (uids.length === 0) continue;

      const tokenOwner = new Map();
      let silencedUserCount = 0;
      for (const uid of uids) {
        const userSnap = await db.collection("users").doc(uid).get();
        if (!userSnap.exists) continue;
        const userData = userSnap.data();

        const silentHours = userData?.userPreferences?.silentHours;
        if (isWithinSilentHours(silentHours, now)) {
          silencedUserCount += 1;
          continue; 
        }

        const tokens = userData?.fcmTokens;
        if (Array.isArray(tokens)) {
          tokens.filter(Boolean).forEach((tk) => tokenOwner.set(tk, uid));
        }
      }
      const tokens = [...tokenOwner.keys()];
      if (tokens.length === 0) {
        if (silencedUserCount > 0) {
          logger.info(
            `Group ${group.type}:${group.id} — all recipients in silent hours; nothing sent.`,
          );
        }
        continue;
      }

      const names = group.items.map((it) => it.name).filter(Boolean);
      const count = group.items.length;
      const body =
        count === 1
          ? `${names[0] || "An item"} expires in 2 days.`
          : `${count} items expire in 2 days: ${names.slice(0, 3).join(", ")}${
              count > 3 ? "…" : ""
            }`;

      const message = {
        tokens,
        notification: {
          title: "Use it before you lose it 🥗",
          body,
        },
        data: {
          type: "expiry_reminder",
          url: "/home",
          itemCount: String(count),
          expiry: targetDate,
        },
        webpush: {
          fcmOptions: { link: "/home" },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      sentCount += response.successCount;

      response.responses.forEach((resp, idx) => {
        if (resp.success) return;
        const code = resp.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          const badToken = tokens[idx];
          const uid = tokenOwner.get(badToken);
          if (uid && badToken) {
            staleTokenCleanups.push(
              db
                .collection("users")
                .doc(uid)
                .update({
                  fcmTokens: admin.firestore.FieldValue.arrayRemove(badToken),
                })
                .catch((e) => logger.warn("Token cleanup failed", e)),
            );
          }
        }
      });
    }

    await Promise.allSettled(staleTokenCleanups);
    logger.info(
      `Expiry push complete for ${targetDate}: ${sentCount} messages sent across ${groups.size} recipient group(s).`,
    );
  },
);
