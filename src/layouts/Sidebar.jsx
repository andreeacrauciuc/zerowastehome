import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, ChefHat, LogOut, Refrigerator, Settings, ShoppingCart } from "lucide-react";
import logo from "../assets/zero-waste-logo.png";
import styles from "./SideBar.module.scss";
import { useAuth } from "../features/auth/context/AuthContext";
import LogoutConfirm from "../components/LogoutConfirm";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const menuItems = [
    { id: "/home", label: "Fridge", icon: <Refrigerator size={18} /> },
    { id: "/recipes", label: "Recipes", icon: <ChefHat size={18} /> },
    { id: "/shop", label: "Shopping", icon: <ShoppingCart size={18} /> },
    { id: "/impact", label: "Stats", icon: <BarChart3 size={18} /> },
    { id: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.capsule}>
        <button
          type="button"
          className={styles.logoSection}
          onClick={() => navigate("/home")}
          aria-label="Go to home"
          title="Home"
        >
          <img src={logo} alt="Zero Waste" className={styles.mainLogo} />
        </button>

        <nav className={styles.menu} aria-label="Main menu">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`${styles.menuButton} ${isActive ? styles.active : ""}`.trim()}
                aria-label={item.label}
                title={item.label}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.tooltip}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Logout"
            title="Logout"
            onClick={() => setIsLogoutOpen(true)}
          >
            <span className={styles.icon}><LogOut /></span>
            <span className={styles.tooltip}>Logout</span>
          </button>
        </div>
      </div>
    </aside>
      <LogoutConfirm
        isOpen={isLogoutOpen}
        onCancel={() => setIsLogoutOpen(false)}
        onConfirm={async () => {
          await logout();
          navigate("/signin");
        }}
      />
    </>
  );
};

export default Sidebar;
