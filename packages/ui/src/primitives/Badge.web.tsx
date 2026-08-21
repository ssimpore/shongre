import type { HTMLAttributes, ReactNode } from "react";
import { createVariants } from "../utils/variants";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "pro"
  | "verified"
  | "urgent"
  | "deal"
  | "warning"
  | "success"
  | "featured";

export interface BadgeProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: ReactNode;
}

const badgeClasses = createVariants({
  base: "inline-flex items-center rounded-md whitespace-nowrap leading-none",
  variants: {
    size: {
      sm: "text-micro px-2 py-0.5 gap-1 font-semibold",
      md: "text-xs font-bold px-2.5 py-1 gap-1.5",
    },
    variant: {
      neutral: "bg-stone-100 text-stone-700 border border-stone-200",
      primary:
        "bg-primary-light text-primary border border-primary-border font-bold",
      pro: "bg-stone-900 text-white font-bold tracking-wide uppercase text-micro",
      verified:
        "bg-success-surface text-success border border-success-border font-semibold",
      urgent:
        "bg-danger-surface text-danger border border-danger-border font-bold",
      deal: "bg-warning-surface text-warning border border-warning-border font-bold",
      warning:
        "bg-warning-surface text-warning border border-warning-border font-semibold",
      success:
        "bg-success-surface text-success border border-success-border font-semibold",
      featured:
        "bg-primary text-white font-bold uppercase tracking-wider shadow-sm",
    },
  },
  defaultVariants: { size: "sm", variant: "neutral" },
});

export function Badge({
  children,
  variant = "neutral",
  size = "sm",
  icon,
  className,
  ...props
}: BadgeProps) {
  return (
    <span className={badgeClasses({ size, variant, className })} {...props}>
      {icon}
      {children}
    </span>
  );
}
