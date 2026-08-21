import { Tabs } from "expo-router";
import { SemanticIcon, type IconName } from "@shongre/ui/native";
import type { ColorValue } from "react-native";
import {
  mobileColors as colors,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

const tabIcon = (name: IconName) => {
  function TabIcon({ color }: { color: ColorValue }) {
    return <SemanticIcon name={name} size="nav" color={color} />;
  }
  TabIcon.displayName = `${name}TabIcon`;
  return TabIcon;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          minHeight: nativeSizing.mobileNavHeight,
          paddingBottom: spacing.xs,
          paddingTop: spacing.xs,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: nativeTypography.size.micro,
          fontFamily: nativeTypography.fontFamily.bold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Accueil", tabBarIcon: tabIcon("home") }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Recherche", tabBarIcon: tabIcon("search") }}
      />
      <Tabs.Screen
        name="publish"
        options={{ title: "Publier", tabBarIcon: tabIcon("plus") }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: "Messages", tabBarIcon: tabIcon("message") }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Compte", tabBarIcon: tabIcon("user") }}
      />
    </Tabs>
  );
}
