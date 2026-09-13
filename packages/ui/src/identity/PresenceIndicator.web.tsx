import type {
  PresenceIndicatorProps,
  PresenceState,
} from "./identity-status.types";

const statusClasses: Record<PresenceState, string> = {
  online: "bg-success",
  away: "bg-warning",
  offline: "bg-text-tertiary",
  unknown: "bg-text-disabled",
};

const sizeClasses = {
  xs: {
    frame: "h-icon-sm w-icon-sm",
    dot: "h-1.5 w-1.5",
  },
  sm: {
    frame: "h-icon-md w-icon-md",
    dot: "h-2 w-2",
  },
} as const;

/** Canonical token-backed presence mark for avatar and compact identity surfaces. */
export function PresenceIndicator({
  status,
  label,
  size = "xs",
  decorative = false,
}: PresenceIndicatorProps) {
  return (
    <span
      data-ui-presence-indicator="true"
      data-presence-status={status}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      title={decorative ? undefined : label}
      className={`${sizeClasses[size].frame} inline-flex shrink-0 items-center justify-center rounded-pill border border-border-base bg-bg-surface shadow-sm`}
    >
      <span
        aria-hidden="true"
        className={`${sizeClasses[size].dot} rounded-pill ${statusClasses[status]}`}
      />
    </span>
  );
}
