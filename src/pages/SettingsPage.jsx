import { useDataStore } from "../hooks/useDataStore";
import Settings from "../features/settings/components/Settings";

export default function SettingsPage() {
  const { impactHistory } = useDataStore();
  return <Settings impactHistory={impactHistory} />;
}
