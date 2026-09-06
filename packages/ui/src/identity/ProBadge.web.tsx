import { Badge } from "../primitives/Badge.web";
import type { ProBadgeProps } from "./identity-status.types";

/** The only professional-account marker; callers control wording, never appearance. */
export function ProBadge({
  label,
  size = "sm",
  accessibilityLabel,
  tone = "inverse",
}: ProBadgeProps) {
  return (
    <Badge
      variant={tone}
      size={size}
      data-ui-pro-badge="true"
      role="img"
      aria-label={accessibilityLabel}
      title={accessibilityLabel}
      className="shrink-0 font-bold"
    >
      {label}
    </Badge>
  );
}
