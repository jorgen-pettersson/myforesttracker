import { Coordinate, Place } from "../types";

export const calculateArea = (coords: Coordinate[]): number => {
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i].latitude * coords[j].longitude;
    area -= coords[j].latitude * coords[i].longitude;
  }
  return Math.abs(area / 2) * 111320 * 111320;
};

export const addItem = (places: Place[], place: Place) => {
  return [...places, place];
};

export const updateItem = (places: Place[], updatedPlace: Place) => {
  return places.map((place) =>
    place.id === updatedPlace.id ? updatedPlace : place
  );
};

export const removeItem = (places: Place[], id: string) => {
  return places.filter((place) => place.id !== id);
};

export const toggleItemVisibility = (places: Place[], id: string) => {
  return places.map((place) =>
    place.id === id
      ? { ...place, visible: place.visible === false ? true : false }
      : place
  );
};

export const importItems = (_places: Place[], newPlaces: Place[]) => {
  return newPlaces;
};

export const appendItems = (places: Place[], newPlaces: Place[]) => {
  const result = [...places];
  for (const newPlace of newPlaces) {
    const existingIndex = result.findIndex((place) => place.id === newPlace.id);
    if (existingIndex >= 0) {
      result[existingIndex] = {
        ...newPlace,
        userJournal: result[existingIndex].userJournal,
        media: result[existingIndex].media,
      };
    } else {
      result.push(newPlace);
    }
  }
  return result;
};
