import type { ReactNode } from "react";
import { cn } from "../utils/variants";

export interface PageHeaderProps {
  title: ReactNode;
  /** Small uppercase label above the title — a section or product name. */
  eyebrow?: ReactNode;
  /** One line of supporting copy below the title. */
  subtitle?: ReactNode;
  /** Buttons or links aligned opposite the title, wrapping below it when narrow. */
  actions?: ReactNode;
  /**
   * Heading level. Defaults to `h1`; use `h2` for a section inside a page that
   * already has one, so the outline stays contiguous.
   */
  as?: "h1" | "h2" | "h3";
  /** `page` for a route's own title, `section` for a block within it. */
  size?: "page" | "section";
  className?: string;
  id?: string;
}

/**
 * The single page- and section-title treatment.
 *
 * Before this existed the product carried 135 `<h1>`s across 112 files in ~30
 * distinct class strings, and 396 `<h2>`s in 66 — divergence with no semantic
 * reason behind it, and the main reason pages read as separately designed. The
 * variants here cover what those strings were actually reaching for.
 *
 * Headings own no vertical margin: callers place them with `gap` from the
 * surrounding flex or grid, so spacing stays with the layout that owns it.
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  as: Heading = "h1",
  size = "page",
  className,
  id,
}: PageHeaderProps) {
  const titleClasses = {
    page: "text-2xl font-bold tracking-tight text-text-main sm:text-3xl",
    section: "text-lg font-bold tracking-tight text-text-main sm:text-xl",
  } as const;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {eyebrow}
          </p>
        ) : null}
        <Heading id={id} className={titleClasses[size]}>
          {title}
        </Heading>
        {subtitle ? (
          <p className="max-w-prose text-sm text-text-secondary sm:text-base">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
