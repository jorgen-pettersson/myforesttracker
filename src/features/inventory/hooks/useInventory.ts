import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { Place } from "../types";
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
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    const load = async () => {
      const loaded = await loadInventory();
      setPlaces(loaded);
    };
    load();
  }, []);

  useEffect(() => {
    saveInventory(places);
  }, [places]);

  const addItem = (place: Place) => {
    setPlaces((prev) => addItemService(prev, place));
  };

  const updateItem = (updatedPlace: Place) => {
    setPlaces((prev) => updateItemService(prev, updatedPlace));
  };

  const deleteItem = (id: string) => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const placeToDelete = places.find((place) => place.id === id);
          if (placeToDelete) {
            await cleanupItemMedia(placeToDelete);
          }
          setPlaces((prev) => removeItemService(prev, id));
        },
      },
    ]);
  };

  const toggleItemVisibility = (id: string) => {
    setPlaces((prev) => toggleItemVisibilityService(prev, id));
  };

  const importItems = (newPlaces: Place[]) => {
    setPlaces((prev) => importItemsService(prev, newPlaces));
  };

  const appendItems = (newPlaces: Place[]) => {
    setPlaces((prev) => appendItemsService(prev, newPlaces));
  };

  return {
    places,
    addItem,
    updateItem,
    deleteItem,
    toggleItemVisibility,
    calculateArea,
    importItems,
    appendItems,
  };
}
