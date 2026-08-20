import React from 'react';
import { cn } from '../utils/variants';

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
  variant?: 'underline' | 'segmented';
  label: string;
  idPrefix?: string;
  className?: string;
}

export const tabId = (idPrefix: string, id: string) => `${idPrefix}-tab-${id}`;
export const tabPanelId = (idPrefix: string, id: string) => `${idPrefix}-panel-${id}`;

/** One APG-compliant, horizontally resilient tab implementation. */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  label,
  idPrefix = 'tabs',
  className,
}) => {
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
      className={cn(
        'flex overflow-x-auto no-scrollbar',
        isSegmented
          ? 'gap-1.5 border-b border-border-base pb-2'
          : 'gap-1 border-b border-border-base sm:gap-2',
        className,
      )}
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
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap font-semibold transition-colors duration-fast',
              isSegmented
                ? cn(
                    'h-control-sm rounded-control px-3 text-xs sm:px-4',
                    isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-bg-subtle',
                  )
                : cn(
                    'relative px-2 pb-3 text-xs sm:px-3 sm:text-sm',
                    isActive
                      ? 'font-bold text-primary'
                      : 'text-stone-600 hover:text-stone-950',
                  ),
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-micro font-bold',
                  isActive
                    ? isSegmented
                      ? 'bg-white/15 text-white'
                      : 'bg-primary-light text-primary'
                    : 'bg-bg-muted text-stone-600',
                )}
              >
                {tab.count}
              </span>
            )}
            {!isSegmented && isActive && (
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tab: string;
  idPrefix?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tab,
  idPrefix = 'tabs',
  children,
  ...props
}) => (
  <div
    role="tabpanel"
    id={tabPanelId(idPrefix, tab)}
    aria-labelledby={tabId(idPrefix, tab)}
    {...props}
  >
    {children}
  </div>
);
