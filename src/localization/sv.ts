import {TranslationKeys} from './en';

export const sv: Record<TranslationKeys, string> = {
  // General
  cancel: 'Avbryt',
  save: 'Spara',
  delete: 'Radera',
  close: 'Stäng',
  edit: 'Redigera',
  success: 'Klart',
  error: 'Fel',

  // Header
  online: 'Online',
  offline: 'Offline',
  gpsActive: 'GPS',

  // Tool Panel
  tools: 'Verktyg',
  gpsTracking: 'GPS-spårning',
  satelliteView: 'Satellitvy',
  addPoint: 'Kartmarkering',
  drawArea: 'Rita område',
  completeArea: 'Slutför område',
  clearDrawing: 'Rensa ritning',
  itemsList: 'Objektlista',
  about: 'Om',
  language: 'Språk',

  // Sidebar
  inventory: 'Inventering',
  noItems: 'Inga objekt ännu',
  export: 'Exportera',
  import: 'Importera',
  items: 'objekt',

  // Item Modal
  newPoint: 'Ny punkt',
  newArea: 'Nytt område',
  editItem: 'Redigera objekt',
  viewItem: 'Visa objekt',
  name: 'Namn',
  notes: 'Anteckningar',
  namePlaceholder: 'Ange namn...',
  notesPlaceholder: 'Ange anteckningar...',
  created: 'Skapad',
  area: 'Yta',
  photos: 'Foton',
  videos: 'Videor',
  history: 'Historik',
  addHistory: 'Lägg till historik',
  addMedia: 'Lägg till media',
  takePhoto: 'Ta foto',
  recordVideo: 'Spela in video',
  chooseFromLibrary: 'Välj från bibliotek',

  // Import/Export
  importData: 'Importera data',
  chooseFormat: 'Välj importformat',
  geoJsonAdd: 'GeoJSON (Lägg till)',
  zipReplaceAll: 'ZIP (Ersätt alla)',
  importedItems: 'Importerade {count} objekt',
  addedItems: 'Lade till {count} objekt',
  exportFormat: 'Exportformat',
  all: 'Alla',

  // Alerts
  deleteItem: 'Radera objekt',
  deleteConfirm: 'Är du säker?',
  importError: 'Importfel',
  exportError: 'Exportfel',
  noDataJson: 'Ingen data.json hittades i ZIP-filen',
  noValidFeatures: 'Inga giltiga Point- eller Polygon-objekt hittades i GeoJSON',
  invalidGeoJson: 'Ogiltig GeoJSON: ingen features-array hittades',

  // About
  aboutTitle: 'My Forest Tracker',
  version: 'Version',
  aboutDescription: 'En mobilapp för att hantera din skog på ett enkelt sätt.',
  features: 'Funktioner',
  featureGps: 'GPS-punkt och polygonområdesspårning',
  featureMedia: 'Foto- och videobilagor',
  featureHistory: 'Historikspårning för objekt',
  featureExport: 'Exportera till GeoJSON, CSV, ZIP',
  featureImport: 'Importera från GeoJSON',
  githubRepo: 'GitHub',

  // Map
  confirmLocation: 'Bekräfta',
  addAreaPoint: 'Lägg till',
  completeReposition: 'Klar',
  cancelReposition: 'Avbryt',

  // Language names
  english: 'Engelska',
  swedish: 'Svenska',
};
