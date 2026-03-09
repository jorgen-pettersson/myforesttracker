import { Coordinate, Place, ChangeActor } from "../types";
import {
  createChange,
  appendChange,
  diffPlaces,
  inferChangeKind,
  generateSummary,
  ensureGeometryIds,
} from "./changeTrackingService";
import { getImportActor } from "./actorContext";

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

/**
 * Add a place with change tracking
 */
export const addItemWithTracking = (
  places: Place[],
  place: Place,
  actor: ChangeActor
): Place[] => {
  try {
    // Create "place.created" change event
    const change = createChange({
      placeId: place.id,
      actor,
      kind: "place.created",
      patch: [
        {
          op: "add",
          path: "",
          value: {
            placeType: place.placeType,
            attributes: place.attributes,
            geometries: place.geometries,
          },
        },
      ],
      summary: `Created ${
        place.placeType === "Place_Point" ? "point" : "area"
      }`,
      metadata: {
        source: place.source?.system,
      },
    });

    const placeWithHistory = appendChange(place, change);
    return addItem(places, placeWithHistory);
  } catch (error) {
    console.error("[ChangeTracking] Failed to create change entry:", error);
    // Graceful degradation - proceed without tracking
    return addItem(places, place);
  }
};

/**
 * Update a place with change tracking
 */
export const updateItemWithTracking = (
  places: Place[],
  updatedPlace: Place,
  actor: ChangeActor,
  reason?: string
): Place[] => {
  try {
    const oldPlace = places.find((p) => p.id === updatedPlace.id);
    if (!oldPlace) {
      console.warn(
        `[ChangeTracking] Cannot update - place ${updatedPlace.id} not found`
      );
      return places;
    }

    // Generate diff
    const patch = diffPlaces(oldPlace, updatedPlace);

    // No changes? Return unchanged
    if (patch.length === 0) {
      return places;
    }

    // Infer change kind from patch
    const kind = inferChangeKind(patch);

    // Create change entry
    const change = createChange({
      placeId: updatedPlace.id,
      actor,
      kind,
      patch,
      summary: generateSummary(patch, kind),
      reason,
    });

    // Append change to history
    const placeWithHistory = appendChange(updatedPlace, change);

    return updateItem(places, placeWithHistory);
  } catch (error) {
    console.error("[ChangeTracking] Failed to create change entry:", error);
    // Graceful degradation - proceed without tracking
    return updateItem(places, updatedPlace);
  }
};

/**
 * Toggle visibility with change tracking
 */
export const toggleVisibilityWithTracking = (
  places: Place[],
  id: string,
  actor: ChangeActor
): Place[] => {
  try {
    const place = places.find((p) => p.id === id);
    if (!place) {
      return places;
    }

    const newVisibility = place.visible === false ? true : false;

    const change = createChange({
      placeId: id,
      actor,
      kind: "visibility.toggled",
      patch: [
        {
          op: "replace",
          path: "/visible",
          from: place.visible,
          value: newVisibility,
        },
      ],
      summary: newVisibility ? "Made visible" : "Made hidden",
    });

    const toggled = toggleItemVisibility(places, id);
    return toggled.map((p) => (p.id === id ? appendChange(p, change) : p));
  } catch (error) {
    console.error("[ChangeTracking] Failed to create change entry:", error);
    // Graceful degradation
    return toggleItemVisibility(places, id);
  }
};

/**
 * Import places with change tracking
 */
export const importItemsWithTracking = (
  places: Place[],
  newPlaces: Place[],
  source: string
): Place[] => {
  try {
    const actor = getImportActor(source);

    // Add "source.imported" change to each imported place
    const placesWithHistory = newPlaces.map((place) => {
      // Ensure geometry IDs exist
      const placeWithGeomIds = ensureGeometryIds(place);

      const change = createChange({
        placeId: placeWithGeomIds.id,
        actor,
        kind: "source.imported",
        patch: [
          {
            op: "add",
            path: "",
            value: {
              source: placeWithGeomIds.source,
              attributes: placeWithGeomIds.attributes,
              geometries: placeWithGeomIds.geometries,
            },
          },
        ],
        summary: `Imported from ${source}`,
        metadata: {
          sourceFile: placeWithGeomIds.source?.sourceFile,
          importedAt: placeWithGeomIds.source?.importedAt,
        },
      });

      return appendChange(placeWithGeomIds, change);
    });

    return importItems(places, placesWithHistory);
  } catch (error) {
    console.error("[ChangeTracking] Failed to create change entries:", error);
    // Graceful degradation
    return importItems(places, newPlaces);
  }
};

/**
 * Append places with change tracking (merge operation)
 */
export const appendItemsWithTracking = (
  places: Place[],
  newPlaces: Place[],
  actor: ChangeActor
): Place[] => {
  try {
    const result = [...places];

    for (const newPlace of newPlaces) {
      // Ensure geometry IDs exist
      const placeWithGeomIds = ensureGeometryIds(newPlace);

      const existingIndex = result.findIndex(
        (p) => p.id === placeWithGeomIds.id
      );

      if (existingIndex >= 0) {
        // Existing place - create reconciliation change
        const oldPlace = result[existingIndex];
        const patch = diffPlaces(oldPlace, placeWithGeomIds);

        if (patch.length > 0) {
          const change = createChange({
            placeId: placeWithGeomIds.id,
            actor,
            kind: "source.reconciled",
            patch,
            summary: "Reconciled with imported data",
          });

          result[existingIndex] = {
            ...placeWithGeomIds,
            userJournal: oldPlace.userJournal,
            media: oldPlace.media,
            changeHistory: [...(oldPlace.changeHistory || []), change],
            modifiedAt: change.at,
          };
        } else {
          // No changes, just preserve journal and media
          result[existingIndex] = {
            ...placeWithGeomIds,
            userJournal: oldPlace.userJournal,
            media: oldPlace.media,
            changeHistory: oldPlace.changeHistory,
            modifiedAt: oldPlace.modifiedAt,
          };
        }
      } else {
        // New place - add import change
        const change = createChange({
          placeId: placeWithGeomIds.id,
          actor,
          kind: "source.imported",
          patch: [{ op: "add", path: "", value: placeWithGeomIds }],
          summary: "Imported new place",
        });

        result.push(appendChange(placeWithGeomIds, change));
      }
    }

    return result;
  } catch (error) {
    console.error("[ChangeTracking] Failed to create change entries:", error);
    // Graceful degradation
    return appendItems(places, newPlaces);
  }
};
