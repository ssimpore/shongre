import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Expo web has no Keychain/Keystore equivalent. Keep sessions in memory there
// instead of downgrading credentials into localStorage.
const webMemory = new Map<string, string>();

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return webMemory.get(key) ?? null;
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      webMemory.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      webMemory.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
