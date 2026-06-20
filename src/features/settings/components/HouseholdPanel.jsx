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
      <div className="settings-panel-content household-panel">
        <header className="household-panel__header">
          <h2>Household</h2>
          <p className="panel-subtitle">
            Join an existing household or create a new one to collaborate
          </p>
        </header>

        <section className="settings-card">
          <div className="settings-card__head">
            <h3 className="settings-card__title">Join a household</h3>
            <p className="settings-card__subtitle">
              Enter a code shared by an existing member
            </p>
          </div>

          <div className="settings-card__body">
            <label className="settings-field">
              <span className="settings-field__label">Household join code</span>
              <input
                type="text"
                value={joinIdInput}
                onChange={(event) => setJoinIdInput(event.target.value)}
                placeholder="Enter household join code"
              />
            </label>
            <div className="settings-card__actions">
              <button
                type="button"
                className="primary-btn"
                disabled={settingsBusy}
                onClick={handleJoinHousehold}
              >
                Join household
              </button>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__head">
            <h3 className="settings-card__title">Create your own household</h3>
            <p className="settings-card__subtitle">
              You will become the household admin
            </p>
          </div>

          <div className="settings-card__body">
            <div className="settings-card__actions">
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
        </section>
      </div>
    );
  }

  return (
    <div className="settings-panel-content household-panel">
      <header className="household-panel__header">
        <h2>Household management</h2>
        <p className="panel-subtitle">
          Manage your current household settings and membership
        </p>
      </header>

      <section className="settings-card">
        <div className="settings-card__head">
          <h3 className="settings-card__title">
            {household?.name || "My household"}
          </h3>
          <p className="settings-card__subtitle">Members</p>
        </div>

        <div className="settings-card__body">
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
                        {member.role ? ` • ${member.role}` : ""}
                      </small>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__head">
          <h3 className="settings-card__title">Invite & membership</h3>
          <p className="settings-card__subtitle">
            Share your code or manage your place in this household
          </p>
        </div>

        <div className="settings-card__body">
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

          <hr className="settings-divider" />

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
            <div className="regenerate-confirm">
              <p className="regenerate-confirm-text">
                This will invalidate the current join code. Anyone trying to join with the old code will no longer be able to. Generate a new one?
              </p>
              <div className="regenerate-confirm-actions">
                <button
                  type="button"
                  className="regenerate-confirm-cancel"
                  onClick={() => setShowRegenerateConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="regenerate-confirm-submit"
                  onClick={() => {
                    setShowRegenerateConfirm(false);
                    handleGenerateNewCode();
                  }}
                >
                  Generate new code
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
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
