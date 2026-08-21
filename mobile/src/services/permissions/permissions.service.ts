import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

export type PermissionOutcome = "granted" | "denied" | "blocked";

function normalize(canAskAgain: boolean, granted: boolean): PermissionOutcome {
  if (granted) return "granted";
  return canAskAgain ? "denied" : "blocked";
}

export const permissionsService = {
  async requestCamera(): Promise<PermissionOutcome> {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    return normalize(result.canAskAgain, result.granted);
  },
  async requestPhotoSelection(): Promise<PermissionOutcome> {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return normalize(result.canAskAgain, result.granted);
  },
  async requestForegroundLocation(): Promise<PermissionOutcome> {
    const result = await Location.requestForegroundPermissionsAsync();
    return normalize(result.canAskAgain, result.granted);
  },
  async requestNotifications(): Promise<PermissionOutcome> {
    const result = await Notifications.requestPermissionsAsync();
    return normalize(result.canAskAgain, result.granted);
  },
};
