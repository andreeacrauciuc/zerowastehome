const FIREBASE_ERROR_MESSAGES = {
  "auth/session-expired": "Your session has expired. Please sign in again.",
  "auth/user-token-expired": "Your session has expired. Please sign in again.",
  "auth/invalid-user-token": "Invalid authentication token. Please sign in again.",
  "permission-denied":
    "You do not have permission to perform this action. Please reload the page.",
  DATA_SCOPE_MISMATCH:
    "Your session or group access has changed. Please reload the page.",
  unavailable:
    "Service temporarily unavailable. Please check your internet connection.",
  "not-found": "The requested data was not found.",
  "already-exists": "This item already exists.",
  "resource-exhausted": "Usage limit reached. Please try again later.",
  "failed-precondition":
    "This operation cannot be performed in the current state. Please reload the page.",
  unauthenticated: "You are not authenticated. Please sign in.",
  cancelled: "The operation was cancelled.",
  "deadline-exceeded":
    "The connection took too long. Please check your internet and try again.",
  "network-request-failed": "Network error. Please check your internet connection.",
  "storage/unauthorized": "You do not have permission to access this file.",
  "storage/object-not-found": "File not found.",
  "functions/internal": "An internal error occurred. Please try again.",
};

export const normalizeError = (error) => {
  if (!error) return "Unknown error";

  const code = typeof error === "object" ? error.code : null;
  if (code && FIREBASE_ERROR_MESSAGES[code]) {
    return FIREBASE_ERROR_MESSAGES[code];
  }

  const message = error.message || String(error);
  if (FIREBASE_ERROR_MESSAGES[message]) {
    return FIREBASE_ERROR_MESSAGES[message];
  }

  return message;
};

export const toSafeQuantity = (value, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const toSafePrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : null;
};
