# Forestry Inventory App

En enkel app för att hantera sin skog..
- Import av geojson,Forestand format 
- Se och uppdatera avdelningar i skogsbruksplanen
- Lägga in kommentarer med bilder för uppföljning.
- Full historik
Demo: https://photos.google.com/share/AF1QipMH-gqWgVC1VpCAvbKAx6O5MCe2x81N-6WuHfhBiGmRchMBl1hC9fn4iCFQ3lwJTw/photo/AF1QipMXP40ETXMlmPtzhJN2A_TBEjiJ4T65B8hQdy9s?key=MS1QNTAxOXdPRV9MZ2xyTU9mVUxQVmVUVGlXbmZn

-------------------------------------------------------------------------------------------------------------------------
A React Native mobile application for managing forestry inventory with Google Maps integration, GPS tracking, and offline capabilities.

## Features

- **Google Maps Integration**: Interactive map view with satellite and terrain layers
- **GPS Tracking**: Real-time location tracking with continuous GPS monitoring
- **Point Marking**: Add individual tree/point markers on the map with detailed information
- **Area Drawing**: Draw polygons to mark forestry areas with automatic area calculation
- **Offline Mode**: All data stored locally using AsyncStorage for offline access
- **Data Export**: Export inventory data for external use
- **Inventory Management**: Track tree species, names, and notes for each point or area

## Prerequisites

- Node.js (v18 or higher)
- React Native development environment set up
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and Android SDK
- Google Maps API Key

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd ForestryInventory
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **For iOS, install pods:**
   ```bash
   cd ios
   pod install
   cd ..
   ```

## Configuration

### Google Maps API Key

You need to obtain a Google Maps API Key from the [Google Cloud Console](https://console.cloud.google.com/).

1. Create a new project or select an existing one
2. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
3. Create credentials (API Key)
4. Restrict the API key (recommended) to your app's bundle ID/package name

#### Android Setup

Edit `android/app/src/main/AndroidManifest.xml` and replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:

```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="YOUR_ACTUAL_API_KEY_HERE"/>
```

#### iOS Setup

The app uses react-native-maps which handles the API key configuration. Make sure you have your API key configured in your Google Cloud Console for iOS.

## Running the App

### Android

```bash
npx react-native run-android
```

### iOS

```bash
npx react-native run-ios
```

## App Usage

### GPS Tracking

1. Tap the "📍 GPS" button to start tracking your location
2. The map will follow your position as you move
3. Tap again to stop tracking

### Adding Points

1. Tap the "📌 Point" button to enter point mode
2. Tap anywhere on the map to place a marker
3. Fill in the details:
   - Name/ID
   - Species
   - Notes
4. Tap "Save" to add the point to inventory

### Drawing Areas

1. Tap the "⬜ Area" button to enter area drawing mode
2. Tap on the map to create polygon vertices (minimum 3 points)
3. Tap "✓ Done" when finished
4. Fill in the details:
   - Name/ID
   - Species
   - Notes
   - Area is automatically calculated in m²
5. Tap "Save" to add the area to inventory

### Managing Inventory

- All items appear in the sidebar on the right
- View item details including type, species, and area (for polygons)
- Delete items by tapping the "Delete" button on each card
- Export all data using the "Export Data" button

### Offline Mode

- All inventory data is automatically saved to local storage
- The app works completely offline after initial setup
- Data persists between app sessions
- Online/offline status shown in the header

## Project Structure

```
ForestryInventory/
├── App.tsx                 # Main application component
├── android/               # Android native code and configuration
│   └── app/src/main/
│       └── AndroidManifest.xml
├── ios/                   # iOS native code and configuration
│   └── ForestryInventory/
│       └── Info.plist
├── package.json           # Dependencies
└── README.md             # This file
```

## Dependencies

- **react-native-maps**: Google Maps integration
- **react-native-geolocation-service**: GPS location services
- **@react-native-async-storage/async-storage**: Local data persistence

## Permissions

### Android
- `ACCESS_FINE_LOCATION`: For precise GPS coordinates
- `ACCESS_COARSE_LOCATION`: For approximate location
- `INTERNET`: For map tiles

### iOS
- `NSLocationWhenInUseUsageDescription`: Location access while using the app
- `NSLocationAlwaysAndWhenInUseUsageDescription`: Background location access

## Troubleshooting

### Maps not showing

1. Verify your Google Maps API key is correct
2. Ensure the Maps SDK is enabled in Google Cloud Console
3. Check that your API key is not restricted or has proper restrictions

### GPS not working

1. Make sure location permissions are granted
2. Check device settings for location services
3. Try on a physical device (emulators may have limited GPS)

### Build errors

For Android:
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

For iOS:
```bash
cd ios
pod deintegrate
pod install
cd ..
npx react-native run-ios
```

## Future Enhancements

- Photo attachment for inventory items
- Advanced data export (CSV, GeoJSON, KML)
- Cloud sync capability
- Search and filter inventory items
- Offline map tile caching
- Multiple project support
- Data visualization and reports

## License

This project is for forestry inventory management purposes.
