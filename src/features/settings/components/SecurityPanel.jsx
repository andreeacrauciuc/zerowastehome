import PropTypes from "prop-types";
import { LogOut } from "lucide-react";

function SecurityPanel({ setIsPasswordModalOpen, setDeleteConfirmOpen, onLogout }) {
  return (
    <div className="settings-panel-content">
      <h2>Account security</h2>
      <p className="panel-subtitle">
        Protect your account and manage high-risk actions
      </p>

      <div className="security-actions">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => setIsPasswordModalOpen(true)}
        >
          Change password
        </button>
      </div>

      {/* Logout lives here as the durable, always-reachable sign-out point so it
          stays accessible regardless of mobile navigation (e.g. a bottom dock).
          Visually separated from account security above and the danger zone
          below. */}
      <section className="settings-section settings-section--logout" aria-label="Session">
        <p className="settings-section-label">Session</p>
        <div className="security-actions">
          <button
            type="button"
            className="secondary-btn logout-btn"
            onClick={onLogout}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </section>

      <section className="settings-section settings-section--danger" aria-label="Danger zone">
        <p className="settings-section-label settings-section-label--danger">
          Danger zone
        </p>
        <div className="security-actions">
          <button
            type="button"
            className="danger-btn"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            Delete account
          </button>
        </div>
      </section>
    </div>
  );
}

SecurityPanel.propTypes = {
  setIsPasswordModalOpen: PropTypes.func.isRequired,
  setDeleteConfirmOpen: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default SecurityPanel;
