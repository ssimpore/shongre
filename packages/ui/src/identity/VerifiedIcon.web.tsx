import { iconStrokeWidths } from "@shongre/design-tokens";
import { BadgeCheck } from "lucide-react";
import type {
  VerifiedIconProps,
  VerifiedIconSize,
} from "./identity-status.types";

const sizeClasses: Record<VerifiedIconSize, string> = {
  xs: "h-icon-xs w-icon-xs",
  sm: "h-icon-sm w-icon-sm",
  md: "h-icon-md w-icon-md",
  lg: "h-icon-lg w-icon-lg",
};

/** The only verification mark. It is labelled when standalone and decorative beside text. */
export function VerifiedIcon({ size = "sm", label }: VerifiedIconProps) {
  return (
    <span
      data-ui-verified-icon="true"
      className={`inline-flex shrink-0 text-white ${sizeClasses[size]}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
    >
      <BadgeCheck
        className="h-full w-full fill-success"
        strokeWidth={iconStrokeWidths.regular}
        aria-hidden="true"
      />
    </span>
  );
}
