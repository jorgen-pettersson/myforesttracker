import { PlaceChange } from "./changeTracking";

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
  createdAt: string;
  thumbnailUri?: string;
  caption?: string;
}

export interface HistoryEntry {
  timestamp: string;
  title: string;
  body: string;
  media: MediaItem[];
}

export type PlaceType = "Place_Point" | "Place_Area";

export interface PlaceSource {
  system: string;
  sourceFile?: string;
  sourceIds?: Record<string, string>;
  importedAt?: string;
}

export interface SiteAttributes {
  [key: string]: { code?: string; label?: string | null } | any;
}

export interface PopulationData {
  treeLayer?: string;
  treeSpecies?: string;
  treeSpecies_ref?: string;
  objectPopulationId?: string;
  [key: string]: any; // ObsP_* observations
}

export interface PlaceAttributes {
  name?: string;
  notes?: string;
  areaHa?: number;
  site?: SiteAttributes;
  population?: PopulationData[];
  color?: string;
  parentPlaceId?: string;
  [key: string]: any;
}

export interface PlaceGeometry {
  id?: string;
  geometry: GeoJSON.Geometry;
  crs?: string;
  bbox?: number[];
  quality?: {
    source?: string;
    method?: string;
    confidence?: number;
  };
}

export interface PlaceRelation {
  type: string;
  targetPlaceId: string;
}

export interface Place {
  id: UUID;
  placeType: PlaceType;
  source?: PlaceSource;
  attributes?: PlaceAttributes;
  geometries?: PlaceGeometry[];
  relations?: PlaceRelation[];
  userJournal?: HistoryEntry[];
  media?: MediaItem[];
  visible?: boolean;
  createdAt?: string;
  modifiedAt?: string; // Last modification timestamp
  properties?: Record<string, any>;
  changeHistory?: PlaceChange[]; // Append-only audit trail
}
