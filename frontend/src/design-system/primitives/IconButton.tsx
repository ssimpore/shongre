import React from 'react';
import { createVariants } from '../utils/variants';
import { CONTROL_RADIUS_CLASS } from '../utils/controlMetrics';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  variant = 'ghost',
  size = 'md',
  ariaLabel,
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={iconButtonClasses({ size, variant, className })}
      {...props}
    >
      {children}
    </button>
  );
};

const iconButtonClasses = createVariants({
  base: `inline-flex items-center justify-center ${CONTROL_RADIUS_CLASS} transition-colors duration-fast cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-95`,
  variants: {
    size: {
      sm: 'w-control-sm h-control-sm p-1.5 text-xs',
      md: 'w-control-md h-control-md p-2 text-sm',
      lg: 'w-control-lg h-control-lg p-3 text-base',
    },
    variant: {
      primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-xs',
      secondary: 'bg-bg-subtle text-stone-900 hover:bg-bg-muted active:bg-stone-300',
      outline:
        'border border-border-base bg-bg-surface text-stone-700 hover:text-stone-950 hover:bg-bg-base hover:border-border-hover',
      ghost:
        'bg-transparent text-stone-600 hover:text-stone-950 hover:bg-bg-subtle active:bg-bg-muted',
      danger: 'bg-danger-surface text-danger hover:bg-danger-surface hover:text-danger',
    },
  },
  defaultVariants: { size: 'md', variant: 'ghost' },
});
