import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChefHat,
  LogOut,
  Refrigerator,
  Settings,
  ShoppingCart,
} from "lucide-react";
import Sidebar from "./Sidebar";
import MobileMenu from "./MobileMenu";
import Dock from "./Dock";
import { useAuth } from "../features/auth/context/AuthContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import LogoutConfirm from "../components/LogoutConfirm";

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  usePushNotifications();

  const navItems = [
    { id: "/home", label: "Fridge", icon: <Refrigerator size={24} /> },
    { id: "/recipes", label: "Recipes", icon: <ChefHat size={24} /> },
    { id: "/shop", label: "Shopping", icon: <ShoppingCart size={24} /> },
    { id: "/impact", label: "Stats", icon: <BarChart3 size={24} /> },
    { id: "/settings", label: "Settings", icon: <Settings size={24} /> },
  ];

  const dockItems = [
    ...navItems.map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      active: location.pathname === item.id,
      onClick: () => navigate(item.id),
    })),
    {
      id: "logout",
      label: "Logout",
      icon: <LogOut size={24} />,
      className: "dock-item-logout",
      onClick: () => setIsLogoutOpen(true),
    },
  ];

  return (
    <div className="dashboard-layout">
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <Sidebar />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="main-content">
        <Outlet />
      </main>

      <Dock items={dockItems} className="mobile-dock" />
      <LogoutConfirm
        isOpen={isLogoutOpen}
        onCancel={() => setIsLogoutOpen(false)}
        onConfirm={async () => {
          await logout();
          navigate("/signin");
          setIsLogoutOpen(false);
        }}
      />
    </div>
  );
};

export default MainLayout;
