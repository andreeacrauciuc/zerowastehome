import React from "react";
import styles from "./ToggleSwitch.module.scss";

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) {
  return (
    <label
      className={`${styles.toggle} ${disabled ? styles.disabled : ""}`.trim()}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && (
          <span className={styles.description}>{description}</span>
        )}
      </span>

      <span className={styles.control}>
        <input
          type="checkbox"
          className={styles.input}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className={styles.track} aria-hidden="true" />
        <span className={styles.thumb} aria-hidden="true" />
      </span>
    </label>
  );
}
