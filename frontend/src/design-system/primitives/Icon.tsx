import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../utils/variants";

export interface IconProps {
  icon: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg" | "nav" | "xl";
  weight?: "light" | "regular" | "strong";
  label?: string;
  className?: string;
}

const sizes = {
  xs: "h-icon-xs w-icon-xs",
  sm: "h-icon-sm w-icon-sm",
  md: "h-icon-md w-icon-md",
  lg: "h-icon-lg w-icon-lg",
  nav: "h-icon-nav w-icon-nav",
  xl: "h-icon-xl w-icon-xl",
} as const;

const strokeWidths = { light: 1.5, regular: 2, strong: 2.5 } as const;

/** Consistent optical sizing and accessibility for the product's Lucide set. */
export const Icon: React.FC<IconProps> = ({
  icon: Glyph,
  size = "md",
  weight = "regular",
  label,
  className,
}) => (
  <Glyph
    className={cn("shrink-0", sizes[size], className)}
    strokeWidth={strokeWidths[weight]}
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? "img" : undefined}
  />
);
