import PropTypes from "prop-types";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";

function NotificationsPanel({ alerts, notificationTypes, silentHours, activity }) {
  return (
    <div className="settings-panel-content">
      <h2>Notifications</h2>
      <p className="panel-subtitle">
        Fine tune alerts so you only see what matters
      </p>

      <div className="toggle-main-row">
        <ToggleSwitch
          label="Alerts"
          description={`Permission: ${alerts.permission}`}
          checked={alerts.enabled}
          onChange={alerts.onToggle}
        />
      </div>

      <div className="check-item">
        <ToggleSwitch
          label="Expiry reminders"
          checked={notificationTypes.expiry.value}
          onChange={notificationTypes.expiry.onToggle}
        />
      </div>

      <div className="check-item">
        <ToggleSwitch
          label="Stock alerts"
          checked={notificationTypes.stock.value}
          onChange={notificationTypes.stock.onToggle}
        />
      </div>

      <div className="check-item">
        <ToggleSwitch
          label="System events"
          checked={notificationTypes.system.value}
          onChange={notificationTypes.system.onToggle}
        />
      </div>

      <div className="silent-hours-card">
        <div className="toggle-main-row">
          <ToggleSwitch
            label="Silent hours"
            description="Suppress push notifications during quiet time"
            checked={silentHours.enabled}
            onChange={silentHours.onToggle}
          />
        </div>

        <div className="silent-hours-range">
          <label>
            Start time
            <input
              type="time"
              value={silentHours.start}
              onChange={(event) => silentHours.onStartChange(event.target.value)}
            />
          </label>
          <label>
            End time
            <input
              type="time"
              value={silentHours.end}
              onChange={(event) => silentHours.onEndChange(event.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={silentHours.onSave}
        >
          Save silent hours
        </button>
      </div>

      <div className="activity-history-card">
        <h3>Activity history</h3>
        <p className="muted">Last 5 consumed items</p>

        {activity.consumedHistory.length === 0 ? (
          <p className="muted">No consumed activity yet</p>
        ) : (
          <ul className="activity-history-list">
            {activity.consumedHistory.map((entry) => (
              <li
                key={
                  entry.id ||
                  `${entry.name}-${entry.actionDate || entry.createdAt}`
                }
              >
                <strong>{entry.name || "Unnamed item"}</strong>
                <small>
                  {new Date(
                    entry.actionDate || entry.createdAt || 0,
                  ).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

NotificationsPanel.propTypes = {
  alerts: PropTypes.shape({
    permission: PropTypes.string.isRequired,
    enabled: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
  }).isRequired,
  notificationTypes: PropTypes.shape({
    expiry: PropTypes.shape({
      value: PropTypes.bool.isRequired,
      onToggle: PropTypes.func.isRequired,
    }).isRequired,
    stock: PropTypes.shape({
      value: PropTypes.bool.isRequired,
      onToggle: PropTypes.func.isRequired,
    }).isRequired,
    system: PropTypes.shape({
      value: PropTypes.bool.isRequired,
      onToggle: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
  silentHours: PropTypes.shape({
    enabled: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    start: PropTypes.string.isRequired,
    end: PropTypes.string.isRequired,
    onStartChange: PropTypes.func.isRequired,
    onEndChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
  }).isRequired,
  activity: PropTypes.shape({
    consumedHistory: PropTypes.array.isRequired,
  }).isRequired,
};

export default NotificationsPanel;
