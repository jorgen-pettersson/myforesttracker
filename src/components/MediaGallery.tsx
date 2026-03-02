import React, { useState } from "react";
import { View, Image, TouchableOpacity, ScrollView, Text } from "react-native";
import { MediaItem } from "../features/inventory";
import { mediaStyles as styles } from "../styles";
import { MediaViewer } from "./MediaViewer";

interface MediaGalleryProps {
  media: MediaItem[];
  onRemove?: (mediaItem: MediaItem) => void;
  editable?: boolean;
}

export function MediaGallery({
  media,
  onRemove,
  editable = false,
}: MediaGalleryProps) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const handlePress = (item: MediaItem) => {
    setSelectedMedia(item);
    setViewerVisible(true);
  };

  const handleRemove = (item: MediaItem, e: any) => {
    e.stopPropagation();
    onRemove?.(item);
  };

  if (media.length === 0) {
    return null;
  }

  return (
    <View style={styles.galleryContainer}>
      <ScrollView
        horizontal
        style={styles.galleryScroll}
        showsHorizontalScrollIndicator={false}
      >
        {media.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.galleryItem}
            onPress={() => handlePress(item)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.uri }} style={styles.galleryImage} />
            {item.type === "video" && (
              <View style={styles.videoIndicator}>
                <Text style={styles.videoIcon}>▶</Text>
              </View>
            )}
            {editable && onRemove && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => handleRemove(item, e)}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <MediaViewer
        visible={viewerVisible}
        media={selectedMedia}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}
