import { StyleSheet } from "react-native";
import { nativeColors, nativeSpacing } from "@shongre/design-tokens/native";
import { Button } from "../primitives/Button.native";
import { Card } from "../primitives/Card.native";
import { Heading, Text } from "../primitives/Typography.native";
export interface StatePanelProps {
  title: string;
  description?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "error" | "notFound" | "restricted" | "offline";
  tone?: "neutral" | "error";
  /** Web maps this to a semantic heading; native keeps the shared API shape. */
  headingLevel?: 1 | 2 | 3;
}
export function StatePanel({
  title,
  description,
  message,
  actionLabel,
  onAction,
  variant,
  tone,
}: StatePanelProps) {
  const isError = variant === "error" || tone === "error";
  return (
    <Card
      accessibilityRole={isError ? "alert" : undefined}
      accessibilityLiveRegion={isError ? "assertive" : "polite"}
      style={[styles.panel, isError && styles.error]}
    >
      <Heading size="heading-sm">{title}</Heading>
      <Text tone="muted">{description ?? message ?? ""}</Text>
      {actionLabel && onAction ? (
        <Button variant="secondary" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
const styles = StyleSheet.create({
  panel: { gap: nativeSpacing.md, padding: nativeSpacing.xl },
  error: { borderColor: nativeColors.status.error },
});
