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
        updateItem({
          ...repositionItem,
          geometries: [
            {
              geometry: toGeoJsonPoint(coordinate),
              crs: "EPSG:4326",
            },
          ],
        });
        setRepositionItem(null);
        setDrawingMode("none");
      } else {
        // For area, add point to new coordinates
        setAreaPoints([...areaPoints, coordinate]);
      }
      return;
    }

    if (drawingMode === "point") {
      const now = new Date().toISOString();
      setCurrentItem({
        id: Date.now().toString(),
        placeType: "Place_Point",
        source: {
          system: "internal",
          importedAt: now,
        },
        attributes: {
          name: "",
          notes: "",
        },
        geometries: [
          {
            geometry: toGeoJsonPoint(coordinate),
            crs: "EPSG:4326",
          },
        ],
        visible: true,
        createdAt: now,
        userJournal: [],
        media: [],
      });
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
    setCurrentItem({
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
      },
      geometries: [
        {
          geometry: toGeoJsonPolygon(areaPoints),
          crs: "EPSG:4326",
        },
      ],
      visible: true,
      createdAt: now,
      userJournal: [],
      media: [],
    });
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

  const completeReposition = () => {
    if (repositionItem && repositionItem.placeType === "Place_Area") {
      if (areaPoints.length < 3) {
        Alert.alert(t("error"), t("areaMinPoints"));
        return;
      }
      const area = calculateArea(areaPoints);
      updateItem({
        ...repositionItem,
        geometries: [
          {
            geometry: toGeoJsonPolygon(areaPoints),
            crs: "EPSG:4326",
          },
        ],
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

  const cancelReposition = () => {
    setRepositionItem(null);
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
      notesProperty
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
