import type { ReactNode } from "react";
import {
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { nativeColors, nativeTypography } from "@shongre/design-tokens/native";

type TextTone =
  | "main"
  | "secondary"
  | "muted"
  | "disabled"
  | "inverse"
  | "primary"
  | "success"
  | "warning"
  | "danger";

export interface TextProps {
  children: ReactNode;
  size?:
    | "body-lg"
    | "body-md"
    | "body-sm"
    | "label-md"
    | "label-sm"
    | "caption"
    | "overline";
  weight?: "normal" | "medium" | "semibold" | "bold";
  tone?: TextTone;
  numberOfLines?: number;
  accessibilityLabel?: string;
  accessibilityRole?: "text" | "summary" | "alert" | "header" | "link";
  style?: StyleProp<TextStyle>;
}

export function Text({
  children,
  size = "body-md",
  weight = "normal",
  tone = "main",
  style,
  ...props
}: TextProps) {
  return (
    <RNText
      style={[textSizes[size], textWeights[weight], textTones[tone], style]}
      {...props}
    >
      {children}
    </RNText>
  );
}

export interface HeadingProps extends Omit<
  TextProps,
  "size" | "weight" | "accessibilityRole"
> {
  size?:
    | "display-lg"
    | "display-md"
    | "display-sm"
    | "heading-xl"
    | "heading-lg"
    | "heading-md"
    | "heading-sm"
    | "heading-xs";
}

export function Heading({
  children,
  size = "heading-md",
  tone = "main",
  style,
  ...props
}: HeadingProps) {
  return (
    <RNText
      accessibilityRole="header"
      style={[headingSizes[size], textTones[tone], style]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const textSizes = StyleSheet.create({
  "body-lg": {
    fontSize: nativeTypography.size.bodyLg,
    lineHeight: nativeTypography.lineHeight.bodyLg,
  },
  "body-md": {
    fontSize: nativeTypography.size.body,
    lineHeight: nativeTypography.lineHeight.body,
  },
  "body-sm": {
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  "label-md": {
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  "label-sm": {
    fontSize: nativeTypography.size.caption,
    lineHeight: nativeTypography.lineHeight.caption,
  },
  caption: {
    fontSize: nativeTypography.size.caption,
    lineHeight: nativeTypography.lineHeight.caption,
  },
  overline: {
    fontSize: nativeTypography.size.micro,
    lineHeight: nativeTypography.lineHeight.caption,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
const headingSizes = StyleSheet.create({
  "display-lg": {
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.displayLg,
    lineHeight: nativeTypography.lineHeight.displayLg,
  },
  "display-md": {
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.displayMd,
    lineHeight: nativeTypography.lineHeight.displayMd,
  },
  "display-sm": {
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.displaySm,
    lineHeight: nativeTypography.lineHeight.displaySm,
  },
  "heading-xl": {
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.headingXl,
    lineHeight: nativeTypography.lineHeight.headingXl,
  },
  "heading-lg": {
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.headingLg,
    lineHeight: nativeTypography.lineHeight.headingLg,
  },
  "heading-md": {
    fontFamily: nativeTypography.fontFamily.bold,
    fontSize: nativeTypography.size.headingMd,
    lineHeight: nativeTypography.lineHeight.headingMd,
  },
  "heading-sm": {
    fontFamily: nativeTypography.fontFamily.semibold,
    fontSize: nativeTypography.size.headingSm,
    lineHeight: nativeTypography.lineHeight.headingSm,
  },
  "heading-xs": {
    fontFamily: nativeTypography.fontFamily.semibold,
    fontSize: nativeTypography.size.headingXs,
    lineHeight: nativeTypography.lineHeight.headingXs,
  },
});
const textWeights = StyleSheet.create({
  normal: { fontFamily: nativeTypography.fontFamily.regular },
  medium: { fontFamily: nativeTypography.fontFamily.medium },
  semibold: { fontFamily: nativeTypography.fontFamily.semibold },
  bold: { fontFamily: nativeTypography.fontFamily.bold },
});
const textTones = StyleSheet.create({
  main: { color: nativeColors.text.primary },
  secondary: { color: nativeColors.text.secondary },
  muted: { color: nativeColors.text.muted },
  disabled: { color: nativeColors.text.disabled },
  inverse: { color: nativeColors.text.inverse },
  primary: { color: nativeColors.action.primary },
  success: { color: nativeColors.status.success },
  warning: { color: nativeColors.status.warning },
  danger: { color: nativeColors.status.error },
});
