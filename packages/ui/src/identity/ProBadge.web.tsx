import { Badge } from "../primitives/Badge.web";
import type { ProBadgeProps } from "./identity-status.types";

/** The only professional-account marker; callers control wording, never appearance. */
export function ProBadge({
  label,
  size = "sm",
  accessibilityLabel,
}: ProBadgeProps) {
  return (
    <Badge
      variant="inverse"
      size={size}
      data-ui-pro-badge="true"
      role="img"
      aria-label={accessibilityLabel}
      title={accessibilityLabel}
      className="shrink-0 font-bold uppercase tracking-wide"
    >
      {label}
    </Badge>
  );
}
