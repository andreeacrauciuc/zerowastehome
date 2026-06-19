import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "../layouts/MainLayout";
import ErrorBoundary from "../components/ErrorBoundary";
import RegisterForm from "../features/auth/components/RegisterForm";
import SignInForm from "../features/auth/components/SignInForm";
import { AppProviders } from "./providers/AppProviders";
import RequireAuth from "../components/RequireAuth";
import InstallPWA from "../components/ui/InstallPWA";
import { appRoutes } from "./router/routes";
import { useAuth } from "../features/auth/context/AuthContext";

function NotFoundRedirect() {
  const { currentUser, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="require-auth-loading-shell">
        <div className="require-auth-spinner" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/home" replace />;
  }

  return <Navigate to="/signin" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <Router>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route element={<MainLayout />}>
                {appRoutes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <ErrorBoundary key={route.path} resetKey={route.path}>
                        <route.Component />
                      </ErrorBoundary>
                    }
                  />
                ))}
              </Route>
            </Route>
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/signin" element={<SignInForm />} />
            {/* Resolve "/" by auth state directly (authed -> /home, else
                -> /signin) instead of always sending to /home and letting
                RequireAuth bounce unauthenticated users back to /signin. */}
            <Route path="/" element={<NotFoundRedirect />} />
            <Route path="*" element={<NotFoundRedirect />} />
          </Routes>
          <Toaster
            position="top-center"
            richColors
            closeButton
            style={{ zIndex: 9999 }}
            toastOptions={{ style: { zIndex: 9999 } }}
          />
          <InstallPWA />
        </Router>
      </AppProviders>
    </ErrorBoundary>
  );
}
export default App;