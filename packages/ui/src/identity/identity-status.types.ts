/** Canonical, token-backed sizes shared by verification and professional badges. */
export type IdentityBadgeSize = "xs" | "sm" | "md";

/** Canonical, token-backed sizes for the standalone verification mark. */
export type VerifiedIconSize = "xs" | "sm" | "md" | "lg";

/** Presence is deliberately explicit: unknown must never be presented as offline. */
export type PresenceState = "online" | "away" | "offline" | "unknown";

export interface PresenceIndicatorProps {
  status: PresenceState;
  /** Localized accessible name such as “En ligne” or “Statut indisponible”. */
  label: string;
  size?: "xs" | "sm";
  /** Use when adjacent text already communicates the same status. */
  decorative?: boolean;
}

export interface IdentityBadgeProps {
  /** Localized visible text. */
  label: string;
  size?: IdentityBadgeSize;
  /** Localized expanded name for abbreviated visible text such as “Pro”. */
  accessibilityLabel?: string;
}

export interface VerificationBadgeProps extends IdentityBadgeProps {
  /** Keep the canonical badge treatment while omitting a redundant icon. */
  showIcon?: boolean;
}

export interface ProBadgeProps extends Omit<
  IdentityBadgeProps,
  "accessibilityLabel"
> {
  /** Localized expanded name for the intentionally compact visible label. */
  accessibilityLabel: string;
  /** Listing cards use the soft brand treatment; other identity surfaces stay inverse. */
  tone?: "inverse" | "primary";
}

export interface VerifiedIconProps {
  size?: VerifiedIconSize;
  /** Localized name when the icon conveys meaning; omit when adjacent text does. */
  label?: string;
}
