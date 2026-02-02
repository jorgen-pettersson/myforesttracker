import React, { useState, useRef } from "react";
import {
  View,
  Alert,
  StyleSheet,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import { InventoryItem, Coordinate, DrawingMode, Region } from "./src/types";
import {
  useLocation,
  useInventory,
  useExportImport,
  useSettings,
} from "./src/hooks";
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
  const { language, setLanguage } = useLocalization();
  const {
    items,
    addItem,
    updateItem,
    deleteItem,
    toggleItemVisibility,
    calculateArea,
    importItems,
    appendItems,
  } = useInventory();
  const { exportData, importData, parseGeoJSON, processGeoJSON } =
    useExportImport();
  const mapRef = useRef<InventoryMapRef>(null);

  const [menuVisible, setMenuVisible] = useState(false);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("none");
  const [areaPoints, setAreaPoints] = useState<Coordinate[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<InventoryItem>>({});
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [repositionItem, setRepositionItem] = useState<InventoryItem | null>(
    null
  );
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
      if (repositionItem.type === "point") {
        updateItem({ ...repositionItem, coordinate });
        setRepositionItem(null);
        setDrawingMode("none");
      } else {
        // For area, add point to new coordinates
        setAreaPoints([...areaPoints, coordinate]);
      }
      return;
    }

    if (drawingMode === "point") {
      setCurrentItem({
        id: Date.now().toString(),
        type: "point",
        coordinate,
        name: "",
        notes: "",
        visible: true,
        created: new Date().toISOString(),
        history: [],
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
      Alert.alert("Error", "An area needs at least 3 points");
      return;
    }

    const area = calculateArea(areaPoints);
    setCurrentItem({
      id: Date.now().toString(),
      type: "area",
      coordinates: areaPoints,
      name: "",
      notes: "",
      area,
      visible: true,
      created: new Date().toISOString(),
      history: [],
      media: [],
      color: "#00FF00", // Default green
    });
    setModalVisible(true);
    setDrawingMode("none");
  };

  const saveItem = () => {
    if (!currentItem.name) {
      Alert.alert("Error", "Please enter a name");
      return;
    }

    if (modalMode === "edit") {
      updateItem(currentItem as InventoryItem);
    } else {
      addItem(currentItem as InventoryItem);
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

  const handleView = (item: InventoryItem) => {
    // Close sidebar first
    setSidebarVisible(false);
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

  const handleReposition = (item: InventoryItem) => {
    setRepositionItem(item);
    setDrawingMode("reposition");
    setSidebarVisible(false);
    if (item.type === "area") {
      setAreaPoints([]);
    }
  };

  const completeReposition = () => {
    if (repositionItem && repositionItem.type === "area") {
      if (areaPoints.length < 3) {
        Alert.alert("Error", "An area needs at least 3 points");
        return;
      }
      const area = calculateArea(areaPoints);
      updateItem({ ...repositionItem, coordinates: areaPoints, area });
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
    await exportData(items, format);
  };

  const handleImport = async () => {
    Alert.alert("Import Data", "Choose import format", [
      { text: "Cancel", style: "cancel" },
      {
        text: "GeoJSON (Add)",
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
        text: "ZIP (Replace All)",
        style: "destructive",
        onPress: async () => {
          const importedItems = await importData();
          if (importedItems) {
            importItems(importedItems);
            Alert.alert("Success", `Imported ${importedItems.length} items`);
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
      Alert.alert("Success", `Imported ${importedItems.length} items`);
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
        items={items}
        areaPoints={areaPoints}
        drawingMode={drawingMode}
        repositionType={repositionItem?.type}
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
        items={items}
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
