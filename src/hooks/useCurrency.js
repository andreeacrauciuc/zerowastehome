import { useMemo } from "react";
import { useSettings } from "../context/SettingsContext";

export const useCurrency = () => {
  const { userPreferences } = useSettings();
  const currency = userPreferences?.currency || "EUR";


  const currencyConfig = useMemo(
    () => ({
      locale: currency === "RON" ? "ro-RO" : "en-EU",
      currency,
    }),
    [currency],
  );

  return {
    currency,
    currencyConfig,
  };
};

export default useCurrency;
