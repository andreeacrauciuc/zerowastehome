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
    <div className="settings-panel-content">
      <h2>Profile</h2>
      <p className="panel-subtitle">
        Manage your account identity and profile picture
      </p>

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
        <label className="upload-btn">
          Upload photo
          <input type="file" accept="image/*" onChange={handlePhotoUpload} />
        </label>
      </div>

      <div className="settings-form-grid">
        <label>
          Name
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
        <label>
          Email
          <input type="email" value={email} disabled />
        </label>
      </div>

      <CurrencySelector
        currency={preferredCurrency}
        onCurrencyChange={setPreferredCurrency}
        disabled={settingsBusy}
      />

      <button
        type="button"
        className="settings-save-btn"
        disabled={settingsBusy}
        onClick={handleSaveProfile}
      >
        {settingsBusy ? "Saving..." : "Save profile and currency"}
      </button>
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
