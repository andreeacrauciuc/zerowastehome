import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { useProfileSettings } from "../hooks/useProfileSettings";
import { useNotificationSettings } from "../hooks/useNotificationSettings";
import { useHouseholdSettings } from "../hooks/useHouseholdSettings";
import { useAccountSecurity } from "../hooks/useAccountSecurity";
import {
  CONSUMED_HISTORY_LIMIT,
  CONSUMED_STATUSES,
  SETTINGS_TABS,
} from "../constants";
import ProfilePanel from "./ProfilePanel";
import HouseholdPanel from "./HouseholdPanel";
import NotificationsPanel from "./NotificationsPanel";
import SecurityPanel from "./SecurityPanel";
import "./Settings.scss";

const MotionDiv = motion.div;

function Settings({ impactHistory = [] }) {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [settingsBusy, setSettingsBusy] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const profile = useProfileSettings({ setSettingsBusy });
  const notifications = useNotificationSettings();
  const householdSettings = useHouseholdSettings({
    setSettingsBusy,
    fullName: profile.fullName,
  });
  const security = useAccountSecurity({ setSettingsBusy });

  const consumedHistory = useMemo(
    () =>
      (impactHistory || [])
        .filter((entry) =>
          CONSUMED_STATUSES.has(String(entry?.status || "").toLowerCase()),
        )
        .sort((a, b) => {
          const aTime = Number(new Date(a?.actionDate || a?.createdAt || 0).getTime());
          const bTime = Number(new Date(b?.actionDate || b?.createdAt || 0).getTime());
          return bTime - aTime;
        })
        .slice(0, CONSUMED_HISTORY_LIMIT),
    [impactHistory],
  );

  return (
    <div className="settings-page settings-shell">
      <div className="settings-hero">
        <h1 className="settings-title page-title"><span>Settings</span></h1>
        <p className="settings-subtitle">
          Control your profile, household, notifications, and account security
        </p>
      </div>

      <div className="settings-layout">
        <aside className="settings-tabs" role="tablist" aria-label="Settings tabs">
          {SETTINGS_TABS.map((tab) => (
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
              photoDataUrl={profile.photoDataUrl}
              fullName={profile.fullName}
              setFullName={profile.setFullName}
              email={profile.email}
              handlePhotoUpload={profile.handlePhotoUpload}
              preferredCurrency={profile.preferredCurrency}
              setPreferredCurrency={profile.setPreferredCurrency}
              settingsBusy={settingsBusy}
              handleSaveProfile={profile.handleSaveProfile}
            />
          )}
          {activeTab === "household" && (
            <HouseholdPanel
              currentUser={currentUser}
              canManageHousehold={Boolean(householdSettings.isHouseholdAdmin)}
              joinIdInput={householdSettings.joinIdInput}
              setJoinIdInput={householdSettings.setJoinIdInput}
              settingsBusy={settingsBusy}
              handleJoinHousehold={householdSettings.handleJoinHousehold}
              handleGenerateNewCode={householdSettings.handleGenerateNewCode}
              household={householdSettings.household}
              handleCopyId={householdSettings.handleCopyId}
              setLeaveConfirmOpen={setLeaveConfirmOpen}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsPanel
              alerts={{
                permission: notifications.permission,
                enabled: notifications.alertsEnabled,
                onToggle: notifications.handleToggleAlerts,
              }}
              notificationTypes={{
                expiry: {
                  value: notifications.notifyExpiryReminders,
                  onToggle: notifications.handleToggleExpiryReminders,
                },
                stock: {
                  value: notifications.notifyStockAlerts,
                  onToggle: notifications.handleToggleStockAlerts,
                },
                system: {
                  value: notifications.notifySystemEvents,
                  onToggle: notifications.handleToggleSystemEvents,
                },
              }}
              silentHours={{
                enabled: notifications.silentHoursEnabled,
                onToggle: notifications.handleSilentHoursToggle,
                start: notifications.silentHoursStart,
                end: notifications.silentHoursEnd,
                onStartChange: notifications.setSilentHoursStart,
                onEndChange: notifications.setSilentHoursEnd,
                onSave: notifications.handleSaveSilentHoursRange,
              }}
              activity={{
                consumedHistory,
              }}
            />
          )}
          {activeTab === "security" && (
            <SecurityPanel
              setIsPasswordModalOpen={security.setIsPasswordModalOpen}
              setDeleteConfirmOpen={security.setDeleteConfirmOpen}
              onLogout={security.handleLogout}
            />
          )}
        </section>
      </div>

      <AnimatePresence>
        {security.isPasswordModalOpen && (
          <MotionDiv
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => security.setIsPasswordModalOpen(false)}
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
                  value={security.newPassword}
                  onChange={(event) => security.setNewPassword(event.target.value)}
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={security.confirmPassword}
                  onChange={(event) => security.setConfirmPassword(event.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => security.setIsPasswordModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={security.handleChangePassword}
                >
                  Update
                </button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {security.deleteConfirmOpen && (
          <MotionDiv
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => { if (!security.isDeletingAccount) security.setDeleteConfirmOpen(false); }}
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
              <p className="modal-danger-lead">
                This action is permanent and cannot be undone.
              </p>
              <ul className="modal-danger-list">
                <li>All your inventory items will be deleted</li>
                <li>Your entire impact history and savings data will be lost</li>
                <li>You will be removed from your household</li>
                <li>Your account settings and preferences will be erased</li>
              </ul>
              <p className="modal-confirm-prompt">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={security.deleteConfirmText}
                onChange={(event) => security.setDeleteConfirmText(event.target.value)}
                placeholder="Type DELETE"
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => security.setDeleteConfirmOpen(false)}
                  disabled={security.isDeletingAccount}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger-btn"
                  disabled={!security.canDeleteAccount || security.isDeletingAccount}
                  aria-busy={security.isDeletingAccount}
                  onClick={security.handleDeleteAccount}
                >
                  {security.isDeletingAccount ? "Deleting account…" : "Delete permanently"}
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
              <p className="modal-leave-text">
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
                    await householdSettings.handleLeaveHousehold();
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
