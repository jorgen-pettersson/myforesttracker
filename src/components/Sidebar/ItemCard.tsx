import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Place } from "../../features/inventory";
import { itemCardStyles as styles } from "../../styles";
import { formatArea } from "../../utils";

interface ItemCardProps {
  item: Place;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (item: Place) => void;
  onReposition: (item: Place) => void;
}

export function ItemCard({
  item,
  onToggleVisibility,
  onDelete,
  onView,
  onReposition,
}: ItemCardProps) {
  return (
    <TouchableOpacity
      style={[styles.itemCard, item.visible === false && styles.itemCardHidden]}
      onPress={() => onView(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemType}>
          {item.placeType === "Place_Point" ? "📌" : "⬜"}
        </Text>
        <Text style={styles.itemName}>{item.attributes?.name || ""}</Text>
        <TouchableOpacity
          style={styles.visibilityButton}
          onPress={() => onToggleVisibility(item.id)}
        >
          <Text style={styles.visibilityText}>
            {item.visible !== false ? "👁" : "👁‍🗨"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.itemDetail}>
        {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
      </Text>
      {item.placeType === "Place_Area" && item.attributes?.areaHa && (
        <Text style={styles.itemDetail}>
          Area: {formatArea(item.attributes.areaHa * 10000)}
        </Text>
      )}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.repositionButton}
          onPress={() => onReposition(item)}
        >
          <Text style={styles.buttonText}>Move</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
