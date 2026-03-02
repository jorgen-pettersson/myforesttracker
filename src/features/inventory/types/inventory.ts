export type UUID = string;

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export type DrawingMode = "none" | "point" | "area" | "reposition";

export interface MediaItem {
  id: string;
  uri: string;
  type: "photo" | "video";
  timestamp: string;
  thumbnailUri?: string;
}

export interface HistoryEntry {
  timestamp: string;
  title: string;
  description: string;
  media: MediaItem[];
}

export interface InventoryItemBase {
  id: UUID;
  name: string;
  notes: string;
  visible: boolean;
  created: string;
  history: HistoryEntry[];
  media: MediaItem[];
  properties?: Record<string, any>;
}

export interface InventoryPoint extends InventoryItemBase {
  type: "point";
  coordinate: Coordinate;
}

export interface InventoryArea extends InventoryItemBase {
  type: "area";
  coordinates: Coordinate[];
  holes?: Coordinate[][];
  area?: number;
  color?: string;
}

export type InventoryItem = InventoryPoint | InventoryArea;
