import { AuthProvider } from "../../features/auth/context/AuthContext";
import { HouseholdProvider } from "../../features/household/HouseholdContext";
import { SettingsProvider } from "../../context/SettingsContext";
import { DataStoreProvider } from "../../hooks/useDataStore";

export const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <SettingsProvider>
          <DataStoreProvider>{children}</DataStoreProvider>
        </SettingsProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
};
