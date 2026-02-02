import { useState, useRef, useEffect, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import Geolocation from "@react-native-community/geolocation";
import { Region, Coordinate } from "../types";
import { DEFAULT_REGION } from "../constants";

interface UseLocationProps {
  gpsTracking: boolean;
  setGpsTracking: (value: boolean) => void;
}

export function useLocation({ gpsTracking, setGpsTracking }: UseLocationProps) {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null
  );
  const [hasInitialFix, setHasInitialFix] = useState(false);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        getCurrentLocation();
      }
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        if (!hasInitialFix) {
          setRegion({
            latitude,
            longitude,
            latitudeDelta: DEFAULT_REGION.latitudeDelta,
            longitudeDelta: DEFAULT_REGION.longitudeDelta,
          });
          setHasInitialFix(true);
        } else if (gpsTracking) {
          setRegion({
            latitude,
            longitude,
            latitudeDelta: DEFAULT_REGION.latitudeDelta,
            longitudeDelta: DEFAULT_REGION.longitudeDelta,
          });
        }
      },
      (error) => {
        console.log(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Start/stop GPS watch based on gpsTracking state
  useEffect(() => {
    if (gpsTracking) {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      watchId.current = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          if (gpsTracking) {
            setRegion((prev) => ({
              ...prev,
              latitude,
              longitude,
            }));
          }
        },
        (error) => {
          console.log(error);
        },
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    } else {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [gpsTracking]);

  const toggleGPSTracking = useCallback(() => {
    setGpsTracking(!gpsTracking);
  }, [gpsTracking, setGpsTracking]);

  return {
    region,
    setRegion,
    currentLocation,
    gpsTracking,
    toggleGPSTracking,
  };
}
