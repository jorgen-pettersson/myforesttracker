import { Coordinate, Place } from "../features/inventory";
import { calculateArea } from "../features/inventory/services/inventoryService";

const toLatLng = (coord: number[]): Coordinate => ({
  latitude: coord[1],
  longitude: coord[0],
});

export const getPlaceAreaHa = (place: Place): number | undefined => {
  // Prefer stored attribute if present
  if (place.attributes?.areaHa !== undefined) {
    return place.attributes.areaHa;
  }

  const geometry = place.geometries?.[0]?.geometry;
  if (!geometry) return undefined;

  const polygonToArea = (coords: number[][]): number => {
    const latLng = coords.map(toLatLng);
    return calculateArea(latLng) / 10000; // to hectares
  };

  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates as number[][][];
    if (!rings?.length) return undefined;
    return polygonToArea(rings[0]);
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates as number[][][][];
    if (!polygons?.length || !polygons[0]?.length) return undefined;
    return polygonToArea(polygons[0][0]);
  }

  return undefined;
};
