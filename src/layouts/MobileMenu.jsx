import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChefHat,
  LogOut,
  Refrigerator,
  Settings,
  ShoppingCart,
  X,
} from "lucide-react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import "../styles/components/common/Layout/MobileMenu.scss";
import { useAuth } from "../features/auth/context/AuthContext";
import LogoutConfirm from "../components/LogoutConfirm";

const MobileMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const menuItems = [
    { id: "/home", label: "Fridge", icon: <Refrigerator size={20} /> },
    { id: "/recipes", label: "Recipes", icon: <ChefHat size={20} /> },
    { id: "/shop", label: "Shopping", icon: <ShoppingCart size={20} /> },
    { id: "/impact", label: "Stats", icon: <BarChart3 size={20} /> },
    { id: "/settings", label: "Settings", icon: <Settings size={20} /> },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => setIsLogoutOpen(true);

  return (
    <AnimatePresence>
      {isOpen ? (
        <Motion.div
          className="mobile-menu-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={onClose}
          aria-label="Mobile navigation"
        >
          <Motion.aside
            className="mobile-menu-panel"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-head">
              <button type="button" className="mobile-menu-close" onClick={onClose} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            <nav className="mobile-menu-nav">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mobile-menu-item ${location.pathname === item.id ? "active" : ""}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  <span className="mobile-menu-icon">{item.icon}</span>
                  <span className="mobile-menu-label">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mobile-menu-footer">
              <button type="button" className="mobile-menu-item logout" onClick={handleLogout}>
                <span className="mobile-menu-icon"><LogOut size={20} /></span>
                <span className="mobile-menu-label">Logout</span>
              </button>
            </div>
          </Motion.aside>
          <LogoutConfirm
            isOpen={isLogoutOpen}
            onCancel={() => setIsLogoutOpen(false)}
            onConfirm={async () => {
              await logout();
              navigate("/signin");
              onClose();
            }}
          />
        </Motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default MobileMenu;
