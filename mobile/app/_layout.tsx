import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { MarketProvider } from "@/features/market/MarketProvider";
import { mobileColors as colors } from "@shongre/design-tokens/native";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MarketProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                headerBackTitle: "Retour",
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="auth/login"
                options={{ title: "Connexion", presentation: "modal" }}
              />
              <Stack.Screen
                name="listing/[id]"
                options={{ title: "Annonce" }}
              />
              <Stack.Screen
                name="settings/index"
                options={{ title: "Réglages" }}
              />
              <Stack.Screen
                name="settings/delete-account"
                options={{ title: "Supprimer mon compte" }}
              />
            </Stack>
          </AuthProvider>
        </MarketProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
