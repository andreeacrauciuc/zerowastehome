import { describe, it, expect } from "vitest";
import { toUserFacingErrorMessage } from "./errorMessages";

describe("toUserFacingErrorMessage", () => {
  it("maps Firebase email-already-in-use errors to a clear signup message", () => {
    expect(
      toUserFacingErrorMessage({ code: "auth/email-already-in-use" })
    ).toBe("An account with this email already exists. Try signing in instead");
  });

  it("maps Firestore signup rollback errors to a clear recovery message", () => {
    expect(
      toUserFacingErrorMessage({ code: "FIRESTORE_PROFILE_CREATE_FAILED" })
    ).toBe(
      "Your account was created, but your profile could not be saved. The signup was rolled back; please try again"
    );
  });

  it("maps duplicate auth requests to a clear loading-state message", () => {
    expect(
      toUserFacingErrorMessage({ code: "AUTH_REQUEST_IN_PROGRESS" })
    ).toBe("Please wait for the current authentication request to finish");
  });
});