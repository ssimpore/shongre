import type { HTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../utils/variants";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function Spinner({
  label = "Chargement",
  size = "md",
  className,
  ...props
}: SpinnerProps) {
  const sizes = {
    sm: "h-icon-sm w-icon-sm",
    md: "h-icon-md w-icon-md",
    lg: "h-icon-lg w-icon-lg",
  } as const;
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex text-primary", className)}
      {...props}
    >
      <Loader2 className={cn(sizes[size], "animate-spin")} aria-hidden="true" />
    </span>
  );
}
