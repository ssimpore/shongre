import React from 'react';
import { CheckCircle2, ShieldCheck, Sparkles, Zap, Tag } from 'lucide-react';
import { Image } from './Image';

export interface BadgeProps {
  children: React.ReactNode;
  /**
   * `featured` is the boosted-listing ("Vedette") badge. It is a variant rather
   * than per-screen markup because the same listing state was previously drawn
   * three different ways: terracotta on the listing cards, `bg-amber-500` in the
   * home rail — white on amber is 2.13:1, well under AA — and the `urgent`
   * (danger red) variant in the seller's table, which labelled a paid promotion
   * as a problem. One variant means one colour for one meaning.
   */
  variant?:
    | 'neutral'
    | 'primary'
    | 'pro'
    | 'verified'
    | 'urgent'
    | 'deal'
    | 'warning'
    | 'success'
    | 'featured';
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
    verified: 'bg-success-surface text-success border border-success-border font-semibold',
    urgent: 'bg-danger-surface text-danger border border-danger-border font-bold',
    deal: 'bg-warning-surface text-warning border border-warning-border font-bold',
    warning: 'bg-warning-surface text-warning border border-warning-border font-semibold',
    success: 'bg-success-surface text-success border border-success-border font-semibold',
    // Solid rather than tinted: this badge sits over listing photography, where
    // a tinted surface has no reliable backdrop to read against. White on
    // `--color-primary` is 5.04:1.
    featured: 'bg-primary text-white font-bold uppercase tracking-wider shadow-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md whitespace-nowrap leading-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && variant === 'verified' && <ShieldCheck className="w-3 h-3 text-success" />}
      {icon && variant === 'pro' && <Sparkles className="w-3 h-3 text-amber-400" />}
      {icon && variant === 'urgent' && <Zap className="w-3 h-3 text-danger" />}
      {icon && variant === 'deal' && <Tag className="w-3 h-3 text-warning" />}
      {icon && variant === 'featured' && <Sparkles className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
};

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
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
    // Profile-header size. It exists so the header can ask for a big avatar by
    // name instead of overriding `w-*`/`h-*` on the wrapper from the call site —
    // that resized the wrapper but not the circle inside it, leaving a white
    // square peeking out from behind a round avatar.
    '2xl': 'w-24 h-24 sm:w-32 sm:h-32 text-2xl',
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
    <div className={`relative inline-block rounded-full select-none shrink-0 ${className}`}>
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
          <CheckCircle2 className="w-3.5 h-3.5 fill-success text-white" />
        </span>
      )}
    </div>
  );
};
