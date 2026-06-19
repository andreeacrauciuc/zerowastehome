import React from "react";
import { motion as Motion } from "framer-motion";
import "../styles/components/common/Layout/Dock.scss";

const DockItem = ({ item }) => {
  return (
    <Motion.button
      type="button"
      className={`dock-item ${item.active ? "active" : ""} ${item.className || ""}`.trim()}
      onClick={item.onClick}
      aria-label={item.label}
      title={item.label}
      whileHover={{ x: 10 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <span className="dock-item-icon">{item.icon}</span>
      <span className="dock-item-label">{item.label}</span>
    </Motion.button>
  );
};

const Dock = ({ items = [], className = "", panelHeight = 84 }) => {
  return (
    <div className={`dock-root ${className}`.trim()}>
      <Motion.div
        className="dock-panel"
        style={{ minHeight: panelHeight }}
        role="toolbar"
        aria-label="Main navigation"
      >
        {items.map((item) => (
          <DockItem key={item.id || item.label} item={item} />
        ))}
      </Motion.div>
    </div>
  );
};

export default Dock;
