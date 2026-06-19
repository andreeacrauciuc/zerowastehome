import { useState } from "react";
import PropTypes from "prop-types";
import { Users } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";

function HouseholdPanel({
  currentUser,
  canManageHousehold,
  joinIdInput,
  setJoinIdInput,
  settingsBusy,
  handleJoinHousehold,
  handleGenerateNewCode,
  household,
  handleCopyId,
  setLeaveConfirmOpen,
}) {
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const isInHousehold = Boolean(currentUser?.householdId);

  if (!isInHousehold) {
    return (
      <div className="settings-panel-content household-mode-card">
        <h2>Household - Get Started</h2>
        <p className="panel-subtitle">
          Join an existing household or create a new one to collaborate
        </p>

        <div className="get-started-card">
          <label>
            Join an existing household using a code
            <input
              type="text"
              value={joinIdInput}
              onChange={(event) => setJoinIdInput(event.target.value)}
              placeholder="Enter household join code"
            />
          </label>
          <button
            type="button"
            className="primary-btn"
            disabled={settingsBusy}
            onClick={handleJoinHousehold}
          >
            Join household
          </button>
        </div>

        <div className="get-started-card">
          <h3>Create your own household</h3>
          <p className="muted">You will become the household admin</p>
          <button
            type="button"
            className="secondary-btn"
            disabled={settingsBusy}
            onClick={handleGenerateNewCode}
          >
            Create a new household
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-panel-content household-mode-card">
      <h2>Household management</h2>
      <p className="panel-subtitle">
        Manage your current household settings and membership
      </p>

      <div className="household-management-card">
        <h3>{household?.name || "My household"}</h3>
        <div className="members-section">
          <h3>Members</h3>
          {!household?.members?.length ? (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">
                <Users size={32} strokeWidth={1.5} />
              </div>
              <p>No members found yet</p>
              <small>
                Share your join code to invite people into your home
              </small>
            </div>
          ) : (
            <ul className="members-list">
              {household.members.map((member) => (
                <li key={member.uid || member.email}>
                  <div className="member-main">
                    <UserAvatar
                      className="member-avatar"
                      user={{
                        photoURL: member.photoURL || member.photoDataUrl,
                        displayName: member.displayName || member.fullName,
                      }}
                      size={40}
                      ariaLabel={
                        member.fullName ||
                        member.displayName ||
                        "Household member"
                      }
                    />
                    <div className="member-meta">
                      <strong>
                        {member.fullName ||
                          member.displayName ||
                          "Unnamed member"}
                      </strong>
                      <small>
                        {member.email || "No email"}
                        {member.role ? ` \u2022 ${member.role}` : ""}
                      </small>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="household-management-card">
        <div className="join-code-section">
          <span>Join code</span>
          {household?.joinCode ? (
            <button
              type="button"
              className="code-chip"
              onClick={handleCopyId}
            >
              {household.joinCode}
            </button>
          ) : (
            <span className="muted">No household join code yet</span>
          )}
        </div>

        <div className="action-row">
          <button
            type="button"
            className="secondary-btn"
            disabled={settingsBusy || !canManageHousehold}
            onClick={() => setShowRegenerateConfirm(true)}
          >
            Generate new code
          </button>
          <button
            type="button"
            className="danger-btn"
            disabled={settingsBusy}
            onClick={() => setLeaveConfirmOpen(true)}
          >
            Leave household
          </button>
        </div>

        {showRegenerateConfirm && (
          <div style={{
            marginTop: "0.75rem",
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.22)",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "#7f1d1d", fontWeight: 600, lineHeight: 1.45 }}>
              This will invalidate the current join code. Anyone trying to join with the old code will no longer be able to. Generate a new one?
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                style={{
                  padding: "0.38rem 0.85rem",
                  borderRadius: "9999px",
                  border: "1px solid rgba(239,68,68,0.22)",
                  background: "transparent",
                  color: "#7f1d1d",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRegenerateConfirm(false);
                  handleGenerateNewCode();
                }}
                style={{
                  padding: "0.38rem 0.85rem",
                  borderRadius: "9999px",
                  border: "none",
                  background: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                Generate new code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

HouseholdPanel.propTypes = {
  currentUser: PropTypes.object.isRequired,
  canManageHousehold: PropTypes.bool.isRequired,
  joinIdInput: PropTypes.string.isRequired,
  setJoinIdInput: PropTypes.func.isRequired,
  settingsBusy: PropTypes.bool.isRequired,
  handleJoinHousehold: PropTypes.func.isRequired,
  handleGenerateNewCode: PropTypes.func.isRequired,
  household: PropTypes.object,
  handleCopyId: PropTypes.func.isRequired,
  setLeaveConfirmOpen: PropTypes.func.isRequired,
};

export default HouseholdPanel;