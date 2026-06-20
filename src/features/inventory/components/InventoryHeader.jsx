import React from "react";
import { Bell, FileText, Loader2, Plus, Search } from "lucide-react";
import UserAvatar from "../../../components/ui/UserAvatar";

function InventoryHeader({
  searchTerm,
  onSearchChange,
  isScanning,
  onScanBarcode,
  onAddFood,
  criticalNotificationCount,
  onToggleNotifications,
  currentUser,
  onProfileClick,
}) {
  return (
    <header className="inventory-header-glass">
      <div className="inventory-search-wrap">
        <Search size={16} className="inventory-search-icon" />
        <input
          type="text"
          placeholder="Search in your fridge..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="inventory-header-actions">
        <button
          className="inventory-action-btn secondary"
          onClick={onScanBarcode}
          type="button"
          disabled={isScanning}
        >
          {isScanning ? (
            <Loader2 size={20} className="inventory-spin" />
          ) : (
            <FileText size={20} />
          )}
          <span className="inventory-action-text">
            {isScanning ? "Scanning..." : "Scan barcode"}
          </span>
        </button>

        <button
          className="inventory-action-btn primary"
          type="button"
          onClick={onAddFood}
        >
          <Plus size={20} />
          <span className="inventory-action-text">Add food</span>
        </button>

        <div className="inventory-bell-btn-wrap">
          <button
            className="inventory-bell-btn"
            type="button"
            aria-label="Notifications"
            onClick={onToggleNotifications}
          >
            <Bell size={24} />
          </button>
          {criticalNotificationCount > 0 ? (
            <span
              className="inventory-bell-badge"
              aria-label={`${criticalNotificationCount} critical alerts`}
            >
              {criticalNotificationCount}
            </span>
          ) : null}
        </div>

        <UserAvatar
          className="inventory-profile-image"
          user={currentUser}
          size={64}
          title="Settings & household"
          ariaLabel="Open Settings and Household"
          onClick={onProfileClick}
        />
      </div>
    </header>
  );
}

export default InventoryHeader;
