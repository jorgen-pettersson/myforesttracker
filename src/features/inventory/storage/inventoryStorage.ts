import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY } from "./keys";
import { HistoryEntry, InventoryItem } from "../types";

export const loadInventory = async (): Promise<InventoryItem[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as InventoryItem[];
      return parsed.map((item: InventoryItem) => ({
        ...item,
        history: (item.history || []).map((entry: HistoryEntry) => ({
          ...entry,
          media: entry.media || [],
        })),
        media: item.media || [],
      }));
    }
  } catch (error) {
    console.log("Error loading data:", error);
  }

  return [];
};

export const saveInventory = async (items: InventoryItem[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.log("Error saving data:", error);
  }
};
