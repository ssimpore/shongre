import { Badge } from "../primitives/Badge.native";
import type {
  IdentityBadgeProps,
  IdentityBadgeSize,
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
}: IdentityBadgeProps) {
  return (
    <Badge
      variant="success"
      size={size}
      icon={<VerifiedIcon size={iconSizes[size]} />}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="image"
      testID="ui-verification-badge"
    >
      {label}
    </Badge>
  );
}
