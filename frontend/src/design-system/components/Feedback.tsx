import React from "react";
import { AlertCircle, CheckCircle, Inbox, Info } from "lucide-react";
import { cn, createVariants } from "../utils/variants";

export interface NoticeProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const noticeClasses = createVariants({
  base: "flex gap-3 rounded-control border p-4 text-xs sm:text-sm",
  variants: {
    variant: {
      info: "bg-info-surface border-info-border text-info",
      success: "bg-success-surface border-success-border text-success",
      warning: "bg-warning-surface border-warning-border text-warning",
      error: "bg-danger-surface border-danger-border text-danger",
    },
  },
  defaultVariants: { variant: "info" },
});

const noticeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
} as const;

export const Notice: React.FC<NoticeProps> = ({
  variant = "info",
  title,
  children,
  className,
}) => {
  const Icon = noticeIcons[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={noticeClasses({ variant, className })}
    >
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-icon-md w-icon-md shrink-0"
      />
      <div className="min-w-0 flex-1">
        {title && <h3 className="mb-0.5 font-bold text-text-main">{title}</h3>}
        <div className="leading-relaxed text-text-secondary">{children}</div>
      </div>
    </div>
  );
};

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Inbox aria-hidden="true" className="h-8 w-8 text-text-muted" />,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      "flex flex-col items-center justify-center rounded-card border border-border-base bg-bg-surface p-8 text-center shadow-xs sm:p-12",
      className,
    )}
  >
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-card border border-border-base bg-bg-base text-text-muted">
      {icon}
    </div>
    <h2 className="mb-1 text-base font-bold text-text-main">{title}</h2>
    <p className="mb-6 max-w-sm text-xs leading-relaxed text-text-muted sm:text-sm">
      {description}
    </p>
    {(action || secondaryAction) && (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {action}
        {secondaryAction}
      </div>
    )}
  </div>
);
