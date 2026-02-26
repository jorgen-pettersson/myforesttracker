import { Region } from "./types";

export const STORAGE_KEY = "@forestry_inventory";

export const DEFAULT_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export const FORESTAND_IMPORT_URL =
  "https://myforesttracker.gcp.jknowledge.se/api/forestand/convert/geojsonv2";
