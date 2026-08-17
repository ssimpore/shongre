import React from 'react';

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
  const sizeStyles = {
    sm: 'w-8 h-8 p-1.5 text-xs',
    md: 'w-10 h-10 p-2 text-sm',
    lg: 'w-12 h-12 p-3 text-base',
  };

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-xs',
    secondary: 'bg-bg-subtle text-stone-900 hover:bg-bg-muted active:bg-stone-300',
    outline: 'border border-border-base bg-bg-surface text-stone-700 hover:text-stone-950 hover:bg-bg-base hover:border-border-hover',
    ghost: 'bg-transparent text-stone-600 hover:text-stone-950 hover:bg-bg-subtle active:bg-bg-muted',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700',
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex items-center justify-center rounded-xl transition-colors duration-150 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
