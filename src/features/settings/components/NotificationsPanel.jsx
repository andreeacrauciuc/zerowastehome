import PropTypes from "prop-types";
import ToggleSwitch from "../../../components/ui/ToggleSwitch";

function NotificationsPanel({ alerts, notificationTypes, silentHours, activity }) {
  return (
    <div className="settings-panel-content notifications-panel">
      <header className="notifications-panel__header">
        <h2>Notifications</h2>
        <p className="panel-subtitle">
          Fine tune alerts so you only see what matters
        </p>
      </header>

      <section className="settings-card">
        <div className="settings-card__head">
          <h3 className="settings-card__title">Alerts</h3>
          <p className="settings-card__subtitle">
            Choose which updates reach you
          </p>
        </div>

        <div className="settings-card__body">
          <div className="settings-row">
            <ToggleSwitch
              label="Alerts"
              description={`Permission: ${alerts.permission}`}
              checked={alerts.enabled}
              onChange={alerts.onToggle}
            />
          </div>

          <hr className="settings-divider" />

          <div className="settings-row">
            <ToggleSwitch
              label="Expiry reminders"
              checked={notificationTypes.expiry.value}
              onChange={notificationTypes.expiry.onToggle}
            />
          </div>

          <div className="settings-row">
            <ToggleSwitch
              label="Stock alerts"
              checked={notificationTypes.stock.value}
              onChange={notificationTypes.stock.onToggle}
            />
          </div>

          <div className="settings-row">
            <ToggleSwitch
              label="System events"
              checked={notificationTypes.system.value}
              onChange={notificationTypes.system.onToggle}
            />
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__head">
          <h3 className="settings-card__title">Silent hours</h3>
          <p className="settings-card__subtitle">
            Suppress push notifications during quiet time
          </p>
        </div>

        <div className="settings-card__body">
          <div className="settings-row">
            <ToggleSwitch
              label="Enable silent hours"
              checked={silentHours.enabled}
              onChange={silentHours.onToggle}
            />
          </div>

          <hr className="settings-divider" />

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

          <div className="settings-card__actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={silentHours.onSave}
            >
              Save silent hours
            </button>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__head">
          <h3 className="settings-card__title">Activity history</h3>
          <p className="settings-card__subtitle">Last 5 consumed items</p>
        </div>

        <div className="settings-card__body">
          {activity.consumedHistory.length === 0 ? (
            <p className="settings-empty">No consumed activity yet</p>
          ) : (
            <ul className="activity-history-list">
              {activity.consumedHistory.map((entry) => (
                <li
                  key={
                    entry.id ||
                    `${entry.name}-${entry.actionDate || entry.createdAt}`
                  }
                  className="activity-history-item"
                >
                  <span className="activity-history-item__name">
                    {entry.name || "Unnamed item"}
                  </span>
                  <time className="activity-history-item__time">
                    {new Date(
                      entry.actionDate || entry.createdAt || 0,
                    ).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
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
