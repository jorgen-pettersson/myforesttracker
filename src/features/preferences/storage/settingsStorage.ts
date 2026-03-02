import AsyncStorage from "@react-native-async-storage/async-storage";
import { SETTINGS_KEY } from "./keys";
import { Settings } from "../types/settings";

export const loadSettings = async (fallback: Settings): Promise<Settings> => {
  try {
    const saved = await AsyncStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Settings>;
      return { ...fallback, ...parsed };
    }
  } catch (error) {
    console.log("Error loading settings:", error);
  }
  return fallback;
};

export const saveSettings = async (settings: Settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.log("Error saving settings:", error);
  }
};
