import type { HTMLAttributes } from "react";
import { cn } from "../utils/variants";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "article" | "section";
  tone?: "default" | "subtle" | "inverse";
  padding?: "none" | "sm" | "md" | "lg";
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
    inverse: "bg-text-main text-text-inverse border-stone-800",
  } as const;
  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4 sm:p-5",
    lg: "p-5 sm:p-6",
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
