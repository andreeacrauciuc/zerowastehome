import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { deleteUser, updatePassword } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useHousehold } from "../../household/HouseholdContext";
import { useSettings } from "../../../context/SettingsContext";
import { usePushNotifications } from "../../../hooks/usePushNotifications";
import { auth, db } from "../../../services/firebase";
import { toUserFacingErrorMessage } from "../../../utils/errorMessages";
import { showError, showSuccess } from "../../../utils/toast";
import ProfilePanel from "./ProfilePanel";
import HouseholdPanel from "./HouseholdPanel";
import NotificationsPanel from "./NotificationsPanel";
import SecurityPanel from "./SecurityPanel";
import "../../../styles/features/settings/Settings.scss";

const MotionDiv = motion.div;

const MAX_PHOTO_BYTES = 220000;

const estimateBytes = (value) => new Blob([String(value || "")]).size;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image."));
    };
    image.src = url;
  });

const buildCompressedPhotoDataUrl = async (file) => {
  const image = await loadImage(file);
  const maxDimension = 512;
  const ratio = Math.min(
    maxDimension / image.width,
    maxDimension / image.height,
    1,
  );
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare image compression.");
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (estimateBytes(dataUrl) > MAX_PHOTO_BYTES && quality > 0.3) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (estimateBytes(dataUrl) > MAX_PHOTO_BYTES) {
    throw new Error(
      "Image is still too large after compression. Please use a smaller image.",
    );
  }

  return dataUrl;
};

