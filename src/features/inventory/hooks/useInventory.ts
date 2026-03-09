import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { Place, ChangeActor } from "../types";
import { loadInventory, saveInventory } from "../storage/inventoryStorage";
import {
  addItem as addItemService,
  updateItem as updateItemService,
  removeItem as removeItemService,
  toggleItemVisibility as toggleItemVisibilityService,
  calculateArea,
  importItems as importItemsService,
  appendItems as appendItemsService,
  addItemWithTracking,
  updateItemWithTracking,
  toggleVisibilityWithTracking,
  importItemsWithTracking,
  appendItemsWithTracking,
} from "../services/inventoryService";
import { cleanupItemMedia } from "../services/mediaService";
import { getUserActor, getImportActor } from "../services/actorContext";

export function useInventory() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [actor, setActor] = useState<ChangeActor>({ type: "system" });

  // Initialize device-based actor on mount
  useEffect(() => {
    const initActor = async () => {
      const userActor = await getUserActor();
      setActor(userActor);
    };
    initActor();
  }, []);

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
    setPlaces((prev) => addItemWithTracking(prev, place, actor));
  };

  const updateItem = (updatedPlace: Place) => {
    setPlaces((prev) => updateItemWithTracking(prev, updatedPlace, actor));
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
    setPlaces((prev) => toggleVisibilityWithTracking(prev, id, actor));
  };

  const importItems = (newPlaces: Place[]) => {
    setPlaces((prev) => importItemsWithTracking(prev, newPlaces, "geojson"));
  };

  const appendItems = (newPlaces: Place[]) => {
    const importActor = getImportActor("geojson");
    setPlaces((prev) => appendItemsWithTracking(prev, newPlaces, importActor));
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
