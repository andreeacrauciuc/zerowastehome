import { useCallback, useState } from "react";

const readValue = (key, defaultValue) => {
  if (typeof window === "undefined") {
    return typeof defaultValue === "function" ? defaultValue() : defaultValue;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null) {
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    }
    return JSON.parse(storedValue);
  } catch (error) {
    console.error("useLocalStorage: failed to read stored value.", error);
    return typeof defaultValue === "function" ? defaultValue() : defaultValue;
  }
};

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => readValue(key, defaultValue));

  const setStoredValue = useCallback((nextValue) => {
    setValue((prev) => {
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(prev) : nextValue;

      try {
        window.localStorage.setItem(key, JSON.stringify(resolvedValue));
      } catch (error) {
        console.error("useLocalStorage: failed to write stored value.", error);
      }

      return resolvedValue;
    });
  }, [key]);

  return [value, setStoredValue];
};
