import { useState } from "react";
import PropTypes from "prop-types";
import { LogOut, KeyRound, ShieldAlert } from "lucide-react";
import LogoutConfirm from "../../../components/LogoutConfirm";

function SecurityPanel({ setIsPasswordModalOpen, setDeleteConfirmOpen, onLogout }) {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  return (
    <div className="settings-panel-content security-panel">
      <header className="security-panel__header">
        <h2>Account security</h2>
        <p className="panel-subtitle">
          Protect your account and manage high-risk actions
        </p>
      </header>

      <section className="settings-card">
        <div className="settings-card__head">
          <h3 className="settings-card__title">
            <KeyRound size={16} aria-hidden="true" />
            <span>Password</span>
          </h3>
          <p className="settings-card__subtitle">
            Update the password used to sign in
          </p>
        </div>

        <div className="settings-card__body">
          <div className="settings-card__actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setIsPasswordModalOpen(true)}
            >
              Change password
            </button>
          </div>
        </div>
      </section>

      <section className="settings-card" aria-label="Session">
        <div className="settings-card__head">
          <h3 className="settings-card__title">
            <LogOut size={16} aria-hidden="true" />
            <span>Session</span>
          </h3>
          <p className="settings-card__subtitle">
            Sign out of your account on this device
          </p>
        </div>

        <div className="settings-card__body">
          <div className="settings-card__actions">
            <button
              type="button"
              className="secondary-btn logout-btn"
              onClick={() => setIsLogoutOpen(true)}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </section>

      <section
        className="settings-card settings-card--danger"
        aria-label="Danger zone"
      >
        <div className="settings-card__head">
          <h3 className="settings-card__title settings-card__title--danger">
            <ShieldAlert size={16} aria-hidden="true" />
            <span>Danger zone</span>
          </h3>
          <p className="settings-card__subtitle">
            Permanently delete your account and all associated data
          </p>
        </div>

        <div className="settings-card__body">
          <div className="settings-card__actions">
            <button
              type="button"
              className="danger-btn"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete account
            </button>
          </div>
        </div>
      </section>

      <LogoutConfirm
        isOpen={isLogoutOpen}
        onCancel={() => setIsLogoutOpen(false)}
        onConfirm={async () => {
          setIsLogoutOpen(false);
          await onLogout();
        }}
      />
    </div>
  );
}

SecurityPanel.propTypes = {
  setIsPasswordModalOpen: PropTypes.func.isRequired,
  setDeleteConfirmOpen: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default SecurityPanel;
