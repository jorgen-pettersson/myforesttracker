import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Place, HistoryEntry, MediaItem } from "../features/inventory";
import { itemModalStyles as styles, mediaStyles } from "../styles";
import { useMedia } from "../hooks";
import { MediaGallery } from "./MediaGallery";
import { formatArea } from "../utils";
import { useLocalization } from "../localization";
import {
  getAllAttributeOptionsMap,
  getAttributeType,
  getSelectAttributes,
} from "../features/inventory/services/attributeService";
import { AttributeDefinition } from "../features/inventory/types/attributeSchema";

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
  item: Partial<Place>;
  mode?: ModalMode;
  onChangeItem: (item: Partial<Place>) => void;
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
  const [newHistoryBody, setNewHistoryBody] = useState("");
  const [newHistoryMedia, setNewHistoryMedia] = useState<MediaItem[]>([]);
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [selectedNewAttribute, setSelectedNewAttribute] =
    useState<string>("__none__");
  const { t } = useLocalization();
  const attributeOptions = useMemo(() => {
    // Use attribute master for all select attributes
    return getAllAttributeOptionsMap();
  }, []);

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
      return "";
    }
    if (Array.isArray(value)) {
      return value.map((v) => formatValue(v)).join(", ");
    }
    if (typeof value === "object") {
      // Handle attribute objects with code and label
      if (
        value.code !== undefined &&
        value.label !== undefined &&
        value.label !== null
      ) {
        return `(${value.code}) ${value.label}`;
      }
      // Handle objects with only code (or label is null)
      if (value.code !== undefined) {
        return String(value.code);
      }
      // Handle objects with only label
      if (value.label !== undefined && value.label !== null) {
        return String(value.label);
      }
      // Fallback for other objects
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Helper to get translated attribute name
  const getAttributeName = (key: string): string => {
    // Check if translation exists for this key
    const translationKey = key as any;
    if (t(translationKey) !== translationKey) {
      return t(translationKey);
    }
    // Fallback to the key itself if no translation
    return key;
  };

  // Helper to get attributes that can be added
  const getAvailableAttributesToAdd = useCallback((): AttributeDefinition[] => {
    const allSelectAttributes = getSelectAttributes();
    const siteKeys = Object.keys(item.attributes?.site || {});
    const hasSiteIndexSpec = siteKeys.includes("SiteIndexSpec");
    const existingKeys = hasSiteIndexSpec ? [...siteKeys, "species"] : siteKeys;

    // Exclude attributes that are:
    // - Already on this item
    // - Builtin (handled separately)
    // - Special/auto-managed
    const excludeFromAdding = [
      "name",
      "notes",
      "areaHa",
      "color",
      "parentPlaceId",
      "speciesHeight", // Legacy field (managed via SiteIndexSpec)
    ];

    return allSelectAttributes.filter(
      (attr) =>
        !existingKeys.includes(attr.name) &&
        !excludeFromAdding.includes(attr.name)
    );
  }, [item.attributes]);

  const getSiteIndexSpec = (
    site: Record<string, any> | undefined
  ): Record<string, any> | null => {
    if (site?.SiteIndexSpec && typeof site.SiteIndexSpec === "object") {
      return site.SiteIndexSpec as Record<string, any>;
    }
    const legacySpecies = site?.species;
    const legacyHeight = site?.speciesHeight;
    if (legacySpecies !== undefined || legacyHeight !== undefined) {
      return {
        ...(legacySpecies !== undefined ? { species: legacySpecies } : {}),
        ...(legacyHeight !== undefined ? { speciesHeight: legacyHeight } : {}),
      };
    }
    return null;
  };

  const buildSiteWithIndexSpec = (
    updater: (current: Record<string, any>) => Record<string, any> | null
  ) => {
    const site = item.attributes?.site || {};
    const current = getSiteIndexSpec(site) || {};
    const next = updater(current) || {};

    const newSite = { ...site } as Record<string, any>;
    delete newSite.species; // Clean legacy flat fields
    delete newSite.speciesHeight;

    if (Object.keys(next).length > 0) {
      newSite.SiteIndexSpec = next;
    } else {
      delete newSite.SiteIndexSpec;
    }

    return newSite;
  };

  // Helper to add a new attribute
  const addNewAttribute = useCallback(
    (attributeName: string) => {
      if (!attributeName || attributeName === "__none__") {
        return;
      }

      // Special case: species composite - add both fields
      if (attributeName === "species") {
        onChangeItem({
          ...item,
          attributes: {
            ...item.attributes,
            site: {
              ...buildSiteWithIndexSpec(() => ({
                species: undefined,
                speciesHeight: undefined,
              })),
            },
          },
        });
        setSelectedNewAttribute("__none__");
        return;
      }

      // For all other attributes, add to site with undefined (user must set value)
      onChangeItem({
        ...item,
        attributes: {
          ...item.attributes,
          site: {
            ...item.attributes?.site,
            [attributeName]: undefined,
          },
        },
      });

      setSelectedNewAttribute("__none__");
    },
    [item, onChangeItem]
  );

  // Helper to remove an attribute
  const removeAttribute = useCallback(
    (attributeName: string) => {
      Alert.alert(t("removeAttribute"), t("confirmRemoveAttribute"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            const newSiteAttributes = { ...item.attributes?.site };
            delete newSiteAttributes[attributeName];

            // Special case: if removing species, also remove speciesHeight
            if (attributeName === "species") {
              delete newSiteAttributes.speciesHeight;
              delete newSiteAttributes.SiteIndexSpec;
            }

            if (attributeName === "SiteIndexSpec") {
              delete newSiteAttributes.species;
              delete newSiteAttributes.speciesHeight;
            }

            onChangeItem({
              ...item,
              attributes: {
                ...item.attributes,
                site: newSiteAttributes,
              },
            });
          },
        },
      ]);
    },
    [item, onChangeItem, t]
  );

  // Helper to check if attribute is removable
  const isAttributeRemovable = (attributeName: string): boolean => {
    // Can't remove required/builtin attributes
    const nonRemovable = ["name", "notes", "areaHa", "color", "parentPlaceId"];
    return !nonRemovable.includes(attributeName);
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
      "forestand",
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
      body: newHistoryBody.trim(),
      media: newHistoryMedia,
    };

    const updatedJournal = [...(item.userJournal || []), newEntry];
    onChangeItem({ ...item, userJournal: updatedJournal });
    if (onAddHistoryEntry && item.id) {
      onAddHistoryEntry(String(item.id), updatedJournal);
    }

    setNewHistoryTitle("");
    setNewHistoryBody("");
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
    setNewHistoryBody("");
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
    if (isViewMode) return item.attributes?.name || t("viewItem");
    if (isEditMode) return t("editItem");
    if (item.placeType === "Place_Area") return t("newArea");
    if (item.placeType === "Place_Point") return t("newPoint");
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
                <Text style={styles.viewValue}>
                  {item.attributes?.name || "-"}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>{t("name")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("namePlaceholder")}
                  value={item.attributes?.name || ""}
                  onChangeText={(text) =>
                    onChangeItem({
                      ...item,
                      attributes: { ...item.attributes, name: text },
                    })
                  }
                />
              </>
            )}

            {/* Notes */}
            {isViewMode ? (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>{t("notes")}</Text>
                <Text style={styles.viewValue}>
                  {item.attributes?.notes || "-"}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>{t("notes")}</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder={t("notesPlaceholder")}
                  value={item.attributes?.notes || ""}
                  onChangeText={(text) =>
                    onChangeItem({
                      ...item,
                      attributes: { ...item.attributes, notes: text },
                    })
                  }
                  multiline
                  numberOfLines={2}
                />
              </>
            )}

            {/* Area info */}
            {item.placeType === "Place_Area" && item.attributes?.areaHa && (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>{t("area")}</Text>
                <Text style={styles.viewValue}>
                  {formatArea(item.attributes.areaHa * 10000)}
                </Text>
              </View>
            )}

            {/* Color picker for areas */}
            {item.placeType === "Place_Area" && !isViewMode && (
              <View style={styles.viewField}>
                <Text style={styles.label}>{t("color")}</Text>
                <View style={colorStyles.colorRow}>
                  {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color.value}
                      style={[
                        colorStyles.colorButton,
                        { backgroundColor: color.value },
                        (item.attributes?.color || "#00FF00") === color.value &&
                          colorStyles.colorButtonSelected,
                      ]}
                      onPress={() =>
                        onChangeItem({
                          ...item,
                          attributes: {
                            ...item.attributes,
                            color: color.value,
                          },
                        })
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Color display for areas in view mode */}
            {item.placeType === "Place_Area" &&
              isViewMode &&
              item.attributes?.color && (
                <View style={styles.viewField}>
                  <Text style={styles.viewLabel}>{t("color")}</Text>
                  <View
                    style={[
                      colorStyles.colorPreview,
                      { backgroundColor: item.attributes.color },
                    ]}
                  />
                </View>
              )}

            {/* Attributes - read-only view for areas */}
            {isViewMode &&
              item.placeType === "Place_Area" &&
              item.attributes?.site && (
                <View style={styles.attributesSection}>
                  <Text style={styles.viewLabel}>{t("attributes")}</Text>
                  {(() => {
                    const siteAttributes = item.attributes?.site || {};
                    const siteIndexSpec = getSiteIndexSpec(siteAttributes);

                    return Object.keys(siteAttributes)
                      .sort()
                      .map((key) => {
                        const value = siteAttributes[key];

                        if (
                          siteIndexSpec &&
                          (key === "species" || key === "speciesHeight")
                        ) {
                          return null; // Legacy fields already represented by SiteIndexSpec
                        }

                        if (key === "SiteIndexSpec") {
                          const speciesValue = siteIndexSpec?.species;
                          const heightValue = siteIndexSpec?.speciesHeight;
                          const speciesCode =
                            speciesValue && typeof speciesValue === "object"
                              ? (speciesValue as any).code
                              : speciesValue;
                          const displayText = heightValue
                            ? `${speciesCode}${heightValue}`
                            : speciesCode || "";

                          return (
                            <View key={key} style={styles.viewField}>
                              <Text style={styles.propertyKey}>
                                {getAttributeName("SiteIndexSpec")}:
                              </Text>
                              <Text style={styles.propertyValue}>
                                {displayText}
                              </Text>
                            </View>
                          );
                        }

                        // Legacy species display when no composite exists
                        if (key === "species") {
                          const speciesValue = siteAttributes.species;
                          const heightValue = siteAttributes.speciesHeight;
                          const speciesCode =
                            speciesValue && typeof speciesValue === "object"
                              ? (speciesValue as any).code
                              : speciesValue;
                          const displayText = heightValue
                            ? `${speciesCode}${heightValue}`
                            : speciesCode || "";

                          return (
                            <View key={key} style={styles.viewField}>
                              <Text style={styles.propertyKey}>
                                {getAttributeName("SiteIndexSpec")}:
                              </Text>
                              <Text style={styles.propertyValue}>
                                {displayText}
                              </Text>
                            </View>
                          );
                        }

                        if (key === "speciesHeight") {
                          return null;
                        }

                        if (key === "areaHa") {
                          return (
                            <View key={key} style={styles.viewField}>
                              <Text style={styles.propertyKey}>
                                {getAttributeName(key)}:
                              </Text>
                              <Text style={styles.propertyValue}>
                                {typeof value === "number"
                                  ? value.toFixed(2)
                                  : value || ""}
                              </Text>
                            </View>
                          );
                        }

                        if (value && typeof value === "object") {
                          const displayValue = formatValue(value);
                          return (
                            <View key={key} style={styles.viewField}>
                              <Text style={styles.propertyKey}>
                                {getAttributeName(key)}:
                              </Text>
                              <Text style={styles.propertyValue}>
                                {displayValue}
                              </Text>
                            </View>
                          );
                        }

                        return (
                          <View key={key} style={styles.viewField}>
                            <Text style={styles.propertyKey}>
                              {getAttributeName(key)}:
                            </Text>
                            <Text style={styles.propertyValue}>
                              {value || ""}
                            </Text>
                          </View>
                        );
                      });
                  })()}
                </View>
              )}

            {/* Attributes - editable for areas */}
            {isEditMode && item.placeType === "Place_Area" && (
              <View style={styles.attributesSection}>
                <Text style={styles.historySectionTitle}>
                  {t("attributes")}
                </Text>
                {Object.keys(item.attributes?.site || {})
                  .sort()
                  .map((key) => {
                    const value = item.attributes?.site?.[key];
                    const options = attributeOptions[key];
                    const attributeType = getAttributeType(key);

                    const siteAttributes = item.attributes?.site || {};
                    const siteIndexSpec = getSiteIndexSpec(siteAttributes);

                    // Special handling for SiteIndexSpec (species + height)
                    if (
                      key === "SiteIndexSpec" ||
                      (key === "species" && !siteAttributes.SiteIndexSpec)
                    ) {
                      const composite = siteIndexSpec || {};
                      const speciesValue = composite.species;
                      const heightValue = composite.speciesHeight;
                      const speciesOptions = attributeOptions["species"];

                      const rawCode =
                        speciesValue && typeof speciesValue === "object"
                          ? String((speciesValue as any).code ?? "")
                          : speciesValue != null
                          ? String(speciesValue)
                          : "";
                      let currentLabel =
                        speciesValue && typeof speciesValue === "object"
                          ? (speciesValue as any).label
                          : null;
                      let currentCode = rawCode;
                      if (!currentCode && currentLabel) {
                        const labelMatch = speciesOptions?.find(
                          (option) => option.label === currentLabel
                        );
                        if (labelMatch) {
                          currentCode = labelMatch.code;
                        }
                      }
                      if (currentCode && !currentLabel && speciesOptions) {
                        const codeMatch = speciesOptions.find(
                          (option) => option.code === currentCode
                        );
                        if (codeMatch?.label) {
                          currentLabel = codeMatch.label;
                        }
                      }
                      const hasCurrent = speciesOptions?.some(
                        (option) => option.code === currentCode
                      );
                      const pickerOptions =
                        hasCurrent || !currentCode
                          ? speciesOptions || []
                          : [
                              {
                                code: String(currentCode),
                                label: currentLabel || String(currentCode),
                              },
                              ...(speciesOptions || []),
                            ];
                      const emptyValue = "__none__";
                      const selectedValue =
                        pickerOptions.find(
                          (option) => option.code === currentCode
                        )?.code ?? emptyValue;

                      return (
                        <View
                          key="species-composite"
                          style={styles.attributeField}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.label}>
                              {getAttributeName("SiteIndexSpec")}
                            </Text>
                            {isAttributeRemovable("species") && (
                              <TouchableOpacity
                                onPress={() => removeAttribute("SiteIndexSpec")}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: "#FF3B30",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#FFFFFF",
                                    fontSize: 20,
                                    fontWeight: "bold",
                                  }}
                                >
                                  ×
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Species picker */}
                          <View style={styles.pickerWrapper}>
                            <Picker
                              key="picker-species"
                              selectedValue={String(selectedValue)}
                              mode="dropdown"
                              style={{
                                height: 50,
                                width: "100%",
                                color: "#000",
                              }}
                              onValueChange={(selected) => {
                                if (selected === emptyValue) {
                                  const newSite = buildSiteWithIndexSpec(() => {
                                    const next = { ...composite } as any;
                                    delete next.species;
                                    return Object.keys(next).length > 0
                                      ? next
                                      : {};
                                  });
                                  onChangeItem({
                                    ...item,
                                    attributes: {
                                      ...item.attributes,
                                      site: newSite,
                                    },
                                  });
                                  return;
                                }
                                const selectedOption = pickerOptions.find(
                                  (o) => o.code === selected
                                );
                                const newSite = buildSiteWithIndexSpec(() => ({
                                  ...composite,
                                  species: {
                                    code: selected,
                                    label: selectedOption?.label || null,
                                  },
                                }));

                                onChangeItem({
                                  ...item,
                                  attributes: {
                                    ...item.attributes,
                                    site: newSite,
                                  },
                                });
                              }}
                            >
                              <Picker.Item
                                label={t("selectOption")}
                                value={String(emptyValue)}
                              />
                              {pickerOptions.map((option) => {
                                const itemValue = String(option.code);
                                const itemLabel = option.label
                                  ? `(${itemValue}) ${option.label}`
                                  : itemValue;
                                return (
                                  <Picker.Item
                                    key={itemValue}
                                    label={itemLabel}
                                    value={itemValue}
                                  />
                                );
                              })}
                            </Picker>
                          </View>

                          {/* Height input */}
                          <Text style={styles.subLabel}>
                            {getAttributeName("speciesHeight")}
                          </Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="Height (m)"
                            value={heightValue ? String(heightValue) : ""}
                            onChangeText={(text) => {
                              const height = Number(text);
                              const newSite = buildSiteWithIndexSpec(() => {
                                const next = { ...composite } as any;
                                if (Number.isNaN(height)) {
                                  delete next.speciesHeight;
                                } else {
                                  next.speciesHeight = height;
                                }
                                return next;
                              });

                              onChangeItem({
                                ...item,
                                attributes: {
                                  ...item.attributes,
                                  site: newSite,
                                },
                              });
                            }}
                          />
                        </View>
                      );
                    }

                    if (key === "speciesHeight") {
                      return null;
                    }

                    if (siteAttributes.SiteIndexSpec && key === "species") {
                      return null;
                    }

                    // Handle number-type attributes
                    if (
                      attributeType === "number" ||
                      typeof value === "number"
                    ) {
                      const numValue =
                        typeof value === "number" ? String(value) : value || "";
                      return (
                        <View key={key} style={styles.attributeField}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.label}>
                              {getAttributeName(key)}
                            </Text>
                            {isAttributeRemovable(key) && (
                              <TouchableOpacity
                                onPress={() => removeAttribute(key)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: "#FF3B30",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#FFFFFF",
                                    fontSize: 20,
                                    fontWeight: "bold",
                                  }}
                                >
                                  ×
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={String(numValue)}
                            onChangeText={(text) => {
                              const numeric = Number(text);
                              onChangeItem({
                                ...item,
                                attributes: {
                                  ...item.attributes,
                                  site: {
                                    ...item.attributes?.site,
                                    [key]: Number.isNaN(numeric)
                                      ? undefined
                                      : numeric,
                                  },
                                },
                              });
                            }}
                          />
                        </View>
                      );
                    }

                    if (options && options.length > 0) {
                      const rawCode =
                        value && typeof value === "object"
                          ? String((value as any).code ?? "")
                          : value != null
                          ? String(value)
                          : "";
                      let currentLabel =
                        value && typeof value === "object"
                          ? (value as any).label
                          : null;
                      let currentCode = rawCode;
                      if (!currentCode && currentLabel) {
                        const labelMatch = options.find(
                          (option) => option.label === currentLabel
                        );
                        if (labelMatch) {
                          currentCode = labelMatch.code;
                        }
                      }
                      if (currentCode && !currentLabel) {
                        const codeMatch = options.find(
                          (option) => option.code === currentCode
                        );
                        if (codeMatch?.label) {
                          currentLabel = codeMatch.label;
                        }
                      }
                      const hasCurrent = options.some(
                        (option) => option.code === currentCode
                      );
                      const pickerOptions =
                        hasCurrent || !currentCode
                          ? options
                          : [
                              {
                                code: String(currentCode),
                                label: currentLabel || String(currentCode),
                              },
                              ...options,
                            ];
                      const emptyValue = "__none__";
                      const selectedValue =
                        pickerOptions.find(
                          (option) => option.code === currentCode
                        )?.code ?? emptyValue;

                      return (
                        <View key={key} style={styles.attributeField}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text style={styles.label}>
                              {getAttributeName(key)}
                            </Text>
                            {isAttributeRemovable(key) && (
                              <TouchableOpacity
                                onPress={() => removeAttribute(key)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: "#FF3B30",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#FFFFFF",
                                    fontSize: 20,
                                    fontWeight: "bold",
                                  }}
                                >
                                  ×
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={styles.pickerWrapper}>
                            <Picker
                              key={`picker-${key}`}
                              selectedValue={String(selectedValue)}
                              mode="dropdown"
                              style={{
                                height: 50,
                                width: "100%",
                                color: "#000",
                              }}
                              onValueChange={(selected) => {
                                const selectedCode = String(selected || "");
                                if (
                                  !selectedCode ||
                                  selectedCode === emptyValue
                                ) {
                                  return;
                                }
                                const option = pickerOptions.find(
                                  (entry) => entry.code === selectedCode
                                );
                                onChangeItem({
                                  ...item,
                                  attributes: {
                                    ...item.attributes,
                                    site: {
                                      ...item.attributes?.site,
                                      [key]: {
                                        code: selectedCode,
                                        label: option?.label ?? null,
                                      },
                                    },
                                  },
                                });
                              }}
                            >
                              <Picker.Item
                                label={t("selectOption")}
                                value={String(emptyValue)}
                              />
                              {pickerOptions.map((option) => {
                                const itemValue = String(option.code);
                                const itemLabel = option.label
                                  ? `(${itemValue}) ${option.label}`
                                  : itemValue;
                                return (
                                  <Picker.Item
                                    key={itemValue}
                                    label={itemLabel}
                                    value={itemValue}
                                  />
                                );
                              })}
                            </Picker>
                          </View>
                        </View>
                      );
                    }

                    if (value && typeof value === "object") {
                      const codeValue = (value as any).code || "";
                      const labelValue = (value as any).label || "";
                      return (
                        <View key={key} style={styles.attributeField}>
                          <Text style={styles.label}>
                            {getAttributeName(key)}
                          </Text>
                          <Text style={styles.subLabel}>{t("label")}</Text>
                          <TextInput
                            style={styles.input}
                            value={labelValue}
                            onChangeText={(text) =>
                              onChangeItem({
                                ...item,
                                attributes: {
                                  ...item.attributes,
                                  [key]: {
                                    code: codeValue,
                                    label: text,
                                  },
                                },
                              })
                            }
                          />
                          <Text style={styles.subLabel}>{t("code")}</Text>
                          <TextInput
                            style={styles.input}
                            value={codeValue}
                            onChangeText={(text) =>
                              onChangeItem({
                                ...item,
                                attributes: {
                                  ...item.attributes,
                                  [key]: {
                                    code: text,
                                    label: labelValue,
                                  },
                                },
                              })
                            }
                          />
                        </View>
                      );
                    }

                    return (
                      <View key={key} style={styles.attributeField}>
                        <Text style={styles.label}>
                          {getAttributeName(key)}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={value == null ? "" : String(value)}
                          onChangeText={(text) =>
                            onChangeItem({
                              ...item,
                              attributes: {
                                ...item.attributes,
                                [key]: text,
                              },
                            })
                          }
                        />
                      </View>
                    );
                  })}

                {/* Add Attribute Picker */}
                {(() => {
                  const availableToAdd = getAvailableAttributesToAdd();
                  if (availableToAdd.length === 0) {
                    return null; // All attributes already added
                  }

                  return (
                    <View style={styles.attributeField}>
                      <Text style={styles.label}>{t("addAttribute")}</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={selectedNewAttribute}
                          mode="dropdown"
                          style={{ height: 50, width: "100%", color: "#000" }}
                          onValueChange={(attrName) => {
                            if (attrName && attrName !== "__none__") {
                              addNewAttribute(attrName);
                            }
                          }}
                        >
                          <Picker.Item
                            label={t("selectAttributeToAdd")}
                            value="__none__"
                          />
                          {availableToAdd
                            .sort((a, b) =>
                              getAttributeName(a.name).localeCompare(
                                getAttributeName(b.name)
                              )
                            )
                            .map((attr) => (
                              <Picker.Item
                                key={attr.name}
                                label={getAttributeName(attr.name)}
                                value={attr.name}
                              />
                            ))}
                        </Picker>
                      </View>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Created date - only in view mode */}
            {isViewMode && item.createdAt && (
              <View style={styles.viewField}>
                <Text style={styles.viewLabel}>{t("created")}</Text>
                <Text style={styles.viewValue}>
                  {formatDate(item.createdAt)}
                </Text>
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
                  <Text style={styles.historySectionTitle}>
                    {t("userJournal")}
                  </Text>
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
                    <Text style={styles.label}>{t("body")}</Text>
                    <TextInput
                      style={[styles.input, styles.historyDescInput]}
                      placeholder={t("body")}
                      placeholderTextColor="#777"
                      value={newHistoryBody}
                      onChangeText={setNewHistoryBody}
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
                          setNewHistoryBody("");
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

                {item.userJournal && item.userJournal.length > 0 ? (
                  <View style={styles.historyList}>
                    {[...item.userJournal].reverse().map((entry, index) => (
                      <View key={index} style={styles.historyEntry}>
                        <Text style={styles.historyTimestamp}>
                          {formatDate(entry.timestamp)}
                        </Text>
                        <Text style={styles.historyEntryTitle}>
                          {entry.title}
                        </Text>
                        {entry.body ? (
                          <Text style={styles.historyDescription}>
                            {entry.body}
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
                    {t("noUserJournalEntries")}
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
