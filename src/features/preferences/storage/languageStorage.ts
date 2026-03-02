import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_KEY } from "./keys";
import { Language } from "../types/language";

export const loadLanguage = async (): Promise<Language | null> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage === "en" || savedLanguage === "sv") {
      return savedLanguage;
    }
  } catch (error) {
    console.log("Error loading language:", error);
  }
  return null;
};

export const saveLanguage = async (lang: Language) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch (error) {
    console.log("Error saving language:", error);
  }
};
