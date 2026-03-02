import React from "react";
import { View, Image, TouchableOpacity, Text, Modal } from "react-native";
import Video from "react-native-video";
import { MediaItem } from "../features/inventory";
import { mediaStyles as styles } from "../styles";

interface MediaViewerProps {
  visible: boolean;
  media: MediaItem | null;
  onClose: () => void;
}

export function MediaViewer({ visible, media, onClose }: MediaViewerProps) {
  if (!media) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.viewerContainer}>
        {media.type === "photo" ? (
          <Image
            source={{ uri: media.uri }}
            style={styles.viewerImage}
            resizeMode="contain"
          />
        ) : (
          <Video
            source={{ uri: media.uri }}
            style={styles.viewerVideo}
            resizeMode="contain"
            controls
            paused={false}
          />
        )}

        <TouchableOpacity style={styles.viewerCloseButton} onPress={onClose}>
          <Text style={styles.viewerCloseText}>×</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
