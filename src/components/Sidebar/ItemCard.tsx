import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {InventoryItem} from '../../types';
import {itemCardStyles as styles} from '../../styles';
import {formatArea} from '../../utils';

interface ItemCardProps {
  item: InventoryItem;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (item: InventoryItem) => void;
  onReposition: (item: InventoryItem) => void;
}

export function ItemCard({item, onToggleVisibility, onDelete, onView, onReposition}: ItemCardProps) {
  return (
    <TouchableOpacity
      style={[styles.itemCard, item.visible === false && styles.itemCardHidden]}
      onPress={() => onView(item)}
      activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemType}>
          {item.type === 'point' ? '📌' : '⬜'}
        </Text>
        <Text style={styles.itemName}>{item.name}</Text>
        <TouchableOpacity
          style={styles.visibilityButton}
          onPress={() => onToggleVisibility(item.id)}>
          <Text style={styles.visibilityText}>
            {item.visible !== false ? '👁' : '👁‍🗨'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.itemDetail}>
        {new Date(item.created).toLocaleString()}
      </Text>
      {item.type === 'area' && item.area && (
        <Text style={styles.itemDetail}>Area: {formatArea(item.area)}</Text>
      )}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.repositionButton}
          onPress={() => onReposition(item)}>
          <Text style={styles.buttonText}>Move</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item.id)}>
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
