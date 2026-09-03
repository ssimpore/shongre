import React from "react";
import { createVariants } from "../utils/variants";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
  CONTROL_RADIUS_CLASS,
} from "../utils/controlMetrics";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
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
  base: `${CONTROL_MOTION_CLASS} items-center justify-center ${CONTROL_RADIUS_CLASS} cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${CONTROL_FOCUS_CLASS} active:translate-y-0 active:scale-press-icon`,
  variants: {
    size: {
      sm: "w-control-sm h-control-sm p-1.5 text-xs",
      md: "w-control-md h-control-md p-2 text-sm",
      lg: "w-control-lg h-control-lg p-3 text-base",
    },
    variant: {
      primary:
        "bg-primary text-white hover:-translate-y-0.5 hover:bg-primary-hover active:bg-primary-active shadow-xs hover:shadow-sm",
      secondary:
        "bg-bg-subtle text-text-main hover:bg-bg-muted active:bg-stone-300",
      outline:
        "border border-border-base bg-bg-surface text-stone-700 hover:text-stone-950 hover:bg-bg-base hover:border-border-hover",
      ghost:
        "bg-transparent text-stone-600 hover:text-stone-950 hover:bg-bg-subtle active:bg-bg-muted",
      danger:
        "bg-danger-surface text-danger hover:bg-danger-surface hover:text-danger",
    },
  },
  defaultVariants: { size: "md", variant: "ghost" },
});
