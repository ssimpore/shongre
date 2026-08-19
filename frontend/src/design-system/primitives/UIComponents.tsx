import React from 'react';
import { Star, AlertCircle, CheckCircle, Info, ChevronRight, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utilities/formatters';
import { useTranslation } from '../../i18n/I18nProvider';

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
  const { t } = useTranslation();
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
        <span className="text-micro font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">{t('ui.uIComponents.negociable')}</span>
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
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  /**
   * `underline` is the reading-surface tab (seller profile, transactions).
   * `segmented` is the dense operational tab used across Admin.
   */
  variant?: 'underline' | 'segmented';
  /** Accessible name for the tab list, e.g. "Sections du profil". */
  label: string;
  /**
   * Namespaces the generated tab/panel ids so two tab sets on one page cannot
   * collide. Pair with `<TabPanel idPrefix>` to wire `aria-controls`.
   */
  idPrefix?: string;
  className?: string;
}

export const tabId = (idPrefix: string, id: string) => `${idPrefix}-tab-${id}`;
export const tabPanelId = (idPrefix: string, id: string) => `${idPrefix}-panel-${id}`;

/**
 * One tab implementation for the whole product.
 *
 * Hand-rolled strips were the single biggest source of horizontal page overflow
 * (the Admin verification strip pushed the document 167px past a 320px
 * viewport). The rail scrolls inside its own box instead of widening the page,
 * follows the APG tabs pattern for keyboard users, and keeps the active tab in
 * view when selection moves.
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  label,
  idPrefix = 'tabs',
  className = '',
}) => {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Keep the selected tab visible when selection moves by keyboard, and when a
  // deep link lands on a tab that starts scrolled off the rail.
  React.useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = tabs[nextIndex];
    onChange(next.id);
    listRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(tabId(idPrefix, next.id))}`)
      ?.focus();
  };

  const isSegmented = variant === 'segmented';

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className={`flex overflow-x-auto no-scrollbar ${
        isSegmented ? 'gap-1.5 pb-2 border-b border-border-base' : 'gap-1 sm:gap-2 border-b border-border-base'
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            id={tabId(idPrefix, tab.id)}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={tabPanelId(idPrefix, tab.id)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={`shrink-0 whitespace-nowrap flex items-center gap-2 font-semibold cursor-pointer transition-colors duration-fast ${
              isSegmented
                ? `px-3 sm:px-4 h-control-sm rounded-xl text-xs ${
                    isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-bg-subtle'
                  }`
                : `relative pb-3 px-2 sm:px-3 text-xs sm:text-sm ${
                    isActive ? 'text-primary font-bold' : 'text-stone-600 hover:text-stone-950'
                  }`
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-micro font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? isSegmented
                      ? 'bg-white/15 text-white'
                      : 'bg-primary-light text-primary'
                    : 'bg-bg-muted text-stone-600'
                }`}
              >
                {tab.count}
              </span>
            )}
            {!isSegmented && isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

/** Content region owned by a `Tabs` tab. Wires the `aria-controls` pairing. */
export const TabPanel: React.FC<{
  tab: string;
  idPrefix?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ tab, idPrefix = 'tabs', children, className = '' }) => (
  <div
    role="tabpanel"
    id={tabPanelId(idPrefix, tab)}
    aria-labelledby={tabId(idPrefix, tab)}
    className={className}
  >
    {children}
  </div>
);

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
    info: 'bg-info-surface border-info-border text-info',
    success: 'bg-success-surface border-success-border text-success',
    warning: 'bg-warning-surface border-warning-border text-warning',
    error: 'bg-danger-surface border-danger-border text-danger',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />,
    success: <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />,
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
  /**
   * Required, not optional.
   *
   * An empty collection is a moment where the user has nothing to act on, which
   * makes it the moment they most need a next step. Empty states were previously
   * hand-written per screen — 30+ distinct "Aucun…" strings — and many ended in
   * a full stop with nowhere to go. Typing this as required means the compiler
   * asks the question at every call site.
   *
   * Pass `null` deliberately when the surrounding UI already carries the action
   * (e.g. a toolbar "Créer" button sitting directly above the panel).
   */
  action: React.ReactNode;
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
