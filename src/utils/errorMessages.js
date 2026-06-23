const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again";

const FRIENDLY_ERROR_MAP = {
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead",
  "auth/invalid-email": "The email address is not valid",
  "auth/weak-password": "Password must be at least 6 characters",
  "auth/too-many-requests": "Too many failed attempts. Please try again later",
  "auth/wrong-password": "Incorrect email or password",
  "auth/user-not-found": "Incorrect email or password",
  "auth/invalid-credential": "Incorrect email or password",
  "auth/user-disabled": "This account has been disabled. Contact support for help",
  "auth/network-request-failed": "Network error. Check your connection and try again",
  "auth/operation-not-allowed": "Email and password sign-in is not enabled for this app",
  "auth/requires-recent-login": "Please sign in again to continue",
  AUTH_REQUEST_IN_PROGRESS: "Please wait for the current authentication request to finish",
  AUTH_VALIDATION_FAILED: "Check the highlighted fields and try again",
  AUTH_INVALID_JOIN_CODE:
    "That household invite code is invalid, so your account was not created. Check the code with your household admin and try again",
  FIRESTORE_PROFILE_CREATE_FAILED:
    "Your account was created, but your profile could not be saved. The signup was rolled back; please try again",
  FIRESTORE_PROFILE_REPAIR_FAILED:
    "We could not prepare your profile. Please try signing in again",
  "auth/session-expired": "Your session has expired. Please sign in again",
  "auth/user-token-expired": "Your session has expired. Please sign in again",
  "auth/invalid-user-token": "Invalid authentication token. Please sign in again",
  "permission-denied": "We could not access your profile. Please check your account permissions",
  unavailable: "The service is temporarily unavailable. Please try again in a moment",
  "not-found": "The requested data was not found",
  "already-exists": "This item already exists",
  "resource-exhausted": "Usage limit reached. Please try again later",
  "failed-precondition":
    "This operation cannot be performed in the current state. Please reload the page",
  unauthenticated: "You are not authenticated. Please sign in",
  cancelled: "The operation was cancelled",
  "deadline-exceeded":
    "The connection took too long. Please check your internet and try again",
  "storage/unauthorized": "You do not have permission to access this file",
  "storage/object-not-found": "File not found",
  "functions/internal": "An internal error occurred. Please try again",
  QUOTA_EXCEEDED: "We are getting a lot of requests right now. Please try again in a moment",
  GROQ_PROXY_URL_MISSING: "Recipe generation is not set up yet. Please try again later",
  GROQ_PROXY_UNAUTHORIZED: "Recipe generation is not available right now. Please try again later",
  GROQ_API_ERROR: "Recipe generation could not be completed right now. Please try again",
  GROQ_EMPTY_RESPONSE: "Recipe generation returned no results. Try again with different ingredients",
  GROQ_INVALID_JSON: "Recipe generation returned an invalid response. Please try again",
  GROQ_INVALID_SCHEMA: "Recipe generation returned unexpected data. Please try again",
  OCR_PROXY_URL_MISSING: "Barcode scanning is not set up yet. Please try again later",
  HOUSEHOLD_SCOPE_REQUIRED: "You need to be part of a household to do that",
  HOUSEHOLD_SCOPE_MISMATCH: "This item belongs to a different household",
  DATA_SCOPE_REQUIRED: "Please sign in or select a valid data context before continuing",
  DATA_SCOPE_MISMATCH: "This item belongs to a different data context",
  INVALID_SCOPED_UPDATE: "This item could not be updated. Please try again",
  INVALID_SCOPED_DELETE: "This item could not be deleted. Please try again",
  DOCUMENT_NOT_FOUND: "That item could not be found anymore",
  INVENTORY_ITEM_NOT_FOUND: "That inventory item could not be found anymore",
  NO_AUTHENTICATED_USER: "Please sign in again to continue",
  "No authenticated user": "Please sign in again to continue",
  "No authenticated user found": "Please sign in again to continue",
  "Join code is required": "Enter a join code to continue",
  "Invalid household join code": "That join code is invalid. Check it and try again",
  "Household not found for this join code": "That join code is invalid. Check it and try again",
  "Household join code lookup is not allowed by Firestore rules":
    "Joining with a household code is blocked by database permissions. Ask the household admin to generate a new code, then try again",
  "Household not found": "That household could not be found anymore",
  "You are not part of a household": "You need to join a household first",
  ALREADY_IN_HOUSEHOLD:
    "You're already in a household. Leave it first, then create or join another",
  "Only the household admin can regenerate the join code":
    "Only the household admin can generate a new join code",
  "Could not generate a unique household code. Please try again":
    "Could not create a new join code. Please try again",
};

const getRawMessage = (value) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && value.code) return value.code;
  if (value instanceof Error) return value.message || value.name || "";
  if (value && typeof value === "object") {
    return value.message || value.code || "";
  }
  return "";
};

export const toUserFacingErrorMessage = (error, fallback = DEFAULT_ERROR_MESSAGE) => {
  const raw = String(getRawMessage(error) || "").trim();
  if (!raw) return fallback;

  if (FRIENDLY_ERROR_MAP[raw]) return FRIENDLY_ERROR_MAP[raw];

  const upper = raw.toUpperCase();
  if (FRIENDLY_ERROR_MAP[upper]) return FRIENDLY_ERROR_MAP[upper];
  return fallback;
};

export const DEFAULT_USER_ERROR_MESSAGE = DEFAULT_ERROR_MESSAGE;
