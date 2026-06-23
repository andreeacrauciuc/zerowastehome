import { useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { useHousehold } from "../../household/HouseholdContext";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import { showError, showSuccess } from "../../../utils/toast";

export function useHouseholdSettings({ setSettingsBusy, fullName }) {
  const { currentUser } = useAuth();
  const {
    createHouseholdAndJoin,
    household,
    isHouseholdAdmin,
    joinHouseholdWithCode,
    leaveHousehold,
    regenerateHouseholdJoinCode,
  } = useHousehold();

  const [joinIdInput, setJoinIdInput] = useState("");

  const handleCopyId = async () => {
    if (!household?.joinCode) {
      showError("No join code available. Create or join a household first");
      return;
    }

    try {
      await navigator.clipboard.writeText(household.joinCode);
      showSuccess("Join code copied");
    } catch {
      showError("Could not copy join code");
    }
  };

  const handleJoinHousehold = async () => {
    const cleanId = joinIdInput.trim();
    if (!cleanId) {
      showError("Please enter a household join code");
      return;
    }

    try {
      setSettingsBusy(true);
      await joinHouseholdWithCode(cleanId);
      setJoinIdInput("");
      showSuccess("You joined a new household");
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not join the household. Please try again"));
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleGenerateNewCode = async () => {
    try {
      setSettingsBusy(true);
      if (!currentUser?.householdId) {
        await createHouseholdAndJoin({
          householdName: `${fullName || "My"} Household`,
        });
        showSuccess("Household created and joined");
      } else if (!isHouseholdAdmin) {
        showError("Only the household admin can generate a new join code");
      } else {
        await regenerateHouseholdJoinCode();
        showSuccess("Generated a new household join code");
      }
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not generate a new code. Please try again"));
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleLeaveHousehold = async () => {
    try {
      setSettingsBusy(true);
      await leaveHousehold();
      showSuccess("You are now outside the household");
    } catch (error) {
      showError(toUserFacingErrorMessage(error, "Could not leave the household. Please try again"));
    } finally {
      setSettingsBusy(false);
    }
  };

  return {
    household,
    isHouseholdAdmin,
    joinIdInput,
    setJoinIdInput,
    handleCopyId,
    handleJoinHousehold,
    handleGenerateNewCode,
    handleLeaveHousehold,
  };
}
