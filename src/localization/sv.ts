import { TranslationKeys } from "./en";

export const sv: Record<TranslationKeys, string> = {
  // App
  appName: "My Forest Tracker",

  // General
  cancel: "Avbryt",
  save: "Spara",
  delete: "Radera",
  close: "Stäng",
  edit: "Redigera",
  add: "Lägg till",
  success: "Klart",
  error: "Fel",

  // Header
  online: "Online",
  offline: "Offline",
  gpsActive: "GPS",

  // Tool Panel
  tools: "Verktyg",
  gpsTracking: "GPS-spårning",
  satelliteView: "Satellitvy",
  addPoint: "Kartmarkering",
  drawArea: "Rita område",
  completeArea: "Slutför område",
  clearDrawing: "Rensa ritning",
  itemsList: "Objektlista",
  about: "Om",
  language: "Språk",

  // Sidebar
  inventory: "Inventering",
  noItems: "Inga objekt ännu",
  export: "Export",
  import: "Import",
  items: "Områden",

  // Item Modal
  newPoint: "Ny punkt",
  newArea: "Nytt område",
  editItem: "Redigera objekt",
  viewItem: "Visa objekt",
  name: "Namn",
  notes: "Anteckningar",
  title: "Titel",
  description: "Beskrivning",
  namePlaceholder: "Ange namn...",
  notesPlaceholder: "Ange anteckningar...",
  created: "Skapad",
  area: "Yta",
  color: "Färg",
  properties: "Egenskaper",
  media: "Media",
  photos: "Foton",
  videos: "Videor",
  history: "Historik",
  addHistory: "Lägg till historik",
  noHistoryEntries: "Ingen historik ännu",
  addMedia: "Lägg till media",
  takePhoto: "Ta foto",
  recordVideo: "Spela in video",
  chooseFromLibrary: "Välj från bibliotek",

  // Import/Export
  importData: "Importera data",
  chooseFormat: "Välj importformat",
  geoJsonAdd: "GeoJSON (Lägg till)",
  forestandXmlImport: "Forestand XML (Konvertera via API)",
  zipReplaceAll: "ZIP (Ersätt alla)",
  importedItems: "Importerade {count} objekt",
  addedItems: "Lade till {count} objekt",
  exportFormat: "Exportformat",
  chooseExportFormat: "Välj exportformat",
  all: "Alla",
  allFormats: "Alla format",
  jsonOnly: "Endast JSON",
  csvOnly: "Endast CSV",
  geoJsonOnly: "Endast GeoJSON",
  itemsCount: "Objekt ({count})",
  mapProperties: "Mappa egenskaper",
  selectNameProperty: "Välj egenskap för namn",
  selectNotesProperty: "Välj egenskap för anteckningar",
  selectXmlFile: "Välj en .xml-fil",
  forestandResponseInvalid: "Kunde inte tolka API-svaret som GeoJSON",

  // Alerts
  deleteItem: "Radera objekt",
  deleteConfirm: "Är du säker?",
  importError: "Importfel",
  exportError: "Exportfel",
  exportFailed: "Export misslyckades: {message}",
  importFailed: "Import misslyckades: {message}",
  noDataJson: "Ingen data.json hittades i ZIP-filen",
  noValidFeatures:
    "Inga giltiga Point- eller Polygon-objekt hittades i GeoJSON",
  invalidGeoJson: "Ogiltig GeoJSON: ingen features-array hittades",
  parseGeoJsonFailed: "Kunde inte tolka GeoJSON: {message}",
  forestandConvertFailed: "Kunde inte konvertera Forestand XML: {details}",
  areaMinPoints: "Ett område behöver minst 3 punkter",
  nameRequired: "Ange ett namn",

  // About
  aboutTitle: "My Forest Tracker",
  version: "Version",
  aboutDescription: "En mobilapp för att hantera din skog på ett enkelt sätt.",
  features: "Funktioner",
  featureGps: "GPS-punkt och polygonområdesspårning",
  featureMedia: "Foto- och videobilagor",
  featureHistory: "Historikspårning för objekt",
  featureExport: "Exportera till GeoJSON, CSV, ZIP",
  featureImport: "Importera från GeoJSON",
  githubRepo: "GitHub",

  // Map
  confirmLocation: "Bekräfta",
  addAreaPoint: "Lägg till",
  setNewPosition: "Sätt ny position",
  completeReposition: "Klar",
  cancelReposition: "Avbryt",

  // Language names
  english: "Engelska",
  swedish: "Svenska",
};
