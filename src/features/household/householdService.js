import {
  collection,
  doc,
  getDoc,
  getDocs,
  query as queryFirestore,
  where as whereFirestore,
} from "firebase/firestore";
import { db } from "../../services/firebase";

export const CONTEXT_MODE_KEY = "zw_context_mode";
export const HOUSEHOLD_JOIN_CODES_COLLECTION = "householdJoinCodes";

export const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

export const isPermissionDeniedError = (error) =>
  error?.code === "permission-denied" ||
  /missing or insufficient permissions/i.test(String(error?.message || ""));

const createCode = (length = 6) => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1)
      values[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(values)
    .map((v) => charset[v % charset.length])
    .join("");
};


const LOCAL_MODE_KEY_PREFIX = "zw_data_mode_local";
export const clearLocalModeFlags = (uid) => {
  try {
    localStorage.removeItem(LOCAL_MODE_KEY_PREFIX);
    if (!uid) return;
    const userPrefix = `${LOCAL_MODE_KEY_PREFIX}:${uid}:`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userPrefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // best-effort; never block a join over a storage hiccup
  }
};

export const createMemberPayload = (profile, role = "member") => ({
  uid: profile.uid,
  fullName: profile.fullName || "",
  email: profile.email || "",
  role,
  joinedAt: new Date().toISOString(),
});

const getQuerySnapshotOnce = (queryRef) => getDocs(queryRef);

export const resolveHouseholdByJoinCode = async (code) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const joinCodeRef = doc(db, HOUSEHOLD_JOIN_CODES_COLLECTION, normalizedCode);

  try {
    const joinCodeSnap = await getDoc(joinCodeRef);
    const householdId = joinCodeSnap.exists()
      ? String(joinCodeSnap.data()?.householdId || "")
      : "";

    if (householdId) {
      const householdRef = doc(db, "households", householdId);
      const householdSnap = await getDoc(householdRef);
      if (householdSnap.exists()) {
        return { id: householdId, ref: householdRef, data: householdSnap.data() };
      }
    }
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      throw new Error(
        "Household join code lookup is not allowed by Firestore rules",
      );
    }
    throw error;
  }

  try {
    const householdQuery = queryFirestore(
      collection(db, "households"),
      whereFirestore("joinCode", "==", normalizedCode),
    );
    const householdSnap = await getQuerySnapshotOnce(householdQuery);

    if (householdSnap.empty) return null;

    const householdDoc = householdSnap.docs[0];
    return {
      id: householdDoc.id,
      ref: doc(db, "households", householdDoc.id),
      data: householdDoc.data(),
    };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      throw new Error(
        "Household join code lookup is not allowed by Firestore rules",
      );
    }
    throw error;
  }
};

export const getUniqueJoinCode = async () => {
  let attempts = 0;
  let candidate = createCode();

  while (attempts < 20) {
    const snap = await getDoc(
      doc(db, HOUSEHOLD_JOIN_CODES_COLLECTION, candidate),
    );
    if (!snap.exists()) return candidate;

    candidate = createCode();
    attempts += 1;
  }

  throw new Error(
    "Could not generate a unique household code. Please try again",
  );
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const commitBatchWithRetry = async (batch, maxAttempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await batch.commit();
      return;
    } catch (error) {
      lastError = error;
      if (isPermissionDeniedError(error) || attempt === maxAttempts) {
        throw error;
      }
      await sleep(300 * attempt);
    }
  }
  throw lastError;
};
