export const en = {
  // App
  appName: "My Forest Tracker",

  // General
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  close: "Close",
  edit: "Edit",
  add: "Add",
  success: "Success",
  error: "Error",

  // Header
  online: "Online",
  offline: "Offline",
  gpsActive: "GPS",

  // Tool Panel
  tools: "Tools",
  gpsTracking: "GPS Tracking",
  satelliteView: "Satellite View",
  addPoint: "Add Point",
  drawArea: "Draw Area",
  completeArea: "Complete Area",
  clearDrawing: "Clear Drawing",
  itemsList: "Items List",
  about: "About",
  language: "Language",

  // Sidebar
  inventory: "Inventory",
  noItems: "No items yet",
  export: "Export",
  import: "Import",
  items: "items",

  // Item Modal
  newPoint: "New Point",
  newArea: "New Area",
  editItem: "Edit Item",
  viewItem: "View Item",
  name: "Name",
  notes: "Notes",
  title: "Title",
  description: "Description",
  namePlaceholder: "Enter name...",
  notesPlaceholder: "Enter notes...",
  created: "Created",
  area: "Area",
  color: "Color",
  properties: "Properties",
  media: "Media",
  photos: "Photos",
  videos: "Videos",
  history: "History",
  addHistory: "Add History Entry",
  noHistoryEntries: "No history entries yet",
  addMedia: "Add Media",
  takePhoto: "Take Photo",
  recordVideo: "Record Video",
  chooseFromLibrary: "Choose from Library",

  // Import/Export
  importData: "Import Data",
  chooseFormat: "Choose import format",
  geoJsonAdd: "GeoJSON (Add)",
  forestandXmlImport: "Forestand XML (Convert via API)",
  zipReplaceAll: "ZIP (Replace All)",
  importedItems: "Imported {count} items",
  addedItems: "Added {count} items",
  exportFormat: "Export Format",
  chooseExportFormat: "Choose export format",
  all: "All",
  allFormats: "All formats",
  jsonOnly: "JSON only",
  csvOnly: "CSV only",
  geoJsonOnly: "GeoJSON only",
  itemsCount: "Items ({count})",
  mapProperties: "Map Properties",
  selectNameProperty: "Select property for item name",
  selectNotesProperty: "Select property for item notes",
  selectXmlFile: "Please select a .xml file",
  forestandResponseInvalid: "Failed to parse API response as GeoJSON",

  // Alerts
  deleteItem: "Delete Item",
  deleteConfirm: "Are you sure?",
  importError: "Import Error",
  exportError: "Export Error",
  exportFailed: "Failed to export data: {message}",
  importFailed: "Failed to import data: {message}",
  noDataJson: "No data.json found in the ZIP file",
  noValidFeatures: "No valid Point or Polygon features found in GeoJSON",
  invalidGeoJson: "Invalid GeoJSON: no features array found",
  parseGeoJsonFailed: "Failed to parse GeoJSON: {message}",
  forestandConvertFailed: "Failed to convert Forestand XML: {details}",
  areaMinPoints: "An area needs at least 3 points",
  nameRequired: "Please enter a name",

  // About
  aboutTitle: "My Forest Tracker",
  version: "Version",
  aboutDescription:
    "A mobile app for managing forestry inventory with GPS-based point and area mapping, media capture, and data export capabilities.",
  features: "Features",
  featureGps: "GPS point and polygon area tracking",
  featureMedia: "Photo and video attachments",
  featureHistory: "History tracking for items",
  featureExport: "Export to GeoJSON, CSV, ZIP",
  featureImport: "Import from GeoJSON",
  githubRepo: "GitHub Repository",

  // Map
  confirmLocation: "Confirm",
  addAreaPoint: "Add Point",
  setNewPosition: "Set New Position",
  completeReposition: "Done",
  cancelReposition: "Cancel",

  // Language names
  english: "English",
  swedish: "Swedish",
};

export type TranslationKeys = keyof typeof en;
