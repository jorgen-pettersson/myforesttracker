/**
 * Actor Context Management
 *
 * Manages device identification and actor creation for change tracking.
 * Provides utilities to identify who/what is making changes to Places.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChangeActor } from "../types";

const DEVICE_ID_KEY = "@device_uuid";

let cachedDeviceId: string | null = null;

/**
 * Get or generate a unique device identifier
 * This ID is persisted and used to track changes made by this device
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 11)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  cachedDeviceId = deviceId;
  return deviceId;
}

/**
 * Create a user actor with device identification
 */
export async function getUserActor(): Promise<ChangeActor> {
  const deviceId = await getDeviceId();
  return { type: "user", id: deviceId };
}

/**
 * Create a system actor (no user interaction)
 */
export function getSystemActor(): ChangeActor {
  return { type: "system" };
}

/**
 * Create an import actor for external data sources
 * @param source - Import source identifier (e.g., "geojson", "forestand", "csv")
 */
export function getImportActor(source: string): ChangeActor {
  return { type: "import", id: source };
}
