import { Alert } from "react-native";
import RNFS from "react-native-fs";
import { zip, unzip } from "react-native-zip-archive";
import Share from "react-native-share";
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from "@react-native-documents/picker";
import {
  Place,
  MediaItem,
  HistoryEntry,
  Coordinate,
} from "../../../features/inventory";
import { useLocalization } from "../../../localization";
import { convertForestandXmlToGeoJson } from "../services/forestandLocal";
import { ParsedGeoJSON, flattenProperties } from "../types/GeoJson";
import { normalizeInventoryData } from "../../../features/inventory/storage/inventoryStorage";
import {
  mapForestandFieldName,
  transformForestandCode,
} from "../services/forestandMappingService";
import { mapPopulationObservation } from "../services/populationMappingService";
import { getAttributeOptions } from "../../inventory/services/attributeService";
import { getPopulationAttributeOptions } from "../services/populationAttributeService";

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

export function useImportExport() {
  const { t } = useLocalization();

  const buildInternalAttributesFromSite = (site: any) => {
    if (!site || typeof site !== "object") {
      return {};
    }
    const internalAttributes: Record<string, any> = {};

    for (const [forestandField, value] of Object.entries(site)) {
      if (!value || typeof value !== "object") {
        continue;
      }

      // Special handling for ObsS_SIS (Site Index with species and height)
      if (forestandField === "ObsS_SIS") {
        const siteIndexSpec: Record<string, any> =
          internalAttributes.SiteIndexSpec || {};

        // Extract height from result.code (e.g., <sis:result uom="m">24</sis:result>)
        const result = (value as any).result;
        if (result?.code) {
          const heightValue = Number(result.code);
          if (!Number.isNaN(heightValue)) {
            siteIndexSpec.speciesHeight = heightValue;
          }
        }

        // Extract species from spec WITH code transformation
        const spec = (value as any).spec;
        if (spec?.species?.code) {
          const forestandSpeciesCode = String(spec.species.code);

          // Transform: Forestand species code → Internal species code
          // Uses ObsS_Species transformations (1→T, 2→G, etc.)
          const internalSpeciesCode = transformForestandCode(
            "ObsS_Species",
            forestandSpeciesCode
          );

          const speciesOptions = getAttributeOptions("species");
          const speciesOption = speciesOptions.find(
            (o) => o.code === internalSpeciesCode
          );

          siteIndexSpec.species = {
            code: internalSpeciesCode,
            label: speciesOption?.label || null,
          };
        }

        if (Object.keys(siteIndexSpec).length > 0) {
          internalAttributes.SiteIndexSpec = siteIndexSpec;
        }

        continue; // Skip regular processing for ObsS_SIS
      }

      const forestandCode = (value as any).code;
      const forestandLabel = (value as any).label ?? null;
      if (!forestandCode) {
        continue;
      }

      // Map Forestand field name to internal attribute name
      const attributeName = mapForestandFieldName(forestandField);
      if (!attributeName) {
        // Field not mapped - skip it
        continue;
      }

      // Transform code: Forestand → Internal
      const internalCode = transformForestandCode(
        forestandField,
        String(forestandCode)
      );

      // Look up label from attribute master using internal code
      const options = getAttributeOptions(attributeName);
      const option = options.find((o) => o.code === String(internalCode));

      internalAttributes[attributeName] = {
        code: String(internalCode),
        label: option?.label || forestandLabel,
      };
    }

    return internalAttributes;
  };

  const buildInternalPopulationAttributes = (
    forestandPopulation: any[] | undefined
  ): any[] | undefined => {
    if (!forestandPopulation || forestandPopulation.length === 0) {
      return undefined;
    }

    return forestandPopulation.map((pop) => {
      const internal: any = {};

      // Copy treeLayer as-is (Forestand provenance)
      if (pop.treeLayer) {
        internal.treeLayer = pop.treeLayer;
      }

      // Copy treeSpecies as-is
      if (pop.treeSpecies) {
        const speciesCode = String(pop.treeSpecies);
        const speciesOptions = getPopulationAttributeOptions("treeSpecies");
        const match = speciesOptions.find((o) => o.code === speciesCode);
        internal.treeSpecies = match
          ? { code: match.code, label: match.label }
          : speciesCode;
      } else if (pop.treeSpecies_ref) {
        internal.treeSpecies_ref = pop.treeSpecies_ref;
      }

      // Map observations (ObsP_*) to internal names with values and units
      for (const [key, value] of Object.entries(pop)) {
        if (key.startsWith("ObsP_")) {
          const internalName = mapPopulationObservation(key);
          if (internalName && value && typeof value === "object") {
            // Extract value and unit from {code, label, uom} structure
            const code = (value as any).code;
            const uom = (value as any).uom;

            if (code != null) {
              const numericValue = Number(code);
              if (!Number.isNaN(numericValue)) {
                // Store as {value, unit} structure
                internal[internalName] = {
                  value: numericValue,
                  unit: uom || null,
                };
              } else {
                // Non-numeric code (rare) - store as string with unit
                internal[internalName] = {
                  value: String(code),
                  unit: uom || null,
                };
              }
            }
          }
        }
      }

      return internal;
    });
  };

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

  // Convert places to GeoJSON format
  const placesToGeoJSON = (places: Place[]): object => {
    const features = places
      .map((place) => {
        const geometry = place.geometries?.[0]?.geometry;
        if (!geometry) {
          return null;
        }

        const baseProps = {
          placeId: place.id,
          placeType: place.placeType,
          name: place.attributes?.name,
          notes: place.attributes?.notes,
          color: place.attributes?.color,
          visible: place.visible,
          createdAt: place.createdAt,
          areaHa: place.attributes?.areaHa,
          mediaCount: place.media?.length || 0,
          historyCount: place.userJournal?.length || 0,
          source: place.source,
        };

        const mergedProps = place.properties
          ? { ...place.properties, ...baseProps }
          : baseProps;

        return {
          type: "Feature",
          geometry,
          properties: mergedProps,
        };
      })
      .filter(Boolean);

    return {
      type: "FeatureCollection",
      features,
    };
  };

  // Convert places to CSV format
  const placesToCSV = (places: Place[]): string => {
    const headers = [
      "id",
      "placeType",
      "name",
      "notes",
      "visible",
      "createdAt",
      "latitude",
      "longitude",
      "area_sqm",
      "media_count",
      "history_count",
    ];

    const rows = places.map((place) => {
      const geometry = place.geometries?.[0]?.geometry;
      let lat: number | string = "";
      let lng: number | string = "";

      if (geometry?.type === "Point") {
        const coords = geometry.coordinates as number[];
        lng = coords[0];
        lat = coords[1];
      } else if (geometry?.type === "Polygon") {
        const rings = geometry.coordinates as number[][][];
        const first = rings[0]?.[0];
        if (first) {
          lng = first[0];
          lat = first[1];
        }
      } else if (geometry?.type === "MultiPolygon") {
        const polygons = geometry.coordinates as number[][][][];
        const first = polygons[0]?.[0]?.[0];
        if (first) {
          lng = first[0];
          lat = first[1];
        }
      }

      const area = place.attributes?.areaHa
        ? (place.attributes.areaHa * 10000).toFixed(2)
        : "";

      return [
        place.id,
        place.placeType,
        `"${(place.attributes?.name || "").replace(/"/g, '""')}"`,
        `"${(place.attributes?.notes || "").replace(/"/g, '""')}"`,
        place.visible,
        place.createdAt,
        lat,
        lng,
        area,
        place.media?.length || 0,
        place.userJournal?.length || 0,
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  };

  // Collect all media files from places
  const collectMediaFiles = (places: Place[]): MediaItem[] => {
    const allMedia: MediaItem[] = [];

    for (const place of places) {
      if (place.media) {
        allMedia.push(...place.media);
      }
      if (place.userJournal) {
        for (const entry of place.userJournal) {
          if (entry.media) {
            allMedia.push(...entry.media);
          }
        }
      }
    }

    return allMedia;
  };

  // Update media URIs to relative paths for export
  const preparePlacesForExport = (places: Place[]): Place[] => {
    return places.map((place) => ({
      ...place,
      media:
        place.media?.map((m) => ({
          ...m,
          uri: `media/${m.id}.${m.type === "video" ? "mp4" : "jpg"}`,
        })) || [],
      userJournal:
        place.userJournal?.map((h) => ({
          ...h,
          media:
            h.media?.map((m) => ({
              ...m,
              uri: `media/${m.id}.${m.type === "video" ? "mp4" : "jpg"}`,
            })) || [],
        })) || [],
    }));
  };

  // Export as ZIP bundle
  const exportData = async (
    places: Place[],
    format: "json" | "csv" | "geojson" | "all" = "all"
  ): Promise<boolean> => {
    try {
      await cleanDir(EXPORT_DIR);
      const mediaDir = `${EXPORT_DIR}/media`;
      await ensureDir(mediaDir);

      // Copy media files
      const allMedia = collectMediaFiles(places);
      for (const media of allMedia) {
        const sourcePath = media.uri.replace("file://", "");
        const ext = media.type === "video" ? "mp4" : "jpg";
        const destPath = `${mediaDir}/${media.id}.${ext}`;

        const exists = await RNFS.exists(sourcePath);
        if (exists) {
          await RNFS.copyFile(sourcePath, destPath);
        }
      }

      // Prepare items with relative media paths
      const exportPlaces = preparePlacesForExport(places);

      // Write JSON
      if (format === "json" || format === "all") {
        const jsonData = JSON.stringify(
          { version: 4, places: exportPlaces },
          null,
          2
        );
        await RNFS.writeFile(`${EXPORT_DIR}/data.json`, jsonData, "utf8");
      }

      // Write CSV
      if (format === "csv" || format === "all") {
        const csvData = placesToCSV(places);
        await RNFS.writeFile(`${EXPORT_DIR}/data.csv`, csvData, "utf8");
      }

      // Write GeoJSON
      if (format === "geojson" || format === "all") {
        const geoJsonData = JSON.stringify(placesToGeoJSON(places), null, 2);
        await RNFS.writeFile(`${EXPORT_DIR}/data.geojson`, geoJsonData, "utf8");
      }

      // Create ZIP
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const zipPath = `${RNFS.CachesDirectoryPath}/forestry_export_${timestamp}.zip`;

      await zip(EXPORT_DIR, zipPath);

      // Share the ZIP file
      await Share.open({
        url: `file://${zipPath}`,
        type: "application/zip",
        filename: `forestry_export_${timestamp}.zip`,
      });

      return true;
    } catch (error: any) {
      if (error?.message?.includes("User did not share")) {
        return true; // User cancelled share, not an error
      }
      console.error("Export error:", error);
      Alert.alert(
        t("exportError"),
        t("exportFailed", { message: error.message })
      );
      return false;
    }
  };

  // Import from ZIP bundle
  const importData = async (): Promise<Place[] | null> => {
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
      if (file.uri.startsWith("content://")) {
        zipPath = `${RNFS.CachesDirectoryPath}/import.zip`;
        await RNFS.copyFile(file.uri, zipPath);
      }

      // Unzip
      await unzip(zipPath.replace("file://", ""), IMPORT_DIR);

      // Read JSON data
      const jsonPath = `${IMPORT_DIR}/data.json`;
      const jsonExists = await RNFS.exists(jsonPath);

      if (!jsonExists) {
        Alert.alert(t("importError"), t("noDataJson"));
        return null;
      }

      const jsonData = await RNFS.readFile(jsonPath, "utf8");
      const importedPlaces: Place[] = normalizeInventoryData(
        JSON.parse(jsonData)
      );

      // Copy media files and update URIs
      const importMediaDir = `${IMPORT_DIR}/media`;
      const mediaExists = await RNFS.exists(importMediaDir);

      const updateMediaUri = async (media: MediaItem): Promise<MediaItem> => {
        if (mediaExists) {
          const ext = media.type === "video" ? "mp4" : "jpg";
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
      const processedPlaces: Place[] = [];

      for (const place of importedPlaces) {
        const updatedMedia: MediaItem[] = [];
        for (const m of place.media || []) {
          updatedMedia.push(await updateMediaUri(m));
        }

        const updatedHistory: HistoryEntry[] = [];
        for (const h of place.userJournal || []) {
          const historyMedia: MediaItem[] = [];
          for (const m of h.media || []) {
            historyMedia.push(await updateMediaUri(m));
          }
          updatedHistory.push({ ...h, media: historyMedia });
        }

        processedPlaces.push({
          ...place,
          media: updatedMedia,
          userJournal: updatedHistory,
        });
      }

      return processedPlaces;
    } catch (error: any) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return null; // User cancelled
      }
      console.error("Import error:", error);
      Alert.alert(
        t("importError"),
        t("importFailed", { message: error.message })
      );
      return null;
    }
  };

  const buildParsedGeoJSON = (geoJson: any): ParsedGeoJSON | null => {
    if (!geoJson?.features || !Array.isArray(geoJson.features)) {
      Alert.alert(t("importError"), t("invalidGeoJson"));
      return null;
    }

    // Collect all unique property keys from all features (with flattened nested properties)
    const propertyKeysSet = new Set<string>();
    for (const feature of geoJson.features) {
      if (feature.properties) {
        const flattened = flattenProperties(feature.properties);
        Object.keys(flattened).forEach((key) => propertyKeysSet.add(key));
      }
    }

    const propertyKeys = Array.from(propertyKeysSet).sort();

    // Find a suggested name key (prefer placeId or similar)
    let suggestedNameKey: string | undefined;
    const placeIdKey = propertyKeys.find((k) =>
      k.toLowerCase().endsWith("placeid")
    );
    if (placeIdKey) {
      suggestedNameKey = placeIdKey;
    } else {
      // Fall back to 'name' or 'id' if available
      suggestedNameKey =
        propertyKeys.find((k) => k.toLowerCase() === "name") ||
        propertyKeys.find((k) => k.toLowerCase() === "id");
    }

    return {
      features: geoJson.features,
      propertyKeys,
      suggestedNameKey,
    };
  };

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
      if (file.uri.startsWith("content://")) {
        filePath = `${RNFS.CachesDirectoryPath}/import.geojson`;
        await RNFS.copyFile(file.uri, filePath);
      }

      const geoJsonData = await RNFS.readFile(
        filePath.replace("file://", ""),
        "utf8"
      );
      const geoJson = JSON.parse(geoJsonData);
      return buildParsedGeoJSON(geoJson);
    } catch (error: any) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return null;
      }
      console.error("GeoJSON parse error:", error);
      Alert.alert(
        t("importError"),
        t("parseGeoJsonFailed", { message: error.message })
      );
      return null;
    }
  };

  const parseForestandXml = async (): Promise<ParsedGeoJSON | null> => {
    try {
      const result = await pick({
        type: [types.allFiles],
      });

      const file = result[0];
      if (!file?.uri) {
        return null;
      }

      const fileName = file.name || file.uri.split("/").pop() || "";
      if (fileName && !fileName.toLowerCase().endsWith(".xml")) {
        Alert.alert(t("importError"), t("selectXmlFile"));
        return null;
      }

      // Copy file to cache if needed (for content:// URIs)
      let filePath = file.uri;
      if (file.uri.startsWith("content://")) {
        filePath = `${RNFS.CachesDirectoryPath}/import.forestand.xml`;
        await RNFS.copyFile(file.uri, filePath);
      }

      const xmlData = await RNFS.readFile(
        filePath.replace("file://", ""),
        "utf8"
      );

      const geoJson = convertForestandXmlToGeoJson(xmlData);
      return buildParsedGeoJSON(geoJson);
    } catch (error: any) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return null;
      }
      console.error("Forestand XML import error:", error);
      Alert.alert(
        t("importError"),
        t("importFailed", { message: error.message })
      );
      return null;
    }
  };

  // Get a value from an object using a dot-notation key
  const getNestedValue = (obj: any, key: string): any => {
    if (!key || !obj) {
      return undefined;
    }
    const parts = key.split(".");
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
      if (
        first.latitude === last.latitude &&
        first.longitude === last.longitude
      ) {
        coords = coords.slice(0, -1);
      }
    }

    if (coords.length < 3) {
      return null;
    }

    return coords;
  };

  // Helper to process a polygon (with potential holes) into a Place
  const processPolygon = (
    rings: number[][][],
    baseId: string,
    name: string,
    notes: string,
    props: any,
    now: string,
    suffix?: string
  ): Place | null => {
    if (!rings || rings.length === 0) {
      return null;
    }

    const outerCoords = ringToCoordinates(rings[0]);
    if (!outerCoords) {
      return null;
    }

    const flattened = flattenProperties(props);

    const color =
      flattened.color ||
      flattened.Color ||
      flattened.COLOR ||
      flattened.fill ||
      flattened.Fill ||
      flattened.FILL ||
      flattened.fillColor ||
      flattened.FillColor ||
      undefined;

    const id = suffix ? `${baseId}_${suffix}` : baseId;
    const itemName = suffix ? `${name} (${suffix})` : name;

    return {
      id,
      placeType: "Place_Area",
      source: {
        system: "geojson",
        importedAt: now,
      },
      attributes: {
        name: itemName || undefined,
        notes: notes || undefined,
        areaHa: calculateArea(outerCoords) / 10000,
        color,
      },
      geometries: [
        {
          geometry: {
            type: "Polygon",
            coordinates: rings,
          },
          crs: "EPSG:4326",
        },
      ],
      visible: true,
      createdAt: now,
      userJournal: [],
      media: [],
      properties: props,
    };
  };

  // Process parsed GeoJSON with property mappings
  const processGeoJSON = (
    features: any[],
    nameProperty: string,
    notesProperty: string,
    existingPlaces: Place[] = []
  ): Place[] | null => {
    const now = new Date().toISOString();
    const items: Place[] = [];

    const getExternalIdFromProps = (props: any): string | undefined => {
      const placeId = props?.placeId;
      if (placeId != null) {
        return String(placeId);
      }
      const forestandPlaceId = props?.forestand?.placeId;
      if (forestandPlaceId != null) {
        return String(forestandPlaceId);
      }
      const fid = props?.fid;
      if (fid != null) {
        return String(fid);
      }
      return undefined;
    };

    const existingByExternalId = new Map<string, Place>();
    for (const place of existingPlaces) {
      const externalId = getExternalIdFromProps(place.properties || {});
      if (externalId) {
        existingByExternalId.set(externalId, place);
      }
      if (!existingByExternalId.has(place.id)) {
        existingByExternalId.set(place.id, place);
      }
    }

    const mergeAttributes = (
      existing: Place["attributes"],
      incoming: Place["attributes"]
    ) => {
      return {
        ...existing,
        ...Object.fromEntries(
          Object.entries(incoming || {}).filter(
            ([, value]) => value !== undefined
          )
        ),
      };
    };

    const mergeDuplicate = (existing: Place, incoming: Place): Place => {
      return {
        ...incoming,
        id: existing.id,
        attributes: mergeAttributes(existing.attributes, incoming.attributes),
        userJournal: existing.userJournal,
        media: existing.media,
        createdAt: existing.createdAt || incoming.createdAt,
        visible: existing.visible,
        source: existing.source || incoming.source,
      };
    };

    for (const feature of features) {
      if (!feature.geometry) {
        continue;
      }

      const props = feature.properties || {};
      const externalId = getExternalIdFromProps(props);
      // Support dot-notation for nested properties
      const name = nameProperty
        ? String(getNestedValue(props, nameProperty) || "")
        : "";
      const notes = notesProperty
        ? String(getNestedValue(props, notesProperty) || "")
        : "";

      // Use fid as unique id if it exists, otherwise generate one
      const existingPlace = externalId
        ? existingByExternalId.get(externalId)
        : undefined;
      const baseId = existingPlace
        ? existingPlace.id
        : props.fid != null
        ? String(props.fid)
        : Date.now().toString() + Math.random().toString(36).substr(2, 9);

      if (feature.geometry.type === "Point") {
        const siteAttributes = buildInternalAttributesFromSite(
          props?.forestand?.site
        );
        const populationAttributes = buildInternalPopulationAttributes(
          props?.forestand?.population
        );
        const point: Place = {
          id: baseId,
          placeType: "Place_Point",
          source: {
            system: "geojson",
            importedAt: now,
          },
          attributes: {
            name: name || undefined,
            notes: notes || undefined,
            ...(Object.keys(siteAttributes).length > 0
              ? { site: siteAttributes }
              : {}),
            ...(populationAttributes && populationAttributes.length > 0
              ? { population: populationAttributes }
              : {}),
          },
          geometries: [
            {
              geometry: feature.geometry,
              crs: "EPSG:4326",
            },
          ],
          visible: true,
          createdAt: now,
          userJournal: [],
          media: [],
          properties: props,
        };
        items.push(
          existingPlace ? mergeDuplicate(existingPlace, point) : point
        );
      } else if (feature.geometry.type === "Polygon") {
        // Polygon: all rings (outer + holes)
        const rings = feature.geometry.coordinates;
        const areaItem = processPolygon(rings, baseId, name, notes, props, now);
        if (areaItem) {
          const siteAttributes = buildInternalAttributesFromSite(
            props?.forestand?.site
          );
          const populationAttributes = buildInternalPopulationAttributes(
            props?.forestand?.population
          );
          areaItem.attributes = {
            ...areaItem.attributes,
            ...(Object.keys(siteAttributes).length > 0
              ? { site: siteAttributes }
              : {}),
            ...(populationAttributes && populationAttributes.length > 0
              ? { population: populationAttributes }
              : {}),
          };
          items.push(
            existingPlace ? mergeDuplicate(existingPlace, areaItem) : areaItem
          );
        }
      } else if (feature.geometry.type === "MultiPolygon") {
        const areaItem: Place = {
          id: baseId,
          placeType: "Place_Area",
          source: {
            system: "geojson",
            importedAt: now,
          },
          attributes: {
            name: name || undefined,
            notes: notes || undefined,
          },
          geometries: [
            {
              geometry: feature.geometry,
              crs: "EPSG:4326",
            },
          ],
          visible: true,
          createdAt: now,
          userJournal: [],
          media: [],
          properties: props,
        };
        const siteAttributes = buildInternalAttributesFromSite(
          props?.forestand?.site
        );
        const populationAttributes = buildInternalPopulationAttributes(
          props?.forestand?.population
        );
        areaItem.attributes = {
          ...areaItem.attributes,
          ...(Object.keys(siteAttributes).length > 0
            ? { site: siteAttributes }
            : {}),
          ...(populationAttributes && populationAttributes.length > 0
            ? { population: populationAttributes }
            : {}),
        };
        items.push(
          existingPlace ? mergeDuplicate(existingPlace, areaItem) : areaItem
        );
      }
    }

    if (items.length === 0) {
      Alert.alert(t("importError"), t("noValidFeatures"));
      return null;
    }

    const forestandIdToInternalId = new Map<string, string>();
    for (const place of items) {
      const forestandPlaceId = place.properties?.forestand?.placeId;
      if (forestandPlaceId) {
        forestandIdToInternalId.set(String(forestandPlaceId), place.id);
      }
    }

    for (const place of items) {
      const forestandParentId = place.properties?.forestand?.parentPlaceId;
      if (forestandParentId) {
        const internalParentId = forestandIdToInternalId.get(
          String(forestandParentId)
        );
        if (internalParentId) {
          place.attributes = {
            ...place.attributes,
            parentPlaceId: internalParentId,
          };
        }
      }
    }

    return items;
  };

  return {
    exportData,
    importData,
    parseGeoJSON,
    parseForestandXml,
    processGeoJSON,
  };
}
