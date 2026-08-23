import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  mobileColors as colors,
  nativeSpacing as spacing,
} from "@shongre/design-tokens/native";

interface ScreenProps extends PropsWithChildren {
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
}

export function Screen({ children, contentContainerStyle }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
});
