import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";
import "../styles/components/common/RequireAuth.scss";

const RequireAuth = () => {
  const { currentUser, isAuthReady, authStatus, logout } = useAuth();
  const [didReset, setDidReset] = useState(false);
  const effectiveAuthStatus =
    authStatus ||
    (!isAuthReady
      ? "loading"
      : currentUser
        ? "authenticated"
        : "unauthenticated");

  if (!isAuthReady) {
    return (
      <div className="require-auth-loading-shell">
        <div className="require-auth-spinner" />
      </div>
    );
  }

  if (didReset) {
    return <Navigate to="/signin" replace />;
  }

  if (effectiveAuthStatus === "corrupted") {
    const handleReset = async () => {
      try {
        await logout();
      } finally {
        setDidReset(true);
      }
    };

    return (
      <div className="require-auth-corrupted">
        <div className="require-auth-corrupted__panel">
          <h1 className="page-title">We hit a session <span>problem</span></h1>
          <p>
            Your sign-in session is out of sync. Resetting the session will take you back
            to sign in
          </p>
          <button type="button" onClick={handleReset}>
            Reset session
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
