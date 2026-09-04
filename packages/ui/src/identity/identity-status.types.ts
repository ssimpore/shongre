/** Canonical, token-backed sizes shared by verification and professional badges. */
export type IdentityBadgeSize = "xs" | "sm" | "md";

/** Canonical, token-backed sizes for the standalone verification mark. */
export type VerifiedIconSize = "xs" | "sm" | "md" | "lg";

export interface IdentityBadgeProps {
  /** Localized visible text. */
  label: string;
  size?: IdentityBadgeSize;
  /** Localized expanded name for abbreviated visible text such as “Pro”. */
  accessibilityLabel?: string;
}

export interface ProBadgeProps extends Omit<
  IdentityBadgeProps,
  "accessibilityLabel"
> {
  /** Localized expanded name for the intentionally compact visible label. */
  accessibilityLabel: string;
}

export interface VerifiedIconProps {
  size?: VerifiedIconSize;
  /** Localized name when the icon conveys meaning; omit when adjacent text does. */
  label?: string;
}
