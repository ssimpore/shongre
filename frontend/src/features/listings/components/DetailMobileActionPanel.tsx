import type { ReactNode } from "react";

interface DetailMobileActionPanelProps {
  eyebrow: string;
  summary?: ReactNode;
  children: ReactNode;
}

/**
 * Keeps a vertical detail page's primary task near the title on small screens.
 * Desktop continues to use its contextual aside; mobile readers no longer have
 * to cross the complete description and discovery rails before they can act.
 */
export function DetailMobileActionPanel({
  eyebrow,
  summary,
  children,
}: DetailMobileActionPanelProps) {
  return (
    <section
      data-testid="detail-mobile-primary-action"
      aria-label={eyebrow}
      className="mb-5 rounded-card border border-border-base bg-bg-surface p-4 shadow-sm lg:hidden"
    >
      <div className="mb-3 flex min-w-0 items-baseline justify-between gap-3">
        <p className="text-xs font-bold text-text-main">{eyebrow}</p>
        {summary ? (
          <p className="min-w-0 truncate text-sm font-bold text-text-main">
            {summary}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}
