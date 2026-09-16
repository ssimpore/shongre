import type { HTMLAttributes } from "react";
import { cn } from "../utils/variants";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "article" | "section";
  tone?: "default" | "subtle" | "inverse";
  /**
   * `sm`/`md`/`lg` step up at the `sm` breakpoint; `flat-*` hold one value at
   * every width.
   *
   * Both families exist because the hand-rolled shells this primitive replaces
   * are overwhelmingly flat — 144 sites on `p-5` and 84 on `p-4` against two
   * using the responsive `p-4 sm:p-5` that `md` emits. Migrating those onto a
   * responsive step would quietly change their mobile padding, which is what
   * stalled an earlier consolidation attempt.
   */
  padding?:
    | "none"
    | "sm"
    | "md"
    | "lg"
    | "flat-sm"
    | "flat-md"
    | "flat-lg"
    | "flat-xl";
  elevation?: "none" | "xs" | "sm" | "md";
}

export function Card({
  as: Component = "div",
  tone = "default",
  padding = "md",
  elevation = "none",
  className,
  ...props
}: CardProps) {
  const tones = {
    default: "bg-bg-surface text-text-main border-border-base",
    subtle: "bg-bg-subtle text-text-main border-border-base",
    inverse: "bg-surface-inverse text-text-inverse border-border-inverse",
  } as const;
  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4 sm:p-5",
    lg: "p-5 sm:p-6",
    "flat-sm": "p-3",
    "flat-md": "p-4",
    "flat-lg": "p-5",
    "flat-xl": "p-6",
  } as const;
  const elevations = {
    none: "shadow-none",
    xs: "shadow-xs",
    sm: "shadow-sm",
    md: "shadow-md",
  } as const;
  return (
    <Component
      className={cn(
        "min-w-0 rounded-card border",
        tones[tone],
        paddings[padding],
        elevations[elevation],
        className,
      )}
      {...props}
    />
  );
}
