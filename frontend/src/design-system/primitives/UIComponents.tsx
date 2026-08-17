import React from 'react';
import { Star, AlertCircle, CheckCircle, Info, ChevronRight, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utilities/formatters';

// Price Display
export interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  isNegotiable?: boolean;
  isFreeDonation?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  isNegotiable = false,
  isFreeDonation = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-sm font-bold',
    md: 'text-base font-bold',
    lg: 'text-xl font-extrabold',
    xl: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
  };

  const hasDiscount = originalPrice && originalPrice > price;

  return (
    <div className={`flex flex-wrap items-baseline gap-1.5 ${className}`}>
      <span className={`${sizeClasses[size]} text-stone-900`}>
        {formatPrice(price, { isFreeDonation })}
      </span>
      {hasDiscount && (
        <span className="text-xs text-stone-500 line-through">
          {formatPrice(originalPrice)}
        </span>
      )}
      {isNegotiable && !isFreeDonation && (
        <span className="text-micro font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
          Négociable
        </span>
      )}
    </div>
  );
};

// Rating Display
export interface RatingDisplayProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  reviewCount,
  size = 'sm',
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-1 text-stone-800 ${className}`}>
      <Star className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill-amber-400 text-amber-400`} />
      <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-bold`}>{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-xs text-stone-500 font-normal">({reviewCount})</span>
      )}
    </div>
  );
};

// Tabs
export interface TabItem {
  id: string;
  label: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex border-b border-border-base overflow-x-auto no-scrollbar gap-1 sm:gap-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-colors duration-150 relative whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              isActive ? 'text-primary font-bold' : 'text-stone-600 hover:text-stone-950'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-micro font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-primary-light text-primary' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// Breadcrumbs
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Fil d'Ariane" className={`flex items-center text-xs text-stone-500 ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link to={item.href} className="hover:text-stone-900 transition-colors font-medium">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-stone-900 font-bold truncate max-w-[240px]' : 'font-medium'}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Notice
export interface NoticeProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Notice: React.FC<NoticeProps> = ({
  variant = 'info',
  title,
  children,
  className = '',
}) => {
  const styles = {
    info: 'bg-sky-50 border-sky-200 text-sky-950',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    warning: 'bg-amber-50 border-amber-200 text-amber-950',
    error: 'bg-red-50 border-red-200 text-red-950',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
    success: <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
  };

  return (
    <div className={`p-4 rounded-xl border text-xs sm:text-sm flex gap-3 ${styles[variant]} ${className}`}>
      {icons[variant]}
      <div className="flex-1 min-w-0">
        {title && <h3 className="font-bold mb-0.5 text-stone-900">{title}</h3>}
        <div className="leading-relaxed text-stone-700">{children}</div>
      </div>
    </div>
  );
};

// Empty State
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Inbox className="w-8 h-8 text-stone-400" />,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-bg-surface border border-border-base shadow-xs ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-bg-base flex items-center justify-center mb-4 border border-border-base text-stone-500">
        {icon}
      </div>
      <h2 className="text-base font-bold text-stone-900 mb-1">{title}</h2>
      <p className="text-xs sm:text-sm text-stone-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

// Skeleton
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-stone-200/80 rounded-xl ${className}`} />;
};
