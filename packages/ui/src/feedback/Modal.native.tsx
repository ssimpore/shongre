import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { motionDurationMs } from "@shongre/design-tokens";
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useReducedMotion } from "../hooks/useReducedMotion.native";
import {
  nativeBorders,
  nativeColors,
  nativeRadius,
  nativeSizing,
  nativeSpacing,
} from "@shongre/design-tokens/native";
import { Button } from "../primitives/Button.native";
import { Heading, Text } from "../primitives/Typography.native";
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: string;
  children: ReactNode;
  dismissible?: boolean;
  returnFocusRef?: RefObject<View | null>;
  safeAreaInsets: { top: number; right: number; bottom: number; left: number };
}
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  dismissible = true,
  returnFocusRef,
  safeAreaInsets,
}: ModalProps) {
  const reducedMotion = useReducedMotion();
  const titleRef = useRef<View>(null);
  const wasOpen = useRef(false);
  const restoreFocus = () => {
    wasOpen.current = false;
    const node =
      returnFocusRef?.current && findNodeHandle(returnFocusRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };
  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    if (Platform.OS === "ios") return;
    // Android has no modal onDismiss event. Restore after its closing transition.
    const timer = setTimeout(
      () => {
        wasOpen.current = false;
        const node =
          returnFocusRef?.current && findNodeHandle(returnFocusRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      },
      reducedMotion ? 0 : motionDurationMs.slow,
    );
    return () => clearTimeout(timer);
  }, [isOpen, reducedMotion, returnFocusRef]);
  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType={reducedMotion ? "none" : "fade"}
      onShow={() => {
        const node = titleRef.current && findNodeHandle(titleRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }}
      onDismiss={restoreFocus}
      onRequestClose={dismissible ? onClose : undefined}
    >
      <View
        style={[
          styles.scrim,
          {
            paddingTop: safeAreaInsets.top,
            paddingRight: safeAreaInsets.right,
            paddingBottom: safeAreaInsets.bottom,
            paddingLeft: safeAreaInsets.left,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            accessibilityViewIsModal
            importantForAccessibility="yes"
            style={styles.panel}
          >
            <View style={styles.header}>
              <View
                ref={titleRef}
                accessible
                accessibilityRole="header"
                style={styles.title}
              >
                {typeof title === "string" ? (
                  <Heading size="heading-sm">{title}</Heading>
                ) : (
                  title
                )}
                {description ? (
                  <Text size="caption" tone="muted">
                    {description}
                  </Text>
                ) : null}
              </View>
              {dismissible ? (
                <Button
                  variant="ghost"
                  size="sm"
                  accessibilityLabel="Fermer"
                  onPress={onClose}
                >
                  Fermer
                </Button>
              ) : null}
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}
export const Sheet = Modal;
export const Drawer = Modal;
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: nativeColors.interaction.overlay,
  },
  keyboard: { flex: 1, justifyContent: "flex-end" },
  scroll: { flexShrink: 1 },
  panel: {
    maxHeight: nativeSizing.dialogMaxHeight,
    backgroundColor: nativeColors.surface.raised,
    borderTopLeftRadius: nativeRadius.overlay,
    borderTopRightRadius: nativeRadius.overlay,
    borderWidth: nativeBorders.hairline,
    borderColor: nativeColors.border.default,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: nativeSpacing.md,
    padding: nativeSpacing.lg,
    borderBottomWidth: nativeBorders.hairline,
    borderBottomColor: nativeColors.border.subtle,
  },
  title: { flex: 1, gap: nativeSpacing.xs },
  body: { padding: nativeSpacing.lg },
});
