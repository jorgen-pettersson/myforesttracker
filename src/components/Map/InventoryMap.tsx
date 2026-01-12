import React from 'react';
import {View} from 'react-native';
import MapView, {Marker, Polygon, PROVIDER_GOOGLE} from 'react-native-maps';
import {InventoryItem, Region, Coordinate, DrawingMode} from '../../types';
import {mapStyles as styles} from '../../styles';
import {Crosshair} from '../Crosshair';

const DEFAULT_AREA_COLOR = '#00FF00'; // Green

// Convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  // Handle color names by returning a default rgba
  if (!hex.startsWith('#')) {
    // Common color names mapping
    const colorMap: Record<string, string> = {
      red: '#FF0000',
      green: '#00FF00',
      blue: '#0000FF',
      yellow: '#FFFF00',
      orange: '#FFA500',
      purple: '#800080',
      pink: '#FFC0CB',
      brown: '#A52A2A',
      black: '#000000',
      white: '#FFFFFF',
      gray: '#808080',
      grey: '#808080',
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

type MapType = 'standard' | 'satellite' | 'hybrid';

interface InventoryMapProps {
  region: Region;
  onRegionChange: (region: Region) => void;
  mapType: MapType;
  items: InventoryItem[];
  areaPoints: Coordinate[];
  drawingMode: DrawingMode;
  repositionType?: 'point' | 'area';
  onConfirmLocation: () => void;
  onCompleteReposition?: () => void;
  onCancelReposition?: () => void;
  onItemPress?: (item: InventoryItem) => void;
}

export function InventoryMap({
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
}: InventoryMapProps) {
  return (
    <View style={styles.mapContainer}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        mapType={mapType}
        onRegionChangeComplete={onRegionChange}
        showsUserLocation
        showsMyLocationButton>
        {items
          .filter(item => item.visible !== false)
          .map(item => {
            if (item.type === 'point') {
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
              const areaColor = item.color || DEFAULT_AREA_COLOR;
              return (
                <Polygon
                  key={item.id}
                  coordinates={item.coordinates}
                  strokeColor="black"
                  fillColor={hexToRgba(areaColor, 0.3)}
                  strokeWidth={2}
                  tappable
                  onPress={() => onItemPress?.(item)}
                />
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
