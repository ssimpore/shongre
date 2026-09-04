import { Badge } from "../primitives/Badge.web";
import type {
  IdentityBadgeProps,
  IdentityBadgeSize,
  VerifiedIconSize,
} from "./identity-status.types";
import { VerifiedIcon } from "./VerifiedIcon.web";

const iconSizes: Record<IdentityBadgeSize, VerifiedIconSize> = {
  xs: "xs",
  sm: "xs",
  md: "sm",
};

/** A localized public verification fact with one canonical treatment. */
export function VerificationBadge({
  label,
  size = "sm",
  accessibilityLabel,
}: IdentityBadgeProps) {
  const accessibleName = accessibilityLabel ?? label;
  return (
    <Badge
      variant="success"
      size={size}
      icon={<VerifiedIcon size={iconSizes[size]} />}
      data-ui-verification-badge="true"
      role="img"
      aria-label={accessibleName}
      title={accessibleName}
      className="shrink-0 font-bold"
    >
      {label}
    </Badge>
  );
}
