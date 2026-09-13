import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SemanticIcon, type IconName } from "@shongre/ui/native";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeSizing,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

/**
 * The native half of a listing's detail page.
 *
 * The Web detail page reads a listing's published characteristics through one
 * projection and renders them as key facts, named amenities and a location.
 * The native screen showed a photo, a price, a city and a contact button — a
 * user comparing two listings on a phone could not see what either one
 * actually was.
 *
 * These are the same sections in native primitives, fed by the same projection
 * in `@shongre/features/listings/facts`, so the two platforms cannot drift
 * about what a listing says. What differs is only the layout a phone can hold:
 * one column rather than the two and three the Web page uses, because a phone
 * that fits two labels across fits neither of them whole.
 */

export interface DetailSectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function DetailSection({
  title,
  subtitle,
  action,
  children,
}: DetailSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {action}
      </View>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export interface DetailFact {
  code: string;
  label: string;
  value: string;
  icon: IconName;
}

/**
 * One column, not two. A phone has room for a label and a value on one line at
 * a readable size, and squeezing two pairs across wraps every long label.
 */
export function DetailFactList({ facts }: { facts: readonly DetailFact[] }) {
  if (!facts.length) return null;
  return (
    <View>
      {facts.map((fact) => (
        <View key={`${fact.code}-${fact.label}`} style={styles.row}>
          <View style={styles.iconBadge}>
            <SemanticIcon name={fact.icon} size="sm" color={colors.text} />
          </View>
          <Text style={styles.label}>{fact.label}</Text>
          <Text style={styles.value}>{fact.value}</Text>
        </View>
      ))}
    </View>
  );
}

export interface DetailFeature {
  code: string;
  label: string;
  icon: IconName;
}

/** Capabilities the listing has, named rather than paired with the word "Oui". */
export function DetailFeatureList({
  features,
}: {
  features: readonly DetailFeature[];
}) {
  if (!features.length) return null;
  return (
    <View style={styles.featureGrid}>
      {features.map((feature) => (
        <View key={feature.code} style={styles.feature}>
          <View style={styles.iconBadge}>
            <SemanticIcon name={feature.icon} size="sm" color={colors.text} />
          </View>
          <Text style={styles.featureLabel}>{feature.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: nativeTypography.size.headingSm,
    lineHeight: nativeTypography.lineHeight.headingSm,
    fontFamily: nativeTypography.fontFamily.bold,
    flexShrink: 1,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
    marginTop: spacing.xs,
  },
  sectionBody: { marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconBadge: {
    width: nativeSizing.controlMd,
    height: nativeSizing.controlMd,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  label: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
    flex: 1,
    textAlign: "right",
  },
  featureGrid: { rowGap: spacing.sm },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureLabel: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
    flexShrink: 1,
  },
});
