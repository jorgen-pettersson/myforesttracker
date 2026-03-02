import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { InventoryItem } from "../types";
import { loadInventory, saveInventory } from "../storage/inventoryStorage";
import {
  addItem as addItemService,
  updateItem as updateItemService,
  removeItem as removeItemService,
  toggleItemVisibility as toggleItemVisibilityService,
  calculateArea,
  importItems as importItemsService,
  appendItems as appendItemsService,
} from "../services/inventoryService";
import { cleanupItemMedia } from "../services/mediaService";

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const loaded = await loadInventory();
      setItems(loaded);
    };
    load();
  }, []);

  useEffect(() => {
    saveInventory(items);
  }, [items]);

  const addItem = (item: InventoryItem) => {
    setItems((prev) => addItemService(prev, item));
  };

  const updateItem = (updatedItem: InventoryItem) => {
    setItems((prev) => updateItemService(prev, updatedItem));
  };

  const deleteItem = (id: string) => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const itemToDelete = items.find((item) => item.id === id);
          if (itemToDelete) {
            await cleanupItemMedia(itemToDelete);
          }
          setItems((prev) => removeItemService(prev, id));
        },
      },
    ]);
  };

  const toggleItemVisibility = (id: string) => {
    setItems((prev) => toggleItemVisibilityService(prev, id));
  };

  const importItems = (newItems: InventoryItem[]) => {
    setItems((prev) => importItemsService(prev, newItems));
  };

  const appendItems = (newItems: InventoryItem[]) => {
    setItems((prev) => appendItemsService(prev, newItems));
  };

  return {
    items,
    addItem,
    updateItem,
    deleteItem,
    toggleItemVisibility,
    calculateArea,
    importItems,
    appendItems,
  };
}
