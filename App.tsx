import React, { useState, useRef } from "react";
import {
  View,
  Alert,
  StyleSheet,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import {
  Place,
  Coordinate,
  DrawingMode,
  Region,
  HistoryEntry,
} from "./src/features/inventory";
import {
  ensureGeometryIds,
  generateGeometryId,
} from "./src/features/inventory/services/changeTrackingService";
import { useLocation } from "./src/hooks";
import { useImportExport } from "./src/features/importExport";
import { useSettings } from "./src/features/preferences";
import { useInventory } from "./src/features/inventory";
import {
  Header,
  ToolPanel,
  MenuToggleButton,
  ItemModal,
  Sidebar,
  InventoryMap,
  AboutModal,
  PropertyMappingModal,
} from "./src/components";
import type { InventoryMapRef } from "./src/components/Map/InventoryMap";
import {
  LocalizationProvider,
  useLocalization,
  Language,
} from "./src/localization";
import * as turf from "@turf/turf";

type ModalMode = "view" | "edit" | "create";

const SWIPE_EDGE_WIDTH = 30;
const SWIPE_THRESHOLD = 50;

function AppContent() {
  const { gpsTracking, setGpsTracking, mapType, toggleMapType, isLoaded } =
    useSettings();
  const { region, setRegion, toggleGPSTracking } = useLocation({
    gpsTracking,
    setGpsTracking,
  });
  const { language, setLanguage, t } = useLocalization();
  const {
    places,
    addItem,
    updateItem,
    deleteItem,
    toggleItemVisibility,
    calculateArea,
    importItems,
    appendItems,
  } = useInventory();
  const {
    exportData,
    importData,
    parseGeoJSON,
    parseForestandXml,
    processGeoJSON,
  } = useImportExport();
  const mapRef = useRef<InventoryMapRef>(null);

  const [menuVisible, setMenuVisible] = useState(false);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
  const [areaPoints, setAreaPoints] = useState<Coordinate[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<Place>>({});
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [repositionItem, setRepositionItem] = useState<Place | null>(null);
  const [splitItem, setSplitItem] = useState<Place | null>(null);
  const [isOnline] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  // GeoJSON import state
  const [propertyMappingVisible, setPropertyMappingVisible] = useState(false);
  const [geoJsonFeatures, setGeoJsonFeatures] = useState<any[]>([]);
  const [geoJsonProperties, setGeoJsonProperties] = useState<string[]>([]);
  const [geoJsonSuggestedName, setGeoJsonSuggestedName] = useState<
    string | undefined
  >();

  const toGeoJsonPoint = (coordinate: Coordinate): GeoJSON.Point => ({
    type: "Point",
    coordinates: [coordinate.longitude, coordinate.latitude],
  });

  const toGeoJsonPolygon = (coordinates: Coordinate[]): GeoJSON.Polygon => {
    const outer = coordinates.map((c) => [c.longitude, c.latitude]);
    if (outer.length > 0) {
      const [firstLng, firstLat] = outer[0];
      const [lastLng, lastLat] = outer[outer.length - 1];
      if (firstLng !== lastLng || firstLat !== lastLat) {
        outer.push([firstLng, firstLat]);
      }
    }
    return {
      type: "Polygon",
      coordinates: [outer],
    };
  };

  const getPrimaryGeometry = (place: Place): GeoJSON.Geometry | null => {
    if (!place.geometries || place.geometries.length === 0) {
      return null;
    }
    return place.geometries[0].geometry || null;
  };

  const normalizeRing = (ring: number[][]) => {
    if (ring.length < 2) {
      return ring;
    }
    const [firstLng, firstLat] = ring[0];
    const [lastLng, lastLat] = ring[ring.length - 1];
    if (firstLng === lastLng && firstLat === lastLat) {
      return ring.slice(0, -1);
    }
    return ring;
  };

  const isPointOnSegment = (point: Coordinate, a: number[], b: number[]) => {
    const px = point.longitude;
    const py = point.latitude;
    const ax = a[0];
    const ay = a[1];
    const bx = b[0];
    const by = b[1];

    const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
    if (Math.abs(cross) > 1e-12) {
      return false;
    }

    const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
    if (dot < 0) {
      return false;
    }

    const lenSq = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
    return dot <= lenSq;
  };

  const pointInRing = (point: Coordinate, ring: number[][]) => {
    const normalized = normalizeRing(ring);
    if (normalized.length < 3) {
      return false;
    }

    let inside = false;
    for (let i = 0, j = normalized.length - 1; i < normalized.length; j = i++) {
      const xi = normalized[i][0];
      const yi = normalized[i][1];
      const xj = normalized[j][0];
      const yj = normalized[j][1];

      if (isPointOnSegment(point, normalized[j], normalized[i])) {
        return true;
      }

      const intersect =
        yi > point.latitude !== yj > point.latitude &&
        point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi;
      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  };

  const pointInPolygon = (point: Coordinate, rings: number[][][]) => {
    if (rings.length === 0) {
      return false;
    }
    const outer = rings[0];
    if (!pointInRing(point, outer)) {
      return false;
    }
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(point, rings[i])) {
        return false;
      }
    }
    return true;
  };

  const placeContainsPoint = (place: Place, point: Coordinate) => {
    const geometry = getPrimaryGeometry(place);
    if (!geometry) {
      return false;
    }

    if (geometry.type === "Polygon") {
      return pointInPolygon(point, geometry.coordinates as number[][][]);
    }

    if (geometry.type === "MultiPolygon") {
      const polygons = geometry.coordinates as number[][][][];
      return polygons.some((rings) => pointInPolygon(point, rings));
    }

    return false;
  };

  const placeContainsPolygon = (place: Place, polygon: Coordinate[]) => {
    if (polygon.length < 3) {
      return false;
    }
    const geometry = getPrimaryGeometry(place);
    if (!geometry) {
      return false;
    }

    const ringsToCheck = polygon.map((coord) => coord);

    const isContainedByPolygon = (rings: number[][][]) => {
      return ringsToCheck.every((point) => pointInPolygon(point, rings));
    };

    if (geometry.type === "Polygon") {
      return isContainedByPolygon(geometry.coordinates as number[][][]);
    }

    if (geometry.type === "MultiPolygon") {
      const polygons = geometry.coordinates as number[][][][];
      return polygons.some((rings) => isContainedByPolygon(rings));
    }

    return false;
  };

  const getPlaceAreaSqm = (place: Place) => {
    if (place.attributes?.areaHa) {
      return place.attributes.areaHa * 10000;
    }
    const geometry = getPrimaryGeometry(place);
    if (!geometry) {
      return 0;
    }

    const sumPolygonArea = (rings: number[][][]) => {
      if (rings.length === 0) {
        return 0;
      }
      const outer = normalizeRing(rings[0]);
      const coords = outer.map((coord) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
      return calculateArea(coords);
    };

    if (geometry.type === "Polygon") {
      return sumPolygonArea(geometry.coordinates as number[][][]);
    }

    if (geometry.type === "MultiPolygon") {
      const polygons = geometry.coordinates as number[][][][];
      return polygons.reduce((sum, rings) => sum + sumPolygonArea(rings), 0);
    }

    return 0;
  };

  const findParentForPoint = (point: Coordinate) => {
    let selected: { id: string; area: number } | null = null;
    for (const place of places) {
      if (place.placeType !== "Place_Area") {
        continue;
      }
      if (!placeContainsPoint(place, point)) {
        continue;
      }
      const area = getPlaceAreaSqm(place);
      if (!selected || (area > 0 && area < selected.area)) {
        selected = { id: place.id, area };
      }
    }
    return selected?.id;
  };

  const findParentForArea = (polygon: Coordinate[]) => {
    let selected: { id: string; area: number } | null = null;
    for (const place of places) {
      if (place.placeType !== "Place_Area") {
        continue;
      }
      if (!placeContainsPolygon(place, polygon)) {
        continue;
      }
      const area = getPlaceAreaSqm(place);
      if (!selected || (area > 0 && area < selected.area)) {
        selected = { id: place.id, area };
      }
    }
    return selected?.id;
  };

  const getCoordinatesFromGeometry = (
    geometry: GeoJSON.Geometry
  ): Coordinate[] => {
    if (geometry.type === "Point") {
      const coords = geometry.coordinates as number[];
      return [{ latitude: coords[1], longitude: coords[0] }];
    }
    if (geometry.type === "Polygon") {
      const rings = geometry.coordinates as number[][][];
      return (rings[0] || []).map((coord) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
    }
    if (geometry.type === "MultiPolygon") {
      const polygons = geometry.coordinates as number[][][][];
      return polygons.flatMap((poly) =>
        (poly[0] || []).map((coord) => ({
          latitude: coord[1],
          longitude: coord[0],
        }))
      );
    }
    return [];
  };

  const screenWidth = Dimensions.get("window").width;

  const leftPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        return evt.nativeEvent.pageX < SWIPE_EDGE_WIDTH;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          evt.nativeEvent.pageX < SWIPE_EDGE_WIDTH + gestureState.dx &&
          gestureState.dx > 10 &&
          Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          setMenuVisible(true);
        }
      },
    })
  ).current;

  const rightPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        return evt.nativeEvent.pageX > screenWidth - SWIPE_EDGE_WIDTH;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          evt.nativeEvent.pageX >
            screenWidth - SWIPE_EDGE_WIDTH + gestureState.dx &&
          gestureState.dx < -10 &&
          Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          setSidebarVisible(true);
        }
      },
    })
  ).current;

  const confirmLocation = () => {
    const coordinate: Coordinate = {
      latitude: region.latitude,
      longitude: region.longitude,
    };

    if (drawingMode === "reposition" && repositionItem) {
      if (repositionItem.placeType === "Place_Point") {
        // Generate new geometry ID for the repositioned point
        const newGeometry = {
          id: generateGeometryId(),
          geometry: toGeoJsonPoint(coordinate),
          crs: "EPSG:4326",
        };

        updateItem({
          ...repositionItem,
          geometries: [newGeometry, ...(repositionItem.geometries || [])],
        });
        setRepositionItem(null);
        setDrawingMode("none");
      } else {
        // For area, add point to new coordinates
        setAreaPoints([...areaPoints, coordinate]);
      }
      return;
    }

    if (drawingMode === "split" && splitItem) {
      setAreaPoints([...areaPoints, coordinate]);
      return;
    }

    if (drawingMode === "point") {
      const now = new Date().toISOString();
      const parentPlaceId = findParentForPoint(coordinate);
      const newPlace: Place = {
        id: Date.now().toString(),
        placeType: "Place_Point",
        source: {
          system: "internal",
          importedAt: now,
        },
        attributes: {
          name: "",
          notes: "",
          parentPlaceId,
        },
        geometries: [
          {
            id: generateGeometryId(),
            geometry: toGeoJsonPoint(coordinate),
            crs: "EPSG:4326",
          },
        ],
        visible: true,
        createdAt: now,
        userJournal: [],
        media: [],
      };
      setCurrentItem(newPlace);
      setModalVisible(true);
      setDrawingMode("none");
    } else if (drawingMode === "area") {
      setAreaPoints([...areaPoints, coordinate]);
    }
  };

  const handleToggleGPS = () => {
    toggleGPSTracking();
  };

  const completeArea = () => {
    if (areaPoints.length < 3) {
      Alert.alert(t("error"), t("areaMinPoints"));
      return;
    }

    const area = calculateArea(areaPoints);
    const now = new Date().toISOString();
    const parentPlaceId = findParentForArea(areaPoints);
    const newPlace: Place = {
      id: Date.now().toString(),
      placeType: "Place_Area",
      source: {
        system: "internal",
        importedAt: now,
      },
      attributes: {
        name: "",
        notes: "",
        areaHa: area / 10000,
        color: "#00FF00",
        parentPlaceId,
      },
      geometries: [
        {
          id: generateGeometryId(),
          geometry: toGeoJsonPolygon(areaPoints),
          crs: "EPSG:4326",
        },
      ],
      visible: true,
      createdAt: now,
      userJournal: [],
      media: [],
    };
    setCurrentItem(newPlace);
    setModalVisible(true);
    setDrawingMode("none");
  };

  const saveItem = () => {
    if (!currentItem.attributes?.name) {
      Alert.alert(t("error"), t("nameRequired"));
      return;
    }

    if (modalMode === "edit") {
      updateItem(currentItem as Place);
    } else {
      addItem(currentItem as Place);
    }
    setModalVisible(false);
    setCurrentItem({});
    setAreaPoints([]);
    setModalMode("create");
  };

  const cancelModal = () => {
    setModalVisible(false);
    setCurrentItem({});
    setAreaPoints([]);
    setModalMode("create");
  };

  const handleView = (item: Place) => {
    // Close sidebar first
    setSidebarVisible(false);
    const currentRegion = region;
    const geometry = getPrimaryGeometry(item);
    if (
      geometry &&
      item.placeType === "Place_Point" &&
      geometry.type === "Point"
    ) {
      const coords = geometry.coordinates as number[];
      const targetRegion: Region = {
        latitude: coords[1],
        longitude: coords[0],
        latitudeDelta: currentRegion.latitudeDelta,
        longitudeDelta: currentRegion.longitudeDelta,
      };
      mapRef.current?.animateToRegion(targetRegion, 300);
    } else if (geometry && item.placeType === "Place_Area") {
      const coordinates = getCoordinatesFromGeometry(geometry);
      if (coordinates.length > 0) {
        const { width, height } = Dimensions.get("window");
        const edgePadding = {
          top: height * 0.1,
          right: width * 0.1,
          bottom: height * 0.1,
          left: width * 0.1,
        };
        mapRef.current?.fitToCoordinates(coordinates, edgePadding, true);
      }
    }

    setCurrentItem(item);
    setModalMode("view");
    setModalVisible(true);
  };

  const handleSwitchToEdit = () => {
    setModalMode("edit");
  };

  const handleRegionChange = (nextRegion: Region) => {
    setRegion(nextRegion);
  };

  const handleReposition = (item: Place) => {
    setRepositionItem(item);
    setDrawingMode("reposition");
    setSidebarVisible(false);
    if (item.placeType === "Place_Area") {
      setAreaPoints([]);
    }
  };

  const handleSplit = (item: Place) => {
    if (item.placeType !== "Place_Area") {
      return;
    }
    setSplitItem(item);
    setDrawingMode("split");
    setSidebarVisible(false);
    setAreaPoints([]);
  };

  const completeReposition = () => {
    if (repositionItem && repositionItem.placeType === "Place_Area") {
      if (areaPoints.length < 3) {
        Alert.alert(t("error"), t("areaMinPoints"));
        return;
      }
      const area = calculateArea(areaPoints);

      // Generate new geometry ID for the repositioned area
      const newGeometry = {
        id: generateGeometryId(),
        geometry: toGeoJsonPolygon(areaPoints),
        crs: "EPSG:4326",
      };

      updateItem({
        ...repositionItem,
        geometries: [newGeometry, ...(repositionItem.geometries || [])],
        attributes: {
          ...repositionItem.attributes,
          areaHa: area / 10000,
        },
      });
    }
    setRepositionItem(null);
    setDrawingMode("none");
    setAreaPoints([]);
  };

  const completeSplit = () => {
    if (!splitItem || splitItem.placeType !== "Place_Area") {
      return;
    }
    if (areaPoints.length < 2) {
      Alert.alert(t("error"), "Add at least two points to split the area.");
      return;
    }

    const geometry = getPrimaryGeometry(splitItem);
    if (!geometry || geometry.type !== "Polygon") {
      Alert.alert(t("error"), "Only simple polygons can be split right now.");
      return;
    }

    const outer = geometry.coordinates[0] as number[][];
    if (!outer || outer.length < 3) {
      Alert.alert(t("error"), "Invalid polygon for split.");
      return;
    }

    const closedOuter = [...outer];
    const [firstLng, firstLat] = closedOuter[0];
    const [lastLng, lastLat] = closedOuter[closedOuter.length - 1];
    if (firstLng !== lastLng || firstLat !== lastLat) {
      closedOuter.push([firstLng, firstLat]);
    }

    const lineCoords = areaPoints.map((p) => [p.longitude, p.latitude]);
    if (lineCoords.length < 2) {
      Alert.alert(t("error"), "Add at least two points to split.");
      return;
    }

    // Ensure distinct points and a non-zero length line
    const uniqueLine = lineCoords.filter((pt, idx, arr) => {
      if (idx === 0) return true;
      const prev = arr[idx - 1];
      return !(pt[0] === prev[0] && pt[1] === prev[1]);
    });

    if (uniqueLine.length < 2) {
      Alert.alert(t("error"), "Split line is too short. Add distinct points.");
      return;
    }

    const polyFeature = turf.polygon([closedOuter]);
    const lineFeature = turf.lineString(uniqueLine);

    // Require at least two intersections with the polygon boundary
    const intersections = turf.lineIntersect(lineFeature, polyFeature);
    if (!intersections || intersections.features.length < 2) {
      Alert.alert(
        t("error"),
        "Draw the line across the area so it crosses the boundary twice."
      );
      return;
    }

    let splitResult: any = null;
    try {
      splitResult = (turf as any).polygonSplit
        ? (turf as any).polygonSplit(polyFeature, lineFeature)
        : null;
    } catch (err) {
      console.warn("Split failed", err);
    }

    if (
      !splitResult ||
      !splitResult.features ||
      splitResult.features.length < 2
    ) {
      Alert.alert(
        t("error"),
        "Split did not produce two areas. Draw the line fully across the area and try again."
      );
      return;
    }

    const pieces = splitResult.features.filter(
      (f: any) =>
        f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
    );
    if (pieces.length < 2) {
      Alert.alert(
        t("error"),
        "Split did not produce two valid polygon pieces."
      );
      return;
    }

    const geometryAreaHa = (geom: GeoJSON.Geometry): number | undefined => {
      if (geom.type === "Polygon") {
        const ring = (geom.coordinates as number[][][])[0];
        if (!ring) return undefined;
        const coords = ring.map((c) => ({ latitude: c[1], longitude: c[0] }));
        return calculateArea(coords) / 10000;
      }
      if (geom.type === "MultiPolygon") {
        const poly = (geom.coordinates as number[][][][])[0]?.[0];
        if (!poly) return undefined;
        const coords = poly.map((c) => ({ latitude: c[1], longitude: c[0] }));
        return calculateArea(coords) / 10000;
      }
      return undefined;
    };

    const now = new Date().toISOString();

    Alert.alert(
      "Create subarea",
      "Choose which piece becomes the new subarea",
      pieces.slice(0, 2).map((feat: any, idx: number) => {
        const areaHa = geometryAreaHa(feat.geometry) || 0;
        return {
          text: `Piece ${idx + 1} (${areaHa.toFixed(2)} ha)`,
          onPress: () => {
            const newPlace: Place = {
              id: Date.now().toString(),
              placeType: "Place_Area",
              source: {
                system: "internal",
                importedAt: now,
              },
              attributes: {
                name: `${splitItem.attributes?.name || "Subarea"} (split)`,
                notes: splitItem.attributes?.notes,
                parentPlaceId: splitItem.id,
                color: splitItem.attributes?.color,
                areaHa: areaHa,
              },
              geometries: [
                {
                  id: generateGeometryId(),
                  geometry: feat.geometry as GeoJSON.Geometry,
                  crs: "EPSG:4326",
                },
              ],
              visible: true,
              createdAt: now,
              userJournal: [],
              media: [],
            };

            addItem(newPlace);
            setSplitItem(null);
            setDrawingMode("none");
            setAreaPoints([]);
          },
        };
      })
    );
  };

  const cancelReposition = () => {
    setRepositionItem(null);
    setSplitItem(null);
    setDrawingMode("none");
    setAreaPoints([]);
  };

  const clearDrawing = () => {
    setAreaPoints([]);
    setDrawingMode("none");
  };

  const handleExport = async (format: "json" | "csv" | "geojson" | "all") => {
    await exportData(places, format);
  };

  const handleImport = async () => {
    Alert.alert(t("importData"), t("chooseFormat"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("geoJsonAdd"),
        onPress: async () => {
          const parsed = await parseGeoJSON();
          if (parsed) {
            setGeoJsonFeatures(parsed.features);
            setGeoJsonProperties(parsed.propertyKeys);
            setGeoJsonSuggestedName(parsed.suggestedNameKey);
            setPropertyMappingVisible(true);
          }
        },
      },
      {
        text: t("forestandXmlImport"),
        onPress: async () => {
          const parsed = await parseForestandXml();
          if (parsed) {
            setGeoJsonFeatures(parsed.features);
            setGeoJsonProperties(parsed.propertyKeys);
            setGeoJsonSuggestedName(parsed.suggestedNameKey);
            setPropertyMappingVisible(true);
          }
        },
      },
      {
        text: t("zipReplaceAll"),
        style: "destructive",
        onPress: async () => {
          const importedItems = await importData();
          if (importedItems) {
            importItems(importedItems);
            Alert.alert(
              t("success"),
              t("importedItems", { count: importedItems.length })
            );
          }
        },
      },
    ]);
  };

  const handlePropertyMappingConfirm = (
    nameProperty: string,
    notesProperty: string
  ) => {
    const importedItems = processGeoJSON(
      geoJsonFeatures,
      nameProperty,
      notesProperty,
      places
    );
    if (importedItems) {
      appendItems(importedItems);
      Alert.alert(
        t("success"),
        t("addedItems", { count: importedItems.length })
      );
    }
    setPropertyMappingVisible(false);
    setGeoJsonFeatures([]);
    setGeoJsonProperties([]);
    setGeoJsonSuggestedName(undefined);
  };

  const handlePropertyMappingCancel = () => {
    setPropertyMappingVisible(false);
    setGeoJsonFeatures([]);
    setGeoJsonProperties([]);
    setGeoJsonSuggestedName(undefined);
  };

  const handleAddHistoryEntry = (itemId: string, history: HistoryEntry[]) => {
    const existingItem = places.find((entry) => entry.id === itemId);
    if (!existingItem) {
      return;
    }
    updateItem({ ...existingItem, userJournal: history });
  };

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header isOnline={isOnline} gpsTracking={gpsTracking} />

      <InventoryMap
        ref={mapRef}
        region={region}
        onRegionChange={handleRegionChange}
        mapType={mapType}
        items={places}
        areaPoints={areaPoints}
        drawingMode={drawingMode}
        repositionType={
          repositionItem?.placeType === "Place_Point"
            ? "point"
            : repositionItem?.placeType === "Place_Area"
            ? "area"
            : undefined
        }
        onConfirmLocation={confirmLocation}
        onCompleteReposition={completeReposition}
        onCompleteSplit={completeSplit}
        onCancelReposition={cancelReposition}
        onItemPress={handleView}
      />

      <MenuToggleButton onPress={() => setMenuVisible(true)} />

      <ToolPanel
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        gpsTracking={gpsTracking}
        onToggleGPS={handleToggleGPS}
        mapType={mapType}
        onToggleMapType={toggleMapType}
        drawingMode={drawingMode}
        onSetDrawingMode={setDrawingMode}
        areaPointsCount={areaPoints.length}
        onCompleteArea={completeArea}
        onClearDrawing={clearDrawing}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onShowAbout={() => setAboutVisible(true)}
        language={language}
        onSetLanguage={setLanguage}
      />

      <Sidebar
        visible={sidebarVisible}
        items={places}
        onToggleVisibility={toggleItemVisibility}
        onDelete={deleteItem}
        onView={handleView}
        onReposition={handleReposition}
        onSplit={handleSplit}
        onExport={handleExport}
        onImport={handleImport}
        onClose={() => setSidebarVisible(false)}
      />

      <ItemModal
        visible={modalVisible}
        item={currentItem}
        mode={modalMode}
        onChangeItem={setCurrentItem}
        onSave={saveItem}
        onCancel={cancelModal}
        onEdit={handleSwitchToEdit}
        onAddHistoryEntry={handleAddHistoryEntry}
        resolvePlaceName={(id) =>
          places.find((p) => p.id === id)?.attributes?.name || undefined
        }
      />

      <AboutModal
        visible={aboutVisible}
        onClose={() => setAboutVisible(false)}
      />

      <PropertyMappingModal
        visible={propertyMappingVisible}
        properties={geoJsonProperties}
        suggestedNameProperty={geoJsonSuggestedName}
        onConfirm={handlePropertyMappingConfirm}
        onCancel={handlePropertyMappingCancel}
      />

      {/* Edge swipe zones */}
      <View style={styles.leftSwipeZone} {...leftPanResponder.panHandlers} />
      <View style={styles.rightSwipeZone} {...rightPanResponder.panHandlers} />
    </View>
  );
}

function App() {
  return (
    <LocalizationProvider>
      <AppContent />
    </LocalizationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  leftSwipeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_EDGE_WIDTH,
  },
  rightSwipeZone: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_EDGE_WIDTH,
  },
});

export default App;
