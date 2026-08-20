import React from 'react';
import { AlertCircle, CheckCircle, Inbox, Info } from 'lucide-react';
import { cn, createVariants } from '../utils/variants';

export interface NoticeProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const noticeClasses = createVariants({
  base: 'flex gap-3 rounded-xl border p-4 text-xs sm:text-sm',
  variants: {
    variant: {
      info: 'bg-info-surface border-info-border text-info',
      success: 'bg-success-surface border-success-border text-success',
      warning: 'bg-warning-surface border-warning-border text-warning',
      error: 'bg-danger-surface border-danger-border text-danger',
    },
  },
  defaultVariants: { variant: 'info' },
});

const noticeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
} as const;

export const Notice: React.FC<NoticeProps> = ({
  variant = 'info',
  title,
  children,
  className,
}) => {
  const Icon = noticeIcons[variant];
  return (
    <div className={noticeClasses({ variant, className })}>
      <Icon aria-hidden="true" className="mt-0.5 h-icon-md w-icon-md shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <h3 className="mb-0.5 font-bold text-stone-900">{title}</h3>}
        <div className="leading-relaxed text-stone-700">{children}</div>
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
  icon = <Inbox aria-hidden="true" className="h-8 w-8 text-stone-400" />,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl border border-border-base bg-bg-surface p-8 text-center shadow-xs sm:p-12',
      className,
    )}
  >
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-base bg-bg-base text-stone-500">
      {icon}
    </div>
    <h2 className="mb-1 text-base font-bold text-stone-900">{title}</h2>
    <p className="mb-6 max-w-sm text-xs leading-relaxed text-stone-500 sm:text-sm">{description}</p>
    {(action || secondaryAction) && (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {action}
        {secondaryAction}
      </div>
    )}
  </div>
);
