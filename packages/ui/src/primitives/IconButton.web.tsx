import React from "react";
import { createVariants } from "../utils/variants";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
  CONTROL_PRESS_CLASS,
  CONTROL_RADIUS_CLASS,
} from "../utils/controlMetrics";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  ariaLabel: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  variant = "ghost",
  size = "md",
  ariaLabel,
  className = "",
  ...props
}) => {
  const display = DISPLAY_SET_BY_CALLER.test(className) ? "" : "inline-flex";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`${display} ${iconButtonClasses({ size, variant, className })}`}
      {...props}
    >
      {children}
    </button>
  );
};

const DISPLAY_SET_BY_CALLER =
  /(?:^|\s)(?:hidden|block|inline|inline-block|flex|inline-flex|grid|inline-grid|contents)(?:\s|$)/;

const iconButtonClasses = createVariants({
  base: `${CONTROL_MOTION_CLASS} ${CONTROL_PRESS_CLASS} items-center justify-center ${CONTROL_RADIUS_CLASS} cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${CONTROL_FOCUS_CLASS}`,
  variants: {
    size: {
      sm: "w-control-sm h-control-sm p-1.5 text-xs",
      md: "w-control-md h-control-md p-2 text-sm",
    },
    variant: {
      primary:
        "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active shadow-xs",
      secondary:
        "bg-bg-subtle text-text-main hover:bg-bg-muted active:bg-surface-selected",
      outline:
        "border border-border-base bg-bg-surface text-text-emphasis hover:text-text-deep hover:bg-bg-base hover:border-border-hover",
      ghost:
        "bg-transparent text-text-supporting hover:text-text-deep hover:bg-bg-subtle active:bg-bg-muted",
      danger:
        "bg-danger-surface text-danger hover:bg-danger-surface hover:text-danger",
    },
  },
  defaultVariants: { size: "md", variant: "ghost" },
});
