import { Alert, Platform, PermissionsAndroid } from "react-native";
import {
  launchCamera,
  launchImageLibrary,
  MediaType,
  CameraOptions,
  ImageLibraryOptions,
} from "react-native-image-picker";
import RNFS from "react-native-fs";
import { MediaItem } from "../features/inventory";

const MEDIA_DIR = `${RNFS.DocumentDirectoryPath}/media`;

export function useMedia() {
  const ensureMediaDir = async () => {
    const exists = await RNFS.exists(MEDIA_DIR);
    if (!exists) {
      await RNFS.mkdir(MEDIA_DIR);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== "android") {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message:
            "This app needs access to your camera to take photos and videos.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const pickMedia = (
    source: "camera" | "gallery",
    mediaType: MediaType = "mixed"
  ): Promise<MediaItem | null> => {
    return new Promise(async (resolve) => {
      if (source === "camera") {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          Alert.alert(
            "Permission Denied",
            "Camera permission is required to take photos and videos."
          );
          resolve(null);
          return;
        }
      }

      const options: CameraOptions & ImageLibraryOptions = {
        mediaType,
        quality: 0.8,
        videoQuality: "medium",
        durationLimit: 60,
        includeBase64: false,
      };

      const callback = async (response: any) => {
        if (response.didCancel || response.errorCode) {
          if (response.errorCode) {
            console.error(
              "Image picker error:",
              response.errorCode,
              response.errorMessage
            );
          }
          resolve(null);
          return;
        }

        const asset = response.assets?.[0];
        if (!asset?.uri) {
          resolve(null);
          return;
        }

        try {
          await ensureMediaDir();

          const id = Date.now().toString();
          const isVideo = asset.type?.startsWith("video") || false;
          const extension = isVideo ? "mp4" : "jpg";
          const fileName = `${id}.${extension}`;
          const destPath = `${MEDIA_DIR}/${fileName}`;

          await RNFS.copyFile(asset.uri, destPath);

          const mediaItem: MediaItem = {
            id,
            uri: `file://${destPath}`,
            type: isVideo ? "video" : "photo",
            timestamp: new Date().toISOString(),
          };

          resolve(mediaItem);
        } catch (error) {
          console.error("Error saving media:", error);
          Alert.alert("Error", "Failed to save media");
          resolve(null);
        }
      };

      if (source === "camera") {
        launchCamera(options, callback);
      } else {
        launchImageLibrary(options, callback);
      }
    });
  };

  const deleteMedia = async (mediaItem: MediaItem): Promise<boolean> => {
    try {
      const filePath = mediaItem.uri.replace("file://", "");
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }
      return true;
    } catch (error) {
      console.error("Error deleting media:", error);
      return false;
    }
  };

  const deleteMultipleMedia = async (
    mediaItems: MediaItem[]
  ): Promise<void> => {
    for (const item of mediaItems) {
      await deleteMedia(item);
    }
  };

  const showMediaPicker = (
    onSelect: (media: MediaItem | null) => void,
    mediaType: MediaType = "mixed"
  ) => {
    Alert.alert("Add Media", "Choose source", [
      {
        text: "Camera",
        onPress: async () => {
          const media = await pickMedia("camera", mediaType);
          onSelect(media);
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const media = await pickMedia("gallery", mediaType);
          onSelect(media);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  return {
    pickMedia,
    deleteMedia,
    deleteMultipleMedia,
    showMediaPicker,
  };
}
