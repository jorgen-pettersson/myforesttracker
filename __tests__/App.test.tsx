/**
 * @format
 */

import React from "react";
import ReactTestRenderer from "react-test-renderer";
import App from "../App";

jest.mock("../src/components", () => ({
  Header: () => null,
  ToolPanel: () => null,
  MenuToggleButton: () => null,
  ItemModal: () => null,
  Sidebar: () => null,
  InventoryMap: () => null,
  AboutModal: () => null,
  PropertyMappingModal: () => null,
}));

jest.mock("../src/hooks", () => ({
  useLocation: () => ({
    region: {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
    setRegion: jest.fn(),
    toggleGPSTracking: jest.fn(),
  }),
}));

jest.mock("../src/features/preferences", () => ({
  useSettings: () => ({
    gpsTracking: false,
    setGpsTracking: jest.fn(),
    mapType: "standard",
    toggleMapType: jest.fn(),
    isLoaded: true,
  }),
}));

jest.mock("../src/features/inventory", () => ({
  useInventory: () => ({
    places: [],
    addItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
    toggleItemVisibility: jest.fn(),
    calculateArea: jest.fn(() => 0),
    importItems: jest.fn(),
    appendItems: jest.fn(),
  }),
}));

jest.mock("../src/features/importExport", () => ({
  useImportExport: () => ({
    exportData: jest.fn(),
    importData: jest.fn(),
    parseGeoJSON: jest.fn(),
    parseForestandXml: jest.fn(),
    processGeoJSON: jest.fn(),
  }),
}));

jest.mock("../src/localization", () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useLocalization: () => ({
    language: "en",
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }),
}));

test("renders correctly", async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
