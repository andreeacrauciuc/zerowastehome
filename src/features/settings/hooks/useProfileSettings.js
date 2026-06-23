import { useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import { showError, showSuccess } from "../../../utils/toast";
import {
  MAX_PHOTO_BYTES,
  buildCompressedPhotoDataUrl,
  estimateBytes,
} from "../utils/photo";
import { patchCurrentUserCache, updateUserDocument } from "../utils/persistence";
import { DEFAULT_CURRENCY } from "../constants";

export function useProfileSettings({ setSettingsBusy }) {
  const { currentUser } = useAuth();
  const { userPreferences, saveUserPreferences } = useSettings();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setFullName(String(currentUser?.fullName || ""));
    setEmail(String(currentUser?.email || ""));
    setPhotoDataUrl(String(currentUser?.photoDataUrl || ""));
  }, [
    currentUser?.uid,
    currentUser?.email,
    currentUser?.fullName,
    currentUser?.photoDataUrl,
  ]);

  useEffect(() => {
    setPreferredCurrency(String(userPreferences?.currency || DEFAULT_CURRENCY));
  }, [userPreferences]);

  const handleSaveProfile = async () => {
    const safeName = fullName.trim();
    if (!safeName) {
      showError("Name is required");
      return;
    }

    if (photoDataUrl && estimateBytes(photoDataUrl) > MAX_PHOTO_BYTES) {
      showError("Profile photo is too large. Please upload a smaller image");
      return;
    }

    try {
      setSettingsBusy(true);
      await updateUserDocument(currentUser?.uid, {
        fullName: safeName,
        photoDataUrl,
      });
      patchCurrentUserCache({ fullName: safeName });

      await saveUserPreferences({ currency: preferredCurrency });
      showSuccess("Profile and currency updated successfully");
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not update your profile. Please try again"),
      );
    } finally {
      setSettingsBusy(false);
    }
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Please select an image file");
      return;
    }

    buildCompressedPhotoDataUrl(file)
      .then((compressedDataUrl) => {
        setPhotoDataUrl(compressedDataUrl);
        showSuccess("Photo optimized and ready to save");
      })
      .catch((error) => {
        showError(
          toUserFacingErrorMessage(error, "Could not process the profile image. Please try again"),
        );
      })
      .finally(() => {
        event.target.value = "";
      });
  };

  return {
    fullName,
    setFullName,
    email,
    photoDataUrl,
    preferredCurrency,
    setPreferredCurrency,
    handleSaveProfile,
    handlePhotoUpload,
  };
}
