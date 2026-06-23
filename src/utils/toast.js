import { toast } from "sonner";
import { DEFAULT_USER_ERROR_MESSAGE, toUserFacingErrorMessage } from "./errorMessages";

const normalizeMessage = (message, fallback) => {
  const text = toUserFacingErrorMessage(message, fallback);
  return String(text || "").trim() || fallback;
};

export const showError = (message) => {
  toast.error(normalizeMessage(message, DEFAULT_USER_ERROR_MESSAGE));
};

export const showSuccess = (message) => {
  toast.success(normalizeMessage(message, "Done successfully"));
};

