import React from "react";
import "../../styles/components/common/UI/UserAvatar.scss";

function UserAvatar({ user, size = 40, className = "", onClick, title, ariaLabel }) {
  const safeSize = Number.isFinite(Number(size)) ? Number(size) : 40;
  const photoURL = user?.photoURL || user?.photoDataUrl || "";
  const displayName = user?.displayName || user?.fullName || "";
  const initial = displayName ? displayName.trim().slice(0, 1).toUpperCase() : "";

  const rootClassName = ["user-avatar", className, onClick ? "user-avatar-clickable" : ""]
    .filter(Boolean)
    .join(" ");

  const rootProps = {
    className: rootClassName,
    style: { width: `${safeSize}px`, height: `${safeSize}px` },
    title,
    "aria-label": ariaLabel || title || "User avatar",
  };

  if (onClick) {
    rootProps.onClick = onClick;
    rootProps.role = "button";
    rootProps.tabIndex = 0;
    rootProps.onKeyDown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    };
  }

  return (
    <div {...rootProps}>
      {photoURL ? (
        <img className="user-avatar-image" src={photoURL} alt={displayName || "User"} loading="lazy" />
      ) : initial ? (
        <div
          className="user-avatar-initial"
          style={{ fontSize: `${Math.max(14, Math.round(safeSize * 0.42))}px` }}
          aria-hidden="true"
        >
          {initial}
        </div>
      ) : (
        <svg
          className="user-avatar-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M4.5 19.5C5.4 16.8 8.1 15 12 15C15.9 15 18.6 16.8 19.5 19.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}

export default UserAvatar;
