import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { InventoryItem, HistoryEntry, MediaItem } from "../types";
import { itemModalStyles as styles, mediaStyles } from "../styles";
import { useMedia } from "../hooks";
import { MediaGallery } from "./MediaGallery";
import { formatArea } from "../utils";
import { useLocalization } from "../localization";

const MAX_MEDIA_ITEMS = 5;

const PRESET_COLORS = [
  { name: "Green", value: "#00FF00" },
  { name: "Red", value: "#FF0000" },
  { name: "Blue", value: "#0000FF" },
  { name: "Yellow", value: "#FFFF00" },
  { name: "Orange", value: "#FFA500" },
  { name: "Purple", value: "#800080" },
  { name: "Pink", value: "#FFC0CB" },
  { name: "Brown", value: "#A52A2A" },
];

type ModalMode = "view" | "edit" | "create";

interface ItemModalProps {
  visible: boolean;
  item: Partial<InventoryItem>;
  mode?: ModalMode;
  onChangeItem: (item: Partial<InventoryItem>) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit?: () => void;
  onAddHistoryEntry?: (itemId: string, history: HistoryEntry[]) => void;
}

export function ItemModal({
  visible,
  item,
  mode = "create",
  onChangeItem,
  onSave,
  onCancel,
  onEdit,
  onAddHistoryEntry,
}: ItemModalProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [newHistoryTitle, setNewHistoryTitle] = useState("");
  const [newHistoryDescription, setNewHistoryDescription] = useState("");
  const [newHistoryMedia, setNewHistoryMedia] = useState<MediaItem[]>([]);
  const [showAddHistory, setShowAddHistory] = useState(false);
  const { t } = useLocalization();

  const { showMediaPicker, deleteMedia } = useMedia();

  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!showAddHistory) {
      return;
    }

    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(timeout);
  }, [showAddHistory]);

  // Helper to format property values (handles nested objects and arrays)
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "-";
    }
    if (Array.isArray(value)) {
      return value.map((v) => formatValue(v)).join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Recursively render properties with support for nested objects
  const renderProperties = (
    props: Record<string, any>,
    prefix = "",
    depth = 0
  ): React.ReactNode[] => {
    const excludeKeys = [
      "name",
      "Name",
      "NAME",
      "notes",
      "Notes",
      "description",
      "Description",
      "fid",
    ];
    const result: React.ReactNode[] = [];

    for (const [key, value] of Object.entries(props)) {
      if (depth === 0 && excludeKeys.includes(key)) {
        continue;
      }

      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        // Nested object - render header and recurse
        result.push(
          <Text key={`${fullKey}-header`} style={styles.propertySubheader}>
            {key}:
          </Text>
        );
        result.push(...renderProperties(value, fullKey, depth + 1));
      } else {
        // Primitive or array - render as key-value
        result.push(
          <View
            key={fullKey}
            style={[
              styles.propertyRow,
              depth > 0 && styles.propertyRowIndented,
            ]}
          >
            <Text style={styles.propertyKey}>{key}:</Text>
            <Text style={styles.propertyValue}>{formatValue(value)}</Text>
          </View>
        );
      }
    }

    return result;
  };

  const addHistoryEntry = () => {
    if (!newHistoryTitle.trim()) {
      return;
    }

    const newEntry: HistoryEntry = {
      timestamp: new Date().toISOString(),
      title: newHistoryTitle.trim(),
      description: newHistoryDescription.trim(),
      media: newHistoryMedia,
    };

    const updatedHistory = [...(item.history || []), newEntry];
    onChangeItem({ ...item, history: updatedHistory });
    if (onAddHistoryEntry && item.id) {
      onAddHistoryEntry(String(item.id), updatedHistory);
    }

    setNewHistoryTitle("");
    setNewHistoryDescription("");
    setNewHistoryMedia([]);
    setShowAddHistory(false);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const handleCancel = () => {
    setNewHistoryTitle("");
    setNewHistoryDescription("");
    setNewHistoryMedia([]);
    setShowAddHistory(false);
    onCancel();
  };

  // Item media handlers
  const handleAddItemMedia = () => {
    showMediaPicker((media) => {
      if (media) {
        const currentMedia = item.media || [];
        onChangeItem({ ...item, media: [...currentMedia, media] });
      }
    });
  };

  const handleRemoveItemMedia = async (mediaItem: MediaItem) => {
    await deleteMedia(mediaItem);
    const updatedMedia = (item.media || []).filter(
      (m) => m.id !== mediaItem.id
    );
    onChangeItem({ ...item, media: updatedMedia });
  };

  // History entry media handlers
  const handleAddHistoryMedia = () => {
    showMediaPicker((media) => {
      if (media) {
        setNewHistoryMedia((prev) => [...prev, media]);
      }
    });
  };

  const handleRemoveHistoryMedia = async (mediaItem: MediaItem) => {
    await deleteMedia(mediaItem);
    setNewHistoryMedia((prev) => prev.filter((m) => m.id !== mediaItem.id));
  };

  const itemMediaCount = item.media?.length || 0;
  const historyMediaCount = newHistoryMedia.length;

  const getTitle = () => {
    if (isViewMode) return item.name || t("viewItem");
    if (isEditMode) return t("editItem");
    if (item.type === "area") return t("newArea");
    if (item.type === "point") return t("newPoint");
    return t("newPoint");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalTitle}>{getTitle()}</Text>

            {/* Name */}
            {isViewMode ? (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>{t("name")}</Text>
                <Text style={styles.viewValue}>{item.name || "-"}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>{t("name")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("namePlaceholder")}
                  value={item.name}
                  onChangeText={(text) => onChangeItem({ ...item, name: text })}
                />
              </>
            )}

            {/* Notes */}
            {isViewMode ? (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>{t("notes")}</Text>
                <Text style={styles.viewValue}>{item.notes || "-"}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>{t("notes")}</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder={t("notesPlaceholder")}
                  value={item.notes}
                  onChangeText={(text) =>
                    onChangeItem({ ...item, notes: text })
                  }
                  multiline
                  numberOfLines={2}
                />
              </>
            )}

            {/* Area info */}
            {item.type === "area" && item.area && (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>{t("area")}</Text>
                <Text style={styles.viewValue}>{formatArea(item.area)}</Text>
              </View>
            )}

            {/* Color picker for areas */}
            {item.type === "area" && !isViewMode && (
              <View style={styles.viewField}>
                <Text style={styles.label}>{t("color")}</Text>
                <View style={colorStyles.colorRow}>
                  {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color.value}
                      style={[
                        colorStyles.colorButton,
                        { backgroundColor: color.value },
                        (item.color || "#00FF00") === color.value &&
                          colorStyles.colorButtonSelected,
                      ]}
                      onPress={() =>
                        onChangeItem({ ...item, color: color.value })
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Color display for areas in view mode */}
            {item.type === "area" && isViewMode && item.color && (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>{t("color")}</Text>
                <View
                  style={[
                    colorStyles.colorPreview,
                    { backgroundColor: item.color },
                  ]}
                />
              </View>
            )}

            {/* Created date - only in view mode */}
            {isViewMode && item.created && (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>{t("created")}</Text>
                <Text style={styles.viewValue}>{formatDate(item.created)}</Text>
              </View>
            )}

            {/* GeoJSON Properties - only in view mode */}
            {isViewMode &&
              item.properties &&
              Object.keys(item.properties).length > 0 && (
                <View style={styles.propertiesSection}>
                  <Text style={styles.viewLabel}>{t("properties")}</Text>
                  {renderProperties(item.properties)}
                </View>
              )}

            {/* Item Media Section */}
            {isViewMode ? (
              itemMediaCount > 0 && (
                <View style={styles.mediaSection}>
                  <Text style={styles.viewLabel}>{t("media")}</Text>
                  <MediaGallery media={item.media || []} />
                </View>
              )
            ) : (
              <View style={styles.mediaSection}>
                <Text style={styles.label}>
                  {t("media")} ({itemMediaCount}/{MAX_MEDIA_ITEMS})
                </Text>
                <View style={mediaStyles.mediaRow}>
                  {itemMediaCount < MAX_MEDIA_ITEMS && (
                    <TouchableOpacity
                      style={mediaStyles.addMediaButton}
                      onPress={handleAddItemMedia}
                    >
                      <Text style={mediaStyles.addMediaButtonText}>+</Text>
                    </TouchableOpacity>
                  )}
                  <MediaGallery
                    media={item.media || []}
                    onRemove={handleRemoveItemMedia}
                    editable
                  />
                </View>
              </View>
            )}

            {/* History Section - shown in view and edit modes */}
            {(isViewMode || isEditMode) && (
              <View style={styles.historySection}>
                <View style={styles.historySectionHeader}>
                  <Text style={styles.historySectionTitle}>{t("history")}</Text>
                  {!showAddHistory && (
                    <TouchableOpacity
                      style={styles.addHistoryButton}
                      onPress={() => setShowAddHistory(true)}
                    >
                      <Text style={styles.addHistoryButtonText}>
                        + {t("add")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {showAddHistory && (
                  <View style={styles.addHistoryForm}>
                    <Text style={styles.label}>{t("title")}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t("title")}
                      placeholderTextColor="#777"
                      value={newHistoryTitle}
                      onChangeText={setNewHistoryTitle}
                    />
                    <Text style={styles.label}>{t("description")}</Text>
                    <TextInput
                      style={[styles.input, styles.historyDescInput]}
                      placeholder={t("description")}
                      placeholderTextColor="#777"
                      value={newHistoryDescription}
                      onChangeText={setNewHistoryDescription}
                      multiline
                      numberOfLines={2}
                    />

                    {/* History Entry Media */}
                    <View style={styles.historyMediaSection}>
                      <Text style={styles.historyMediaLabel}>
                        {t("media")} ({historyMediaCount}/{MAX_MEDIA_ITEMS})
                      </Text>
                      <View style={mediaStyles.mediaRow}>
                        {historyMediaCount < MAX_MEDIA_ITEMS && (
                          <TouchableOpacity
                            style={[
                              mediaStyles.addMediaButton,
                              { width: 50, height: 50 },
                            ]}
                            onPress={handleAddHistoryMedia}
                          >
                            <Text style={mediaStyles.addMediaButtonText}>
                              +
                            </Text>
                          </TouchableOpacity>
                        )}
                        <MediaGallery
                          media={newHistoryMedia}
                          onRemove={handleRemoveHistoryMedia}
                          editable
                        />
                      </View>
                    </View>

                    <View style={styles.addHistoryButtons}>
                      <TouchableOpacity
                        style={styles.addHistoryCancelBtn}
                        onPress={() => {
                          setShowAddHistory(false);
                          setNewHistoryTitle("");
                          setNewHistoryDescription("");
                          setNewHistoryMedia([]);
                        }}
                      >
                        <Text style={styles.addHistoryCancelText}>
                          {t("cancel")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addHistoryConfirmBtn}
                        onPress={addHistoryEntry}
                      >
                        <Text style={styles.addHistoryConfirmText}>
                          {t("add")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {item.history && item.history.length > 0 ? (
                  <View style={styles.historyList}>
                    {[...item.history].reverse().map((entry, index) => (
                      <View key={index} style={styles.historyEntry}>
                        <Text style={styles.historyTimestamp}>
                          {formatDate(entry.timestamp)}
                        </Text>
                        <Text style={styles.historyEntryTitle}>
                          {entry.title}
                        </Text>
                        {entry.description ? (
                          <Text style={styles.historyDescription}>
                            {entry.description}
                          </Text>
                        ) : null}
                        {entry.media && entry.media.length > 0 && (
                          <MediaGallery media={entry.media} />
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noHistoryText}>
                    {t("noHistoryEntries")}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            {isViewMode ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.modalButtonText}>{t("close")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.editButton]}
                  onPress={onEdit}
                >
                  <Text style={styles.modalButtonText}>{t("edit")}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.modalButtonText}>{t("cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={onSave}
                >
                  <Text style={styles.modalButtonText}>{t("save")}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const colorStyles = StyleSheet.create({
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  colorButtonSelected: {
    borderColor: "#000",
    borderWidth: 3,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
  },
});
