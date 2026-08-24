import type { ReactNode } from "react";
import { Modal as RNModal, SafeAreaView, StyleSheet, View } from "react-native";
import {
  nativeColors,
  nativeRadius,
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
}
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  dismissible = true,
}: ModalProps) {
  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={dismissible ? onClose : undefined}
    >
      <SafeAreaView style={styles.scrim}>
        <View accessibilityViewIsModal style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.title}>
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
          <View style={styles.body}>{children}</View>
        </View>
      </SafeAreaView>
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
  panel: {
    maxHeight: "90%",
    backgroundColor: nativeColors.surface.raised,
    borderTopLeftRadius: nativeRadius.overlay,
    borderTopRightRadius: nativeRadius.overlay,
    borderWidth: 1,
    borderColor: nativeColors.border.default,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: nativeSpacing.md,
    padding: nativeSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: nativeColors.border.subtle,
  },
  title: { flex: 1, gap: nativeSpacing.xs },
  body: { padding: nativeSpacing.lg },
});
