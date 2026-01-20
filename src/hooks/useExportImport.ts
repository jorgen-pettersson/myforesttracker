import {Alert} from 'react-native';
import RNFS from 'react-native-fs';
import {zip, unzip} from 'react-native-zip-archive';
import Share from 'react-native-share';
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {InventoryItem, InventoryPoint, InventoryArea, MediaItem, HistoryEntry, Coordinate} from '../types';

const EXPORT_DIR = `${RNFS.CachesDirectoryPath}/export`;
const IMPORT_DIR = `${RNFS.CachesDirectoryPath}/import`;
const MEDIA_DIR = `${RNFS.DocumentDirectoryPath}/media`;

// Calculate area in square meters from coordinates
const calculateArea = (coords: Coordinate[]): number => {
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i].latitude * coords[j].longitude;
    area -= coords[j].latitude * coords[i].longitude;
  }
  return Math.abs(area / 2) * 111320 * 111320;
};

export function useExportImport() {
  const ensureDir = async (dir: string) => {
    const exists = await RNFS.exists(dir);
    if (!exists) {
      await RNFS.mkdir(dir);
    }
  };

  const cleanDir = async (dir: string) => {
    const exists = await RNFS.exists(dir);
    if (exists) {
      await RNFS.unlink(dir);
    }
    await RNFS.mkdir(dir);
  };

  // Convert items to GeoJSON format
  const itemsToGeoJSON = (items: InventoryItem[]): object => {
    const features = items.map(item => {
      // Merge original properties with our properties
      const baseProps = {
        fid: item.id,
        name: item.name,
        notes: item.notes,
        visible: item.visible,
        created: item.created,
        mediaCount: item.media?.length || 0,
        historyCount: item.history?.length || 0,
      };

      // Include original imported properties, but let our values override
      const mergedProps = item.properties
        ? {...item.properties, ...baseProps}
        : baseProps;

      if (item.type === 'point') {
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [item.coordinate.longitude, item.coordinate.latitude],
          },
          properties: mergedProps,
        };
      } else {
        // Area - Polygon
        const coordinates = item.coordinates.map(c => [c.longitude, c.latitude]);
        // Close the polygon by adding the first point at the end
        if (coordinates.length > 0) {
          coordinates.push(coordinates[0]);
        }
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
          properties: {
            ...mergedProps,
            area_sqm: item.area,
            color: item.color,
          },
        };
      }
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  };

  // Convert items to CSV format
  const itemsToCSV = (items: InventoryItem[]): string => {
    const headers = [
      'id',
      'type',
      'name',
      'notes',
      'visible',
      'created',
      'latitude',
      'longitude',
      'area_sqm',
      'media_count',
      'history_count',
    ];

    const rows = items.map(item => {
      const lat = item.type === 'point' ? item.coordinate.latitude : item.coordinates[0]?.latitude || '';
      const lng = item.type === 'point' ? item.coordinate.longitude : item.coordinates[0]?.longitude || '';
      const area = item.type === 'area' ? item.area?.toFixed(2) || '' : '';

      return [
        item.id,
        item.type,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.visible,
        item.created,
        lat,
        lng,
        area,
        item.media?.length || 0,
        item.history?.length || 0,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  };

  // Collect all media files from items
  const collectMediaFiles = (items: InventoryItem[]): MediaItem[] => {
    const allMedia: MediaItem[] = [];

    for (const item of items) {
      if (item.media) {
        allMedia.push(...item.media);
      }
      if (item.history) {
        for (const entry of item.history) {
          if (entry.media) {
            allMedia.push(...entry.media);
          }
        }
      }
    }

    return allMedia;
  };

  // Update media URIs to relative paths for export
  const prepareItemsForExport = (items: InventoryItem[]): InventoryItem[] => {
    return items.map(item => ({
      ...item,
      media: item.media?.map(m => ({
        ...m,
        uri: `media/${m.id}.${m.type === 'video' ? 'mp4' : 'jpg'}`,
      })) || [],
      history: item.history?.map(h => ({
        ...h,
        media: h.media?.map(m => ({
          ...m,
          uri: `media/${m.id}.${m.type === 'video' ? 'mp4' : 'jpg'}`,
        })) || [],
      })) || [],
    }));
  };

  // Export as ZIP bundle
  const exportData = async (
    items: InventoryItem[],
    format: 'json' | 'csv' | 'geojson' | 'all' = 'all',
  ): Promise<boolean> => {
    try {
      await cleanDir(EXPORT_DIR);
      const mediaDir = `${EXPORT_DIR}/media`;
      await ensureDir(mediaDir);

      // Copy media files
      const allMedia = collectMediaFiles(items);
      for (const media of allMedia) {
        const sourcePath = media.uri.replace('file://', '');
        const ext = media.type === 'video' ? 'mp4' : 'jpg';
        const destPath = `${mediaDir}/${media.id}.${ext}`;

        const exists = await RNFS.exists(sourcePath);
        if (exists) {
          await RNFS.copyFile(sourcePath, destPath);
        }
      }

      // Prepare items with relative media paths
      const exportItems = prepareItemsForExport(items);

      // Write JSON
      if (format === 'json' || format === 'all') {
        const jsonData = JSON.stringify(exportItems, null, 2);
        await RNFS.writeFile(`${EXPORT_DIR}/data.json`, jsonData, 'utf8');
      }

      // Write CSV
      if (format === 'csv' || format === 'all') {
        const csvData = itemsToCSV(items);
        await RNFS.writeFile(`${EXPORT_DIR}/data.csv`, csvData, 'utf8');
      }

      // Write GeoJSON
      if (format === 'geojson' || format === 'all') {
        const geoJsonData = JSON.stringify(itemsToGeoJSON(items), null, 2);
        await RNFS.writeFile(`${EXPORT_DIR}/data.geojson`, geoJsonData, 'utf8');
      }

      // Create ZIP
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const zipPath = `${RNFS.CachesDirectoryPath}/forestry_export_${timestamp}.zip`;

      await zip(EXPORT_DIR, zipPath);

      // Share the ZIP file
      await Share.open({
        url: `file://${zipPath}`,
        type: 'application/zip',
        filename: `forestry_export_${timestamp}.zip`,
      });

      return true;
    } catch (error: any) {
      if (error?.message?.includes('User did not share')) {
        return true; // User cancelled share, not an error
      }
      console.error('Export error:', error);
      Alert.alert('Export Error', 'Failed to export data: ' + error.message);
      return false;
    }
  };

  // Import from ZIP bundle
  const importData = async (): Promise<InventoryItem[] | null> => {
    try {
      // Pick ZIP file
      const result = await pick({
        type: [types.zip, types.allFiles],
      });

      const file = result[0];
      if (!file?.uri) {
        return null;
      }

      await cleanDir(IMPORT_DIR);
      await ensureDir(MEDIA_DIR);

      // Copy file to cache if needed (for content:// URIs)
      let zipPath = file.uri;
      if (file.uri.startsWith('content://')) {
        zipPath = `${RNFS.CachesDirectoryPath}/import.zip`;
        await RNFS.copyFile(file.uri, zipPath);
      }

      // Unzip
      await unzip(zipPath.replace('file://', ''), IMPORT_DIR);

      // Read JSON data
      const jsonPath = `${IMPORT_DIR}/data.json`;
      const jsonExists = await RNFS.exists(jsonPath);

      if (!jsonExists) {
        Alert.alert('Import Error', 'No data.json found in the ZIP file');
        return null;
      }

      const jsonData = await RNFS.readFile(jsonPath, 'utf8');
      const importedItems: InventoryItem[] = JSON.parse(jsonData);

      // Copy media files and update URIs
      const importMediaDir = `${IMPORT_DIR}/media`;
      const mediaExists = await RNFS.exists(importMediaDir);

      const updateMediaUri = async (media: MediaItem): Promise<MediaItem> => {
        if (mediaExists) {
          const ext = media.type === 'video' ? 'mp4' : 'jpg';
          const sourceFile = `${importMediaDir}/${media.id}.${ext}`;
          const destFile = `${MEDIA_DIR}/${media.id}.${ext}`;

          const exists = await RNFS.exists(sourceFile);
          if (exists) {
            await RNFS.copyFile(sourceFile, destFile);
            return {
              ...media,
              uri: `file://${destFile}`,
            };
          }
        }
        return media;
      };

      // Process all items and update media URIs
      const processedItems: InventoryItem[] = [];

      for (const item of importedItems) {
        const updatedMedia: MediaItem[] = [];
        for (const m of item.media || []) {
          updatedMedia.push(await updateMediaUri(m));
        }

        const updatedHistory: HistoryEntry[] = [];
        for (const h of item.history || []) {
          const historyMedia: MediaItem[] = [];
          for (const m of h.media || []) {
            historyMedia.push(await updateMediaUri(m));
          }
          updatedHistory.push({...h, media: historyMedia});
        }

        processedItems.push({
          ...item,
          media: updatedMedia,
          history: updatedHistory,
        });
      }

      return processedItems;
    } catch (error: any) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return null; // User cancelled
      }
      console.error('Import error:', error);
      Alert.alert('Import Error', 'Failed to import data: ' + error.message);
      return null;
    }
  };

  // Flatten nested properties object into dot-notation keys
  const flattenProperties = (obj: any, prefix = ''): Record<string, any> => {
    const result: Record<string, any> = {};

    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(result, flattenProperties(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  };

  // Parse GeoJSON file and return data with available properties
  interface ParsedGeoJSON {
    features: any[];
    propertyKeys: string[];
    suggestedNameKey?: string;
  }

  const parseGeoJSON = async (): Promise<ParsedGeoJSON | null> => {
    try {
      const result = await pick({
        type: [types.allFiles],
      });

      const file = result[0];
      if (!file?.uri) {
        return null;
      }

      // Copy file to cache if needed (for content:// URIs)
      let filePath = file.uri;
      if (file.uri.startsWith('content://')) {
        filePath = `${RNFS.CachesDirectoryPath}/import.geojson`;
        await RNFS.copyFile(file.uri, filePath);
      }

      const geoJsonData = await RNFS.readFile(filePath.replace('file://', ''), 'utf8');
      const geoJson = JSON.parse(geoJsonData);

      if (!geoJson.features || !Array.isArray(geoJson.features)) {
        Alert.alert('Import Error', 'Invalid GeoJSON: no features array found');
        return null;
      }

      // Collect all unique property keys from all features (with flattened nested properties)
      const propertyKeysSet = new Set<string>();
      for (const feature of geoJson.features) {
        if (feature.properties) {
          const flattened = flattenProperties(feature.properties);
          Object.keys(flattened).forEach(key => propertyKeysSet.add(key));
        }
      }

      const propertyKeys = Array.from(propertyKeysSet).sort();

      // Find a suggested name key (prefer placeId or similar)
      let suggestedNameKey: string | undefined;
      const placeIdKey = propertyKeys.find(k => k.toLowerCase().endsWith('placeid'));
      if (placeIdKey) {
        suggestedNameKey = placeIdKey;
      } else {
        // Fall back to 'name' or 'id' if available
        suggestedNameKey = propertyKeys.find(k => k.toLowerCase() === 'name') ||
                          propertyKeys.find(k => k.toLowerCase() === 'id');
      }

      return {
        features: geoJson.features,
        propertyKeys,
        suggestedNameKey,
      };
    } catch (error: any) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return null;
      }
      console.error('GeoJSON parse error:', error);
      Alert.alert('Import Error', 'Failed to parse GeoJSON: ' + error.message);
      return null;
    }
  };

  // Get a value from an object using a dot-notation key
  const getNestedValue = (obj: any, key: string): any => {
    if (!key || !obj) {
      return undefined;
    }
    const parts = key.split('.');
    let value = obj;
    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }
    return value;
  };

  // Convert a GeoJSON ring to Coordinate array
  const ringToCoordinates = (ring: number[][]): Coordinate[] | null => {
    if (!ring || ring.length < 3) {
      return null;
    }

    let coords = ring.map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    // Remove the closing point if it's the same as the first
    if (coords.length > 1) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first.latitude === last.latitude && first.longitude === last.longitude) {
        coords = coords.slice(0, -1);
      }
    }

    if (coords.length < 3) {
      return null;
    }

    return coords;
  };

  // Helper to process a polygon (with potential holes) into an InventoryArea
  const processPolygon = (
    rings: number[][][], // Array of rings: [outerRing, hole1, hole2, ...]
    baseId: string,
    name: string,
    notes: string,
    props: any,
    now: string,
    suffix?: string,
  ): InventoryArea | null => {
    if (!rings || rings.length === 0) {
      return null;
    }

    // First ring is the outer boundary
    const outerCoords = ringToCoordinates(rings[0]);
    if (!outerCoords) {
      return null;
    }

    // Remaining rings are holes
    const holes: Coordinate[][] = [];
    for (let i = 1; i < rings.length; i++) {
      const holeCoords = ringToCoordinates(rings[i]);
      if (holeCoords) {
        holes.push(holeCoords);
      }
    }

    const flattened = flattenProperties(props);

    // Get color from properties (support various common property names, including nested)
    const color = flattened.color || flattened.Color || flattened.COLOR ||
                  flattened.fill || flattened.Fill || flattened.FILL ||
                  flattened.fillColor || flattened.FillColor || undefined;

    const id = suffix ? `${baseId}_${suffix}` : baseId;
    const itemName = suffix ? `${name} (${suffix})` : name;

    return {
      id,
      type: 'area',
      name: itemName,
      notes,
      visible: true,
      created: now,
      coordinates: outerCoords,
      holes: holes.length > 0 ? holes : undefined,
      area: calculateArea(outerCoords),
      history: [],
      media: [],
      properties: props,
      color,
    };
  };

  // Process parsed GeoJSON with property mappings
  const processGeoJSON = (
    features: any[],
    nameProperty: string,
    notesProperty: string,
  ): InventoryItem[] | null => {
    const now = new Date().toISOString();
    const items: InventoryItem[] = [];

    for (const feature of features) {
      if (!feature.geometry) {
        continue;
      }

      const props = feature.properties || {};
      // Support dot-notation for nested properties
      const name = nameProperty ? String(getNestedValue(props, nameProperty) || '') : '';
      const notes = notesProperty ? String(getNestedValue(props, notesProperty) || '') : '';

      // Use fid as unique id if it exists, otherwise generate one
      const baseId = props.fid != null
        ? String(props.fid)
        : Date.now().toString() + Math.random().toString(36).substr(2, 9);

      if (feature.geometry.type === 'Point') {
        const [longitude, latitude] = feature.geometry.coordinates;
        const point: InventoryPoint = {
          id: baseId,
          type: 'point',
          name,
          notes,
          visible: true,
          created: now,
          coordinate: {latitude, longitude},
          history: [],
          media: [],
          properties: props,
        };
        items.push(point);
      } else if (feature.geometry.type === 'Polygon') {
        // Polygon: all rings (outer + holes)
        const rings = feature.geometry.coordinates;
        const areaItem = processPolygon(rings, baseId, name, notes, props, now);
        if (areaItem) {
          items.push(areaItem);
        }
      } else if (feature.geometry.type === 'MultiPolygon') {
        // MultiPolygon: create separate items for each polygon (with their holes)
        const polygons = feature.geometry.coordinates;
        for (let i = 0; i < polygons.length; i++) {
          const rings = polygons[i]; // All rings of this polygon (outer + holes)
          const suffix = polygons.length > 1 ? String(i + 1) : undefined;
          const areaItem = processPolygon(rings, baseId, name, notes, props, now, suffix);
          if (areaItem) {
            items.push(areaItem);
          }
        }
      }
    }

    if (items.length === 0) {
      Alert.alert('Import Error', 'No valid Point or Polygon features found in GeoJSON');
      return null;
    }

    return items;
  };

  return {
    exportData,
    importData,
    parseGeoJSON,
    processGeoJSON,
  };
}
