import PropTypes from "prop-types";
import UserAvatar from "../../../components/ui/UserAvatar";
import CurrencySelector from "./CurrencySelector";

function ProfilePanel({
  photoDataUrl,
  fullName,
  setFullName,
  email,
  handlePhotoUpload,
  preferredCurrency,
  setPreferredCurrency,
  settingsBusy,
  handleSaveProfile,
}) {
  return (
    <div className="settings-panel-content profile-panel">
      <header className="profile-panel__header">
        <h2>Profile</h2>
        <p className="panel-subtitle">
          Manage your account identity and profile picture
        </p>
      </header>

      <section className="settings-card">
        <div className="settings-card__head">
          <h3 className="settings-card__title">Profile photo</h3>
          <p className="settings-card__subtitle">
            This image represents you across your household
          </p>
        </div>

        <div className="settings-card__body">
          <div className="profile-block">
            <UserAvatar
              className="avatar-preview"
              user={{
                photoURL: photoDataUrl,
                displayName: fullName,
              }}
              size={92}
              ariaLabel="Profile avatar preview"
            />
            <div className="profile-block__info">
              <label className="upload-btn">
                Upload photo
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
              </label>
              <p className="profile-block__hint">JPG or PNG, square works best</p>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__head">
          <h3 className="settings-card__title">Account details</h3>
          <p className="settings-card__subtitle">
            Update your name and preferred currency
          </p>
        </div>

        <div className="settings-card__body">
          <div className="settings-form-grid">
            <label className="settings-field">
              <span className="settings-field__label">Name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Email</span>
              <input type="email" value={email} disabled />
            </label>
          </div>

          <CurrencySelector
            currency={preferredCurrency}
            onCurrencyChange={setPreferredCurrency}
            disabled={settingsBusy}
          />

          <div className="settings-card__actions">
            <button
              type="button"
              className="settings-save-btn"
              disabled={settingsBusy}
              onClick={handleSaveProfile}
            >
              {settingsBusy ? "Saving..." : "Save profile and currency"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

ProfilePanel.propTypes = {
  photoDataUrl: PropTypes.string.isRequired,
  fullName: PropTypes.string.isRequired,
  setFullName: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  handlePhotoUpload: PropTypes.func.isRequired,
  preferredCurrency: PropTypes.string.isRequired,
  setPreferredCurrency: PropTypes.func.isRequired,
  settingsBusy: PropTypes.bool.isRequired,
  handleSaveProfile: PropTypes.func.isRequired,
};

export default ProfilePanel;
