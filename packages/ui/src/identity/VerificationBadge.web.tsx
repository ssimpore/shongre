import { Badge } from "../primitives/Badge.web";
import type {
  IdentityBadgeSize,
  VerificationBadgeProps,
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
  showIcon = true,
}: VerificationBadgeProps) {
  const accessibleName = accessibilityLabel ?? label;
  return (
    <Badge
      variant="success"
      size={size}
      icon={showIcon ? <VerifiedIcon size={iconSizes[size]} /> : undefined}
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
