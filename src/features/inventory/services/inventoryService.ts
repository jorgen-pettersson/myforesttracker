import { Coordinate, InventoryItem } from "../types";

export const calculateArea = (coords: Coordinate[]): number => {
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i].latitude * coords[j].longitude;
    area -= coords[j].latitude * coords[i].longitude;
  }
  return Math.abs(area / 2) * 111320 * 111320;
};

export const addItem = (items: InventoryItem[], item: InventoryItem) => {
  return [...items, item];
};

export const updateItem = (
  items: InventoryItem[],
  updatedItem: InventoryItem
) => {
  return items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
};

export const removeItem = (items: InventoryItem[], id: string) => {
  return items.filter((item) => item.id !== id);
};

export const toggleItemVisibility = (items: InventoryItem[], id: string) => {
  return items.map((item) =>
    item.id === id ? { ...item, visible: !item.visible } : item
  );
};

export const importItems = (
  _items: InventoryItem[],
  newItems: InventoryItem[]
) => {
  return newItems;
};

export const appendItems = (
  items: InventoryItem[],
  newItems: InventoryItem[]
) => {
  const result = [...items];
  for (const newItem of newItems) {
    const existingIndex = result.findIndex((item) => item.id === newItem.id);
    if (existingIndex >= 0) {
      result[existingIndex] = {
        ...newItem,
        history: result[existingIndex].history,
        media: result[existingIndex].media,
      };
    } else {
      result.push(newItem);
    }
  }
  return result;
};
