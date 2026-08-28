import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, Lock, SearchX, ServerCrash } from "lucide-react";
import { cn } from "../utils/variants";

export type StatePanelVariant = "error" | "notFound" | "restricted" | "offline";

export interface StatePanelProps {
  variant?: StatePanelVariant;
  /** What happened, in the user's terms. */
  title: string;
  /** Why it happened and what it means for them. */
  description: string;
  /** The way forward — retry, or navigate somewhere useful. */
  action?: ReactNode;
  /** An alternative route out, such as a link back to the catalogue. */
  secondaryAction?: ReactNode;
  /**
   * Raw technical detail, exposed only when a caller explicitly opts in.
   * Provider errors and stack traces must never be passed here for end users.
   */
  technicalDetail?: string;
  /** Localized label for the optional technical-detail disclosure. */
  technicalDetailLabel?: string;
  /** Use level 1 when the panel replaces an entire routed page. */
  headingLevel?: 1 | 2 | 3;
  className?: string;
}

const VARIANT_META: Record<
  StatePanelVariant,
  {
    Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    tone: string;
  }
> = {
  error: {
    Icon: AlertTriangle,
    tone: "bg-danger-surface text-danger border-danger-border",
  },
  notFound: {
    Icon: SearchX,
    tone: "bg-bg-subtle text-text-secondary border-border-base",
  },
  restricted: {
    Icon: Lock,
    tone: "bg-warning-surface text-warning border-warning-border",
  },
  offline: {
    Icon: ServerCrash,
    tone: "bg-info-surface text-info border-info-border",
  },
};

/**
 * Canonical whole-view feedback for content that cannot render normally.
 * Collection-level empty results remain the responsibility of `EmptyState`.
 */
export function StatePanel({
  variant = "error",
  title,
  description,
  action,
  secondaryAction,
  technicalDetail,
  technicalDetailLabel = "Technical details",
  headingLevel = 2,
  className,
}: StatePanelProps) {
  const { Icon, tone } = VARIANT_META[variant];
  const Title = headingLevel === 1 ? "h1" : headingLevel === 3 ? "h3" : "h2";

  return (
    <div
      role={variant === "error" || variant === "offline" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-border-base bg-bg-surface px-6 py-12 text-center shadow-xs sm:py-16",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-14 w-14 items-center justify-center rounded-card border",
          tone,
        )}
      >
        <Icon className="h-6 w-6" aria-hidden={true} />
      </div>

      <Title className="text-base font-bold text-text-main sm:text-lg">
        {title}
      </Title>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-text-secondary sm:text-sm">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {action}
          {secondaryAction}
        </div>
      )}

      {technicalDetail && (
        <details className="mt-6 w-full max-w-md text-left">
          <summary className="cursor-pointer text-micro font-semibold text-text-muted hover:text-text-secondary">
            {technicalDetailLabel}
          </summary>
          <p className="mt-2 break-words rounded-control border border-border-base bg-bg-subtle p-3 font-mono text-micro text-text-secondary">
            {technicalDetail}
          </p>
        </details>
      )}
    </div>
  );
}
