import {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@forestry_settings';

export type MapType = 'standard' | 'satellite' | 'hybrid';

interface Settings {
  gpsTracking: boolean;
  mapType: MapType;
}

const DEFAULT_SETTINGS: Settings = {
  gpsTracking: false,
  mapType: 'standard',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Settings>;
        setSettings({...DEFAULT_SETTINGS, ...parsed});
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  };

  const setGpsTracking = (value: boolean) => {
    const newSettings = {...settings, gpsTracking: value};
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const setMapType = (value: MapType) => {
    const newSettings = {...settings, mapType: value};
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const toggleMapType = () => {
    setMapType(settings.mapType === 'standard' ? 'satellite' : 'standard');
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
