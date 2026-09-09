import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import {
  mobileColors as colors,
  nativeSpacing as spacing,
} from "@shongre/design-tokens/native";

interface ScreenProps extends PropsWithChildren {
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  /**
   * Defaults to the top inset only, because a tab screen sits above the tab
   * bar, which already reserves the bottom inset. A screen pushed onto the
   * stack has nothing below it and should pass `["top", "bottom"]` so its last
   * control clears the home indicator.
   */
  edges?: readonly Edge[];
}

const DEFAULT_EDGES: readonly Edge[] = ["top"];

export function Screen({
  children,
  contentContainerStyle,
  edges = DEFAULT_EDGES,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {/*
       * iOS does not move content out from under the software keyboard on its
       * own, so a field near the bottom of a form — the password on sign-in,
       * the last step of the publish flow — is typed into blind. Android
       * resizes the window itself, which `height` would fight, so it opts out.
       */}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
