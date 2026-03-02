import { useEffect, useState } from "react";
import { Settings } from "../types/settings";
import { loadSettings, saveSettings } from "../storage/settingsStorage";

const DEFAULT_SETTINGS: Settings = {
  gpsTracking: false,
  mapType: "standard",
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const loaded = await loadSettings(DEFAULT_SETTINGS);
      setSettings(loaded);
      setIsLoaded(true);
    };
    load();
  }, []);

  const setGpsTracking = (value: boolean) => {
    const newSettings = { ...settings, gpsTracking: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const setMapType = (value: Settings["mapType"]) => {
    const newSettings = { ...settings, mapType: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const toggleMapType = () => {
    setMapType(settings.mapType === "standard" ? "satellite" : "standard");
  };

  return {
    gpsTracking: settings.gpsTracking,
    setGpsTracking,
    mapType: settings.mapType,
    setMapType,
    toggleMapType,
    isLoaded,
  };
}
