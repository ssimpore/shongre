import React from "react";

export const PROGRESS_BAR_SCALE = {
  min: 0,
  max: 100,
} as const;

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  variant?: "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}

/**
 * Accessible, token-backed progress indicator.
 *
 * Native progress semantics avoid per-screen width styles while keeping the
 * current value available to assistive technology.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = PROGRESS_BAR_SCALE.max,
  label,
  variant = "primary",
  className = "",
}) => {
  const normalizedValue = Math.max(
    PROGRESS_BAR_SCALE.min,
    Math.min(value, max),
  );
  return (
    <progress
      role="progressbar"
      value={normalizedValue}
      max={max}
      aria-label={label}
      aria-valuemin={PROGRESS_BAR_SCALE.min}
      aria-valuemax={max}
      aria-valuenow={normalizedValue}
      className={`progress-bar progress-bar-${variant} ${className}`}
    />
  );
};
