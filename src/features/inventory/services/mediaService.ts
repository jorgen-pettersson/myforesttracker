import RNFS from "react-native-fs";
import { Place } from "../types";

export const cleanupItemMedia = async (place: Place) => {
  for (const media of place.media || []) {
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

  for (const entry of place.userJournal || []) {
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
