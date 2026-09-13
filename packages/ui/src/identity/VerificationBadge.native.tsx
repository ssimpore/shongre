import { Badge } from "../primitives/Badge.native";
import type {
  IdentityBadgeSize,
  VerificationBadgeProps,
  VerifiedIconSize,
} from "./identity-status.types";
import { VerifiedIcon } from "./VerifiedIcon.native";

const iconSizes: Record<IdentityBadgeSize, VerifiedIconSize> = {
  xs: "xs",
  sm: "xs",
  md: "sm",
};

/** Native counterpart of the canonical localized verification badge. */
export function VerificationBadge({
  label,
  size = "sm",
  accessibilityLabel,
  showIcon = true,
}: VerificationBadgeProps) {
  return (
    <Badge
      variant="success"
      size={size}
      icon={showIcon ? <VerifiedIcon size={iconSizes[size]} /> : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="image"
      testID="ui-verification-badge"
    >
      {label}
    </Badge>
  );
}