function Settings({ impactHistory = [] }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const {
    createHouseholdAndJoin,
    household,
    isHouseholdAdmin,
    joinHouseholdWithCode,
    leaveHousehold,
    regenerateHouseholdJoinCode,
  } = useHousehold();
  const { userPreferences, saveUserPreferences } = useSettings();
  const { requestPermissionAndRegister } = usePushNotifications();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";
  const setActiveTab = (tab) => setSearchParams({ tab });
  const [isLoading, setIsLoading] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("EUR");

  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [notifyExpiryReminders, setNotifyExpiryReminders] = useState(true);
  const [notifyStockAlerts, setNotifyStockAlerts] = useState(true);
  const [notifySystemEvents, setNotifySystemEvents] = useState(true);
  const [silentHoursEnabled, setSilentHoursEnabled] = useState(false);
  const [silentHoursStart, setSilentHoursStart] = useState("22:00");
  const [silentHoursEnd, setSilentHoursEnd] = useState("07:00");

  const [joinIdInput, setJoinIdInput] = useState("");

  const [permission, setPermission] = useState(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const canDeleteAccount = useMemo(
    () => deleteConfirmText.trim().toUpperCase() === "DELETE",
    [deleteConfirmText],
  );

  const consumedHistory = useMemo(() => {
    const consumedStatuses = new Set(["eaten", "saved", "consumed"]);
    return (impactHistory || [])
      .filter((entry) =>
        consumedStatuses.has(String(entry?.status || "").toLowerCase()),
      )
      .sort((a, b) => {
        const aTime = Number(
          new Date(a?.actionDate || a?.createdAt || 0).getTime(),
        );
        const bTime = Number(
          new Date(b?.actionDate || b?.createdAt || 0).getTime(),
        );
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [impactHistory]);

  const patchCurrentUserCache = (changes) => {
    try {
      const raw = sessionStorage.getItem("mw-current-user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const nextCache = { ...parsed, ...changes };
      delete nextCache.photoDataUrl;
      sessionStorage.setItem(
        "mw-current-user",
        JSON.stringify(nextCache),
      );
    } catch {
      // Cache sync is non-critical.
    }
  };

  const updateUserDocument = async (changes) => {
    if (!currentUser?.uid) throw new Error("No authenticated user found.");
    await setDoc(doc(db, "users", currentUser.uid), changes, { merge: true });
  };

  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    setFullName(String(currentUser?.fullName || ""));
    setEmail(String(currentUser?.email || ""));
    setPhotoDataUrl(String(currentUser?.photoDataUrl || ""));

    setIsLoading(false);
  }, [currentUser?.uid, currentUser?.email, currentUser?.fullName, currentUser?.photoDataUrl]);

  useEffect(() => {
    setAlertsEnabled(Boolean(userPreferences?.alertsEnabled));
    setPreferredCurrency(String(userPreferences?.currency || "EUR"));
    setNotifyExpiryReminders(
      userPreferences?.notificationTypes?.expiryAlerts !== false,
    );
    setNotifyStockAlerts(
      userPreferences?.notificationTypes?.stockAlerts !== false,
    );
    setNotifySystemEvents(
      userPreferences?.notificationTypes?.systemEvents !== false,
    );
    setSilentHoursEnabled(Boolean(userPreferences?.silentHours?.enabled));
    setSilentHoursStart(String(userPreferences?.silentHours?.start || "22:00"));
    setSilentHoursEnd(String(userPreferences?.silentHours?.end || "07:00"));
  }, [userPreferences]);

  const updatePreferences = async (nextPreferences, successText) => {
    await saveUserPreferences(nextPreferences);
    if (successText) {
      showSuccess(successText);
    }
  };

  const handleSaveProfile = async () => {
    const safeName = fullName.trim();
    if (!safeName) {
      showError("Name is required.");
      return;
    }

    if (photoDataUrl && estimateBytes(photoDataUrl) > MAX_PHOTO_BYTES) {
      showError("Profile photo is too large. Please upload a smaller image.");
      return;
    }

    try {
      setSettingsBusy(true);
      await updateUserDocument({
        fullName: safeName,
        photoDataUrl,
      });
      patchCurrentUserCache({ fullName: safeName });
      
      await updatePreferences(
        { currency: preferredCurrency },
        "Profile and currency updated successfully."
      );
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not update your profile. Please try again.")
      );
    } finally {
      setSettingsBusy(false);
    }
  };


  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Please select an image file.");
      return;
    }

    buildCompressedPhotoDataUrl(file)
      .then((compressedDataUrl) => {
        setPhotoDataUrl(compressedDataUrl);
        showSuccess("Photo optimized and ready to save.");
      })
      .catch((error) => {
        showError(
          toUserFacingErrorMessage(error, "Could not process the profile image. Please try again.")
        );
      })
      .finally(() => {
        event.target.value = "";
      });
  };

  const handleToggleAlerts = async () => {
    if (!("Notification" in window)) {
      showError("This browser does not support notifications.");
      setPermission("unsupported");
      return;
    }

    const next = !alertsEnabled;

    if (next) {
      const perm = await requestPermissionAndRegister();
      setPermission(perm);
      if (perm !== "granted") {
        showError("Notification permission was not granted.");
        return;
      }
    }

    const previous = alertsEnabled;
    setAlertsEnabled(next);

    try {
      await updatePreferences({
        alertsEnabled: next,
        notificationTypes: {
          expiryAlerts: notifyExpiryReminders,
          stockAlerts: notifyStockAlerts,
          systemEvents: notifySystemEvents,
        },
        silentHours: {
          enabled: silentHoursEnabled,
          start: silentHoursStart,
          end: silentHoursEnd,
        },
      });
      showSuccess(`Alerts ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setAlertsEnabled(previous);
      showError(toUserFacingErrorMessage(error, "Could not update alerts. Please try again."));
    }
  };

  const handleToggleExpiryReminders = async () => {
    const next = !notifyExpiryReminders;
    const previous = notifyExpiryReminders;
    setNotifyExpiryReminders(next);

    try {
      await updatePreferences({
        alertsEnabled,
        notificationTypes: {
          expiryAlerts: next,
          stockAlerts: notifyStockAlerts,
          systemEvents: notifySystemEvents,
        },
        silentHours: {
          enabled: silentHoursEnabled,
          start: silentHoursStart,
          end: silentHoursEnd,
        },
      });
      showSuccess(`Expiry reminders ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setNotifyExpiryReminders(previous);
      showError(toUserFacingErrorMessage(error, "Could not update reminders. Please try again."));
    }
  };

  const handleToggleStockAlerts = async () => {
    const next = !notifyStockAlerts;
    const previous = notifyStockAlerts;
    setNotifyStockAlerts(next);

    try {
      await updatePreferences({
        alertsEnabled,
        notificationTypes: {
          expiryAlerts: notifyExpiryReminders,
          stockAlerts: next,
          systemEvents: notifySystemEvents,
        },
        silentHours: {
          enabled: silentHoursEnabled,
          start: silentHoursStart,
          end: silentHoursEnd,
        },
      });
      showSuccess(`Stock alerts ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setNotifyStockAlerts(previous);
      showError(
        toUserFacingErrorMessage(error, "Could not update stock alerts. Please try again.")
      );
    }
  };

  const handleToggleSystemEvents = async () => {
    const next = !notifySystemEvents;
    const previous = notifySystemEvents;
    setNotifySystemEvents(next);

    try {
      await updatePreferences({
        alertsEnabled,
        notificationTypes: {
          expiryAlerts: notifyExpiryReminders,
          stockAlerts: notifyStockAlerts,
          systemEvents: next,
        },
        silentHours: {
          enabled: silentHoursEnabled,
          start: silentHoursStart,
          end: silentHoursEnd,
        },
      });
      showSuccess(`System event alerts ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setNotifySystemEvents(previous);
      showError(
        `Could not update system event alerts. ${error?.message || ""}`,
      );
    }
  };

  const handleSilentHoursToggle = async () => {
    const next = !silentHoursEnabled;
    const previous = silentHoursEnabled;
    setSilentHoursEnabled(next);

    try {
      await updatePreferences({
        alertsEnabled,
        notificationTypes: {
          expiryAlerts: notifyExpiryReminders,
          stockAlerts: notifyStockAlerts,
          systemEvents: notifySystemEvents,
        },
        silentHours: {
          enabled: next,
          start: silentHoursStart,
          end: silentHoursEnd,
        },
      });
      showSuccess(`Silent hours ${next ? "enabled" : "disabled"}.`);
    } catch (error) {
      setSilentHoursEnabled(previous);
      showError(
        toUserFacingErrorMessage(error, "Could not update silent hours. Please try again.")
      );
    }
  };

  const handleSaveSilentHoursRange = async () => {
    if (!silentHoursStart || !silentHoursEnd) {
      showError("Please select both start and end times.");
      return;
    }

    try {
      await updatePreferences(
        {
          alertsEnabled,
          notificationTypes: {
            expiryAlerts: notifyExpiryReminders,
            stockAlerts: notifyStockAlerts,
            systemEvents: notifySystemEvents,
          },
          silentHours: {
            enabled: silentHoursEnabled,
            start: silentHoursStart,
            end: silentHoursEnd,
          },
        },
        "Silent hours updated.",
      );
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not update silent hours. Please try again.")
      );
    }
  };

  const handleCopyId = async () => {
    if (!household?.joinCode) {
      showError("No join code available. Create or join a household first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(household.joinCode);
      showSuccess("Join code copied.");
    } catch {
      showError("Could not copy join code.");
    }
  };

  const handleJoinHousehold = async () => {
    const cleanId = joinIdInput.trim();
    if (!cleanId) {
      showError("Please enter a household join code.");
      return;
    }

    try {
      setSettingsBusy(true);
      await joinHouseholdWithCode(cleanId);
      setJoinIdInput("");
      showSuccess("You joined a new household.");
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not join the household. Please try again.")
      );
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
        showSuccess("Household created and joined.");
      } else if (!isHouseholdAdmin) {
        showError("Only the household admin can generate a new join code.");
      } else {
        await regenerateHouseholdJoinCode();
        showSuccess("Generated a new household join code.");
      }
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not generate a new code. Please try again.")
      );
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleLeaveHousehold = async () => {
    try {
      setSettingsBusy(true);
      await leaveHousehold();
      showSuccess("You are now outside the household.");
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not leave the household. Please try again.")
      );
    } finally {
      setSettingsBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match. Please re-enter them.");
      return;
    }

    if (!auth.currentUser) {
      showError("No authenticated user found.");
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordModalOpen(false);
      showSuccess("Password updated.");
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not update your password. Please try again.")
      );
    }
  };

  const OWNED_DATA_COLLECTIONS = ["inventory", "shopping", "impact", "priceHistory"];
  const FIRESTORE_BATCH_LIMIT = 450;

  const deleteOwnedDocuments = async (userId) => {
    let hadFailure = false;

    for (const collectionName of OWNED_DATA_COLLECTIONS) {
      try {
        const snap = await getDocs(
          query(collection(db, collectionName), where("ownerId", "==", userId))
        );
        for (let i = 0; i < snap.docs.length; i += FIRESTORE_BATCH_LIMIT) {
          const chunk = snap.docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
          const batch = writeBatch(db);
          chunk.forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
        }
      } catch (error) {
        hadFailure = true;
        console.error(`Account deletion: failed to clean up "${collectionName}".`, error);
      }
    }

    return { hadFailure };
  };

  const handleDeleteAccount = async () => {
    if (!canDeleteAccount || !currentUser?.uid || !auth.currentUser || isDeletingAccount) return;

    const userId = currentUser.uid;
    const authUser = auth.currentUser;

    try {
      setSettingsBusy(true);
      setIsDeletingAccount(true);

      if (currentUser?.householdId) {
        await leaveHousehold();
      }

      const { hadFailure } = await deleteOwnedDocuments(userId);

      try {
        await deleteDoc(doc(db, "users", userId));
      } catch (error) {
        console.error("Account deletion: failed to delete user profile document.", error);
      }

      await deleteUser(authUser);
      try {
        await logout();
      } catch {
        // Session already invalidated by deleteUser.
      }

      showSuccess(
        hadFailure
          ? "Account deleted. Some data could not be removed and will be cleaned up automatically."
          : "Account deleted successfully."
      );
      navigate("/signin", { replace: true });
    } catch (error) {
      showError(
        toUserFacingErrorMessage(error, "Could not delete your account. Please try again.")
      );
    } finally {
      setSettingsBusy(false);
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="settings-page settings-shell">
        <div className="settings-loading">Loading settings...</div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "household", label: "Household" },
    { id: "notifications", label: "Notifications" },
    { id: "security", label: "Account security" },
  ];

  return (
    <div className="settings-page settings-shell">
      <div className="settings-hero">
        <h1 className="settings-title page-title"><span>Settings</span></h1>
        <p className="settings-subtitle">
          Control your profile, household, notifications, and account security
        </p>
      </div>

      <div className="settings-layout">
        <aside
          className="settings-tabs"
          role="tablist"
          aria-label="Settings tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <section className="settings-panel" role="tabpanel" aria-live="polite">
          {activeTab === "profile" && (
            <ProfilePanel
              photoDataUrl={photoDataUrl}
              fullName={fullName}
              setFullName={setFullName}
              email={email}
              handlePhotoUpload={handlePhotoUpload}
              preferredCurrency={preferredCurrency}
              setPreferredCurrency={setPreferredCurrency}
              settingsBusy={settingsBusy}
              handleSaveProfile={handleSaveProfile}
            />
          )}
          {activeTab === "household" && (
            <HouseholdPanel
              currentUser={currentUser}
              canManageHousehold={Boolean(isHouseholdAdmin)}
              joinIdInput={joinIdInput}
              setJoinIdInput={setJoinIdInput}
              settingsBusy={settingsBusy}
              handleJoinHousehold={handleJoinHousehold}
              handleGenerateNewCode={handleGenerateNewCode}
              household={household}
              handleCopyId={handleCopyId}
              setLeaveConfirmOpen={setLeaveConfirmOpen}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsPanel
              alerts={{
                permission,
                enabled: alertsEnabled,
                onToggle: handleToggleAlerts,
              }}
              notificationTypes={{
                expiry: {
                  value: notifyExpiryReminders,
                  onToggle: handleToggleExpiryReminders,
                },
                stock: {
                  value: notifyStockAlerts,
                  onToggle: handleToggleStockAlerts,
                },
                system: {
                  value: notifySystemEvents,
                  onToggle: handleToggleSystemEvents,
                },
              }}
              silentHours={{
                enabled: silentHoursEnabled,
                onToggle: handleSilentHoursToggle,
                start: silentHoursStart,
                end: silentHoursEnd,
                onStartChange: setSilentHoursStart,
                onEndChange: setSilentHoursEnd,
                onSave: handleSaveSilentHoursRange,
              }}
              activity={{
                consumedHistory,
              }}
            />
          )}
          {activeTab === "security" && (
            <SecurityPanel
              setIsPasswordModalOpen={setIsPasswordModalOpen}
              setDeleteConfirmOpen={setDeleteConfirmOpen}
              onLogout={async () => {
                try {
                  await logout();
                } catch {
                  showError("Could not sign out. Please try again.");
                }
              }}
            />
          )}
        </section>
      </div>

      <AnimatePresence>
        {isPasswordModalOpen && (
          <MotionDiv
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setIsPasswordModalOpen(false)}
          >
            <MotionDiv
              className="modal-card"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
            >
            <h3>Change password</h3>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleChangePassword}
              >
                Update
              </button>
            </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmOpen && (
          <MotionDiv
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => { if (!isDeletingAccount) setDeleteConfirmOpen(false); }}
          >
            <MotionDiv
              className="modal-card"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
            >
            <h3>Delete Account</h3>
            <p style={{ color: "#dc2626", fontWeight: 600, marginBottom: "0.5rem" }}>
              This action is permanent and cannot be undone.
            </p>
            <ul style={{ fontSize: "0.85rem", color: "var(--slate-soft, #64748b)", marginBottom: "1rem", paddingLeft: "1.2rem", lineHeight: 1.7 }}>
              <li>All your inventory items will be deleted</li>
              <li>Your entire impact history and savings data will be lost</li>
              <li>You will be removed from your household</li>
              <li>Your account settings and preferences will be erased</li>
            </ul>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder="Type DELETE"
            />

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeletingAccount}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                disabled={!canDeleteAccount || isDeletingAccount}
                aria-busy={isDeletingAccount}
                onClick={handleDeleteAccount}
              >
                {isDeletingAccount ? "Deleting account…" : "Delete permanently"}
              </button>
            </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {leaveConfirmOpen && (
          <MotionDiv
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setLeaveConfirmOpen(false)}
          >
            <MotionDiv
              className="modal-card"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
            >
            <h3>Leave household</h3>
            <p style={{ margin: 0, color: "#4a6b62", lineHeight: 1.6, fontSize: "0.92rem" }}>
              You will lose access to all shared inventory, shopping lists, and impact data for this household. Your personal account stays active and you can join or create a new household at any time from Settings.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setLeaveConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={async () => {
                  await handleLeaveHousehold();
                  setLeaveConfirmOpen(false);
                }}
              >
                Confirm leave
              </button>
            </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Settings;
