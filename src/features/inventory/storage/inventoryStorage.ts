import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEY } from "./keys";
import { HistoryEntry, Place } from "../types";

type LegacyMediaItem = {
  id: string;
  uri: string;
  type: "photo" | "video";
  timestamp: string;
  thumbnailUri?: string;
};

type LegacyHistoryEntry = {
  timestamp: string;
  title: string;
  description: string;
  media: LegacyMediaItem[];
};

type LegacyInventoryItem = {
  id: string;
  type: "point" | "area";
  name: string;
  notes: string;
  visible: boolean;
  created: string;
  coordinate?: { latitude: number; longitude: number };
  coordinates?: { latitude: number; longitude: number }[];
  holes?: { latitude: number; longitude: number }[][];
  area?: number;
  color?: string;
  history?: LegacyHistoryEntry[];
  media?: LegacyMediaItem[];
  properties?: Record<string, any>;
};

type InventoryStorageV2 = {
  version: 2;
  places: Place[];
};

type InventoryStorageV3 = {
  version: 3;
  places: Place[];
};

const CURRENT_VERSION = 3;

const toGeoJsonPoint = (coordinate: {
  latitude: number;
  longitude: number;
}): GeoJSON.Point => ({
  type: "Point",
  coordinates: [coordinate.longitude, coordinate.latitude],
});

const toGeoJsonPolygon = (
  coordinates: { latitude: number; longitude: number }[],
  holes?: { latitude: number; longitude: number }[][]
): GeoJSON.Polygon => {
  const outer = coordinates.map((c) => [c.longitude, c.latitude]);
  if (outer.length > 0) {
    const [firstLng, firstLat] = outer[0];
    const [lastLng, lastLat] = outer[outer.length - 1];
    if (firstLng !== lastLng || firstLat !== lastLat) {
      outer.push([firstLng, firstLat]);
    }
  }

  const holeRings = (holes || []).map((ring) => {
    const coords = ring.map((c) => [c.longitude, c.latitude]);
    if (coords.length > 0) {
      const [firstLng, firstLat] = coords[0];
      const [lastLng, lastLat] = coords[coords.length - 1];
      if (firstLng !== lastLng || firstLat !== lastLat) {
        coords.push([firstLng, firstLat]);
      }
    }
    return coords;
  });

  return {
    type: "Polygon",
    coordinates: [outer, ...holeRings],
  };
};

const migrateLegacyMedia = (media: LegacyMediaItem[] | undefined) => {
  return (media || []).map((item) => ({
    id: item.id,
    uri: item.uri,
    type: item.type,
    createdAt: item.timestamp,
    thumbnailUri: item.thumbnailUri,
  }));
};

const migrateLegacyHistory = (history: LegacyHistoryEntry[] | undefined) => {
  return (history || []).map((entry) => ({
    timestamp: entry.timestamp,
    title: entry.title,
    body: entry.description,
    media: migrateLegacyMedia(entry.media),
  }));
};

const migrateLegacyItem = (item: LegacyInventoryItem): Place => {
  const now = new Date().toISOString();
  const isPoint = item.type === "point";
  const geometry =
    isPoint && item.coordinate
      ? toGeoJsonPoint(item.coordinate)
      : item.coordinates
      ? toGeoJsonPolygon(item.coordinates, item.holes)
      : null;

  return {
    id: item.id,
    placeType: isPoint ? "Place_Point" : "Place_Area",
    source: {
      system: "legacy",
      importedAt: now,
    },
    attributes: {
      name: item.name || undefined,
      notes: item.notes || undefined,
      areaHa: item.area ? item.area / 10000 : undefined,
      color: item.color,
    },
    geometries: geometry
      ? [
          {
            geometry,
            crs: "EPSG:4326",
          },
        ]
      : [],
    relations: [],
    userJournal: migrateLegacyHistory(item.history),
    media: migrateLegacyMedia(item.media),
    visible: item.visible,
    createdAt: item.created,
    properties: item.properties,
  };
};

export const normalizeInventoryData = (parsed: any): Place[] => {
  if (Array.isArray(parsed)) {
    const legacyItems = parsed as LegacyInventoryItem[];
    return legacyItems.map((item) => migrateLegacyItem(item));
  }

  // Version 3: With change tracking (backwards compatible)
  if (parsed && parsed.version === 3 && Array.isArray(parsed.places)) {
    const stored = parsed as InventoryStorageV3;
    return stored.places.map((place) => ({
      ...place,
      userJournal: (place.userJournal || []).map((entry: HistoryEntry) => ({
        ...entry,
        media: entry.media || [],
      })),
      media: place.media || [],
      changeHistory: place.changeHistory || [],
    }));
  }

  // Version 2: Pre-change tracking
  if (parsed && parsed.version === 2 && Array.isArray(parsed.places)) {
    const stored = parsed as InventoryStorageV2;
    return stored.places.map((place) => ({
      ...place,
      userJournal: (place.userJournal || []).map((entry: HistoryEntry) => ({
        ...entry,
        media: entry.media || [],
      })),
      media: place.media || [],
      changeHistory: [], // Initialize empty for v2 data
    }));
  }

  return [];
};

export const loadInventory = async (): Promise<Place[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return normalizeInventoryData(parsed);
    }
  } catch (error) {
    console.log("Error loading data:", error);
  }

  return [];
};

export const saveInventory = async (places: Place[]) => {
  try {
    const payload: InventoryStorageV3 = {
      version: CURRENT_VERSION,
      places,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.log("Error saving data:", error);
  }
};
