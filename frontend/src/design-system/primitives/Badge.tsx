import React from 'react';
import { CheckCircle2, ShieldCheck, Sparkles, Zap, Tag } from 'lucide-react';
import { Image } from './Image';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'primary' | 'pro' | 'verified' | 'urgent' | 'deal' | 'warning' | 'success';
  size?: 'sm' | 'md';
  icon?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  icon = false,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-micro px-2 py-0.5 gap-1 font-semibold',
    md: 'text-xs font-bold px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    neutral: 'bg-stone-100 text-stone-700 border border-stone-200',
    primary: 'bg-primary-light text-primary border border-primary-border font-bold',
    pro: 'bg-stone-900 text-white font-bold tracking-wide uppercase text-micro',
    verified: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold',
    urgent: 'bg-red-50 text-red-800 border border-red-200 font-bold',
    deal: 'bg-amber-50 text-amber-900 border border-amber-200 font-bold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md whitespace-nowrap leading-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && variant === 'verified' && <ShieldCheck className="w-3 h-3 text-emerald-700" />}
      {icon && variant === 'pro' && <Sparkles className="w-3 h-3 text-amber-400" />}
      {icon && variant === 'urgent' && <Zap className="w-3 h-3 text-red-600" />}
      {icon && variant === 'deal' && <Tag className="w-3 h-3 text-amber-600" />}
      {children}
    </span>
  );
};

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVerified?: boolean;
  isPro?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isVerified = false,
  isPro = false,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className={`relative inline-block select-none shrink-0 ${className}`}>
      <div
        className={`${sizeStyles[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold bg-bg-subtle text-stone-700 border border-border-base`}
      >
        {src ? (
          <Image src={src} alt={name} className="w-full h-full object-cover" fallbackIconClassName="w-4 h-4" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {isVerified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm text-success"
          title="Profil vérifié"
        >
          <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
        </span>
      )}
    </div>
  );
};
