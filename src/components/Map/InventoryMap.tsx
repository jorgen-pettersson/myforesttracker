import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import {
  InventoryItem,
  InventoryArea,
  Region,
  Coordinate,
  DrawingMode,
} from "../../types";
import { mapStyles as styles } from "../../styles";
import { Crosshair } from "../Crosshair";

const DEFAULT_AREA_COLOR = "#00FF00"; // Green

// Check if a point is inside a polygon using ray casting
const pointInPolygon = (point: Coordinate, polygon: Coordinate[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude,
      yi = polygon[i].latitude;
    const xj = polygon[j].longitude,
      yj = polygon[j].latitude;
    if (
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
};

// Get bounding box of polygon
const getBounds = (coords: Coordinate[]) => {
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  }
  return { minLat, maxLat, minLng, maxLng };
};

// Calculate distance from point to line segment
const distToSegment = (p: Coordinate, v: Coordinate, w: Coordinate): number => {
  const px = p.longitude,
    py = p.latitude;
  const vx = v.longitude,
    vy = v.latitude;
  const wx = w.longitude,
    wy = w.latitude;

  const l2 = (vx - wx) * (vx - wx) + (vy - wy) * (vy - wy);
  if (l2 === 0) return Math.sqrt((px - vx) * (px - vx) + (py - vy) * (py - vy));

  let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = vx + t * (wx - vx);
  const projY = vy + t * (wy - vy);

  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
};

// Calculate minimum distance from point to polygon edges
const distToPolygonEdge = (
  point: Coordinate,
  polygon: Coordinate[]
): number => {
  let minDist = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const dist = distToSegment(point, polygon[j], polygon[i]);
    minDist = Math.min(minDist, dist);
  }
  return minDist;
};

// Find visual center - point inside polygon farthest from edges
export const getVisualCenter = (coords: Coordinate[]): Coordinate => {
  const bounds = getBounds(coords);

  // Sample grid to find point with maximum distance from edges
  const gridSize = 15;
  const latStep = (bounds.maxLat - bounds.minLat) / gridSize;
  const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;

  let bestPoint = {
    latitude: (bounds.minLat + bounds.maxLat) / 2,
    longitude: (bounds.minLng + bounds.maxLng) / 2,
  };
  let bestDist = -1;

  // First pass: coarse grid
  for (
    let lat = bounds.minLat + latStep / 2;
    lat < bounds.maxLat;
    lat += latStep
  ) {
    for (
      let lng = bounds.minLng + lngStep / 2;
      lng < bounds.maxLng;
      lng += lngStep
    ) {
      const point = { latitude: lat, longitude: lng };
      if (pointInPolygon(point, coords)) {
        const dist = distToPolygonEdge(point, coords);
        if (dist > bestDist) {
          bestDist = dist;
          bestPoint = point;
        }
      }
    }
  }

  // Second pass: refine around best point
  if (bestDist > 0) {
    const refineLat = latStep;
    const refineLng = lngStep;
    const refineStep = 5;
    for (
      let lat = bestPoint.latitude - refineLat;
      lat <= bestPoint.latitude + refineLat;
      lat += refineLat / refineStep
    ) {
      for (
        let lng = bestPoint.longitude - refineLng;
        lng <= bestPoint.longitude + refineLng;
        lng += refineLng / refineStep
      ) {
        const point = { latitude: lat, longitude: lng };
        if (pointInPolygon(point, coords)) {
          const dist = distToPolygonEdge(point, coords);
          if (dist > bestDist) {
            bestDist = dist;
            bestPoint = point;
          }
        }
      }
    }
  }

  return bestPoint;
};

// Format area in hectares
const formatAreaHa = (areaSqm: number | undefined): string => {
  if (!areaSqm) return "";
  const ha = areaSqm / 10000;
  if (ha >= 1) {
    return `${ha.toFixed(2)} ha`;
  }
  return `${(ha * 10000).toFixed(0)} m²`;
};

// Convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  // Handle color names by returning a default rgba
  if (!hex.startsWith("#")) {
    // Common color names mapping
    const colorMap: Record<string, string> = {
      red: "#FF0000",
      green: "#00FF00",
      blue: "#0000FF",
      yellow: "#FFFF00",
      orange: "#FFA500",
      purple: "#800080",
      pink: "#FFC0CB",
      brown: "#A52A2A",
      black: "#000000",
      white: "#FFFFFF",
      gray: "#808080",
      grey: "#808080",
    };
    hex = colorMap[hex.toLowerCase()] || DEFAULT_AREA_COLOR;
  }

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  return `rgba(0,255,0,${opacity})`; // Fallback to green
};

type MapType = "standard" | "satellite" | "hybrid";

interface InventoryMapProps {
  region: Region;
  onRegionChange: (region: Region) => void;
  mapType: MapType;
  items: InventoryItem[];
  areaPoints: Coordinate[];
  drawingMode: DrawingMode;
  repositionType?: "point" | "area";
  onConfirmLocation: () => void;
  onCompleteReposition?: () => void;
  onCancelReposition?: () => void;
  onItemPress?: (item: InventoryItem) => void;
}

export interface InventoryMapRef {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (
    coordinates: Coordinate[],
    edgePadding: { top: number; right: number; bottom: number; left: number },
    animated?: boolean
  ) => void;
}

export const InventoryMap = forwardRef<InventoryMapRef, InventoryMapProps>(
  (
    {
      region,
      onRegionChange,
      mapType,
      items,
      areaPoints,
      drawingMode,
      repositionType,
      onConfirmLocation,
      onCompleteReposition,
      onCancelReposition,
      onItemPress,
    },
    ref
  ) => {
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (targetRegion: Region, duration = 500) => {
        mapRef.current?.animateToRegion(targetRegion, duration);
      },
      fitToCoordinates: (
        coordinates: Coordinate[],
        edgePadding: {
          top: number;
          right: number;
          bottom: number;
          left: number;
        },
        animated = true
      ) => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding,
          animated,
        });
      },
    }));

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          mapType={mapType}
          onRegionChangeComplete={onRegionChange}
          showsUserLocation
          showsMyLocationButton
        >
          {items
            .filter((item) => item.visible !== false)
            .map((item) => {
              if (item.type === "point") {
                return (
                  <Marker
                    key={item.id}
                    coordinate={item.coordinate}
                    title={item.name}
                    description={item.notes}
                    pinColor="green"
                    onCalloutPress={() => onItemPress?.(item)}
                  />
                );
              } else {
                const areaItem = item as InventoryArea;
                const areaColor = areaItem.color || DEFAULT_AREA_COLOR;
                const labelPosition = getVisualCenter(areaItem.coordinates);
                return (
                  <React.Fragment key={areaItem.id}>
                    <Polygon
                      coordinates={areaItem.coordinates}
                      holes={areaItem.holes}
                      strokeColor="black"
                      fillColor={hexToRgba(areaColor, 0.3)}
                      strokeWidth={2}
                      tappable
                      onPress={() => onItemPress?.(areaItem)}
                    />
                    <Marker
                      coordinate={labelPosition}
                      anchor={{ x: 0.5, y: 0.5 }}
                      onPress={() => onItemPress?.(areaItem)}
                    >
                      <View style={labelStyles.container}>
                        <Text style={labelStyles.name} numberOfLines={1}>
                          {areaItem.name}
                        </Text>
                        <Text style={labelStyles.area}>
                          {formatAreaHa(areaItem.area)}
                        </Text>
                      </View>
                    </Marker>
                  </React.Fragment>
                );
              }
            })}

          {areaPoints.length > 0 && (
            <Polygon
              coordinates={areaPoints}
              strokeColor="blue"
              fillColor="rgba(0,0,255,0.2)"
              strokeWidth={2}
            />
          )}
        </MapView>

        <Crosshair
          drawingMode={drawingMode}
          areaPointsCount={areaPoints.length}
          repositionType={repositionType}
          onConfirm={onConfirmLocation}
          onCompleteReposition={onCompleteReposition}
          onCancelReposition={onCancelReposition}
        />
      </View>
    );
  }
);

const labelStyles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    maxWidth: 120,
  },
  name: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  area: {
    fontSize: 11,
    color: "#666",
  },
});
