import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import { InventoryItem } from "../../types";
import { sidebarStyles as styles } from "../../styles";
import { ItemCard } from "./ItemCard";
import { useLocalization } from "../../localization";

interface SidebarProps {
  visible: boolean;
  items: InventoryItem[];
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (item: InventoryItem) => void;
  onReposition: (item: InventoryItem) => void;
  onExport: (format: "json" | "csv" | "geojson" | "all") => void;
  onImport: () => void;
  onClose: () => void;
}

export function Sidebar({
  visible,
  items,
  onToggleVisibility,
  onDelete,
  onView,
  onReposition,
  onExport,
  onImport,
  onClose,
}: SidebarProps) {
  if (!visible) {
    return null;
  }

  const { t } = useLocalization();

  const handleExport = () => {
    Alert.alert(t("exportFormat"), t("chooseExportFormat"), [
      {
        text: t("allFormats"),
        onPress: () => onExport("all"),
      },
      {
        text: t("jsonOnly"),
        onPress: () => onExport("json"),
      },
      {
        text: t("csvOnly"),
        onPress: () => onExport("csv"),
      },
      {
        text: t("geoJsonOnly"),
        onPress: () => onExport("geojson"),
      },
      {
        text: t("cancel"),
        style: "cancel",
      },
    ]);
  };

  return (
    <>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>
          {t("itemsCount", { count: items.length })}
        </Text>
        <ScrollView style={styles.itemsList}>
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleVisibility={onToggleVisibility}
              onDelete={onDelete}
              onView={onView}
              onReposition={onReposition}
            />
          ))}
        </ScrollView>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportText}>{t("export")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importButton} onPress={onImport}>
            <Text style={styles.exportText}>{t("import")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
