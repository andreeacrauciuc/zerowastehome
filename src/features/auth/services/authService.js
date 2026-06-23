export const CURRENT_USER_KEY = "mw-current-user";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFILE_STORE =
  typeof localStorage !== "undefined" ? localStorage : undefined;

export const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const createFlowError = (message, code) =>
  Object.assign(new Error(message), { code });

export const validateSignupPayload = ({ fullName, email, password } = {}) => {
  if (!String(fullName || "").trim()) {
    throw createFlowError("Full name is required", "AUTH_VALIDATION_FAILED");
  }

  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw createFlowError("Valid email is required", "auth/invalid-email");
  }

  if (String(password || "").length < 6) {
    throw createFlowError(
      "Password must be at least 6 characters",
      "auth/weak-password",
    );
  }

  return normalizedEmail;
};

export const validateLoginPayload = ({ email, password } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw createFlowError("Valid email is required", "auth/invalid-email");
  }

  if (String(password || "").length < 6) {
    throw createFlowError(
      "Password must be at least 6 characters",
      "auth/weak-password",
    );
  }

  return normalizedEmail;
};

export const readJson = (key, fallback) => {
  try {
    let value = PROFILE_STORE?.getItem(key) ?? null;
    if (value === null && typeof sessionStorage !== "undefined") {
      const legacy = sessionStorage.getItem(key);
      if (legacy !== null) {
        value = legacy;
        try {
          PROFILE_STORE?.setItem(key, legacy);
          sessionStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
    }
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const persistProfile = (profile) => {
  try {
    const { photoDataUrl: _photoDataUrl, ...safeProfile } = profile || {};
    PROFILE_STORE?.setItem(CURRENT_USER_KEY, JSON.stringify(safeProfile));
  } catch {
    // best-effort; avoid crashing the app
  }
};

export const clearPersistedProfile = () => {
  try {
    PROFILE_STORE?.removeItem(CURRENT_USER_KEY);
  } catch {
    // ignore
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {
    // ignore
  }
};

export const buildProfile = (firebaseUser, userData = {}, fallbackEmail = "") => ({
  uid: firebaseUser.uid,
  ownerId: firebaseUser.uid,
  fullName: userData.fullName || firebaseUser.displayName || "",
  email: normalizeEmail(userData.email || firebaseUser.email || fallbackEmail),
  photoDataUrl: userData.photoDataUrl || "",
  householdId: userData.householdId || null,
});
