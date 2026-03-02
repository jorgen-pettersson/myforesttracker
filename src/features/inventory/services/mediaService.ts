import RNFS from "react-native-fs";
import { InventoryItem } from "../types";

export const cleanupItemMedia = async (item: InventoryItem) => {
  for (const media of item.media || []) {
    try {
      const filePath = media.uri.replace("file://", "");
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }
    } catch (error) {
      console.log("Error deleting media file:", error);
    }
  }

  for (const entry of item.history || []) {
    for (const media of entry.media || []) {
      try {
        const filePath = media.uri.replace("file://", "");
        const exists = await RNFS.exists(filePath);
        if (exists) {
          await RNFS.unlink(filePath);
        }
      } catch (error) {
        console.log("Error deleting media file:", error);
      }
    }
  }
};
