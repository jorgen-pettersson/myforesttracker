export const en = {
  // App
  appName: 'My Forest Tracker',

  // General
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  close: 'Close',
  edit: 'Edit',
  success: 'Success',
  error: 'Error',

  // Header
  online: 'Online',
  offline: 'Offline',
  gpsActive: 'GPS',

  // Tool Panel
  tools: 'Tools',
  gpsTracking: 'GPS Tracking',
  satelliteView: 'Satellite View',
  addPoint: 'Add Point',
  drawArea: 'Draw Area',
  completeArea: 'Complete Area',
  clearDrawing: 'Clear Drawing',
  itemsList: 'Items List',
  about: 'About',
  language: 'Language',

  // Sidebar
  inventory: 'Inventory',
  noItems: 'No items yet',
  export: 'Export',
  import: 'Import',
  items: 'items',

  // Item Modal
  newPoint: 'New Point',
  newArea: 'New Area',
  editItem: 'Edit Item',
  viewItem: 'View Item',
  name: 'Name',
  notes: 'Notes',
  namePlaceholder: 'Enter name...',
  notesPlaceholder: 'Enter notes...',
  created: 'Created',
  area: 'Area',
  photos: 'Photos',
  videos: 'Videos',
  history: 'History',
  addHistory: 'Add History Entry',
  addMedia: 'Add Media',
  takePhoto: 'Take Photo',
  recordVideo: 'Record Video',
  chooseFromLibrary: 'Choose from Library',

  // Import/Export
  importData: 'Import Data',
  chooseFormat: 'Choose import format',
  geoJsonAdd: 'GeoJSON (Add)',
  zipReplaceAll: 'ZIP (Replace All)',
  importedItems: 'Imported {count} items',
  addedItems: 'Added {count} items',
  exportFormat: 'Export Format',
  all: 'All',

  // Alerts
  deleteItem: 'Delete Item',
  deleteConfirm: 'Are you sure?',
  importError: 'Import Error',
  exportError: 'Export Error',
  noDataJson: 'No data.json found in the ZIP file',
  noValidFeatures: 'No valid Point or Polygon features found in GeoJSON',
  invalidGeoJson: 'Invalid GeoJSON: no features array found',

  // About
  aboutTitle: 'My Forest Tracker',
  version: 'Version',
  aboutDescription: 'A mobile app for managing forestry inventory with GPS-based point and area mapping, media capture, and data export capabilities.',
  features: 'Features',
  featureGps: 'GPS point and polygon area tracking',
  featureMedia: 'Photo and video attachments',
  featureHistory: 'History tracking for items',
  featureExport: 'Export to GeoJSON, CSV, ZIP',
  featureImport: 'Import from GeoJSON',
  githubRepo: 'GitHub Repository',

  // Map
  confirmLocation: 'Confirm',
  addAreaPoint: 'Add Point',
  completeReposition: 'Done',
  cancelReposition: 'Cancel',

  // Language names
  english: 'English',
  swedish: 'Swedish',
};

export type TranslationKeys = keyof typeof en;
