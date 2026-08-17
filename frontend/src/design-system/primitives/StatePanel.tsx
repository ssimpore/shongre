import React from 'react';
import { AlertTriangle, SearchX, Lock, ServerCrash } from 'lucide-react';

export type StatePanelVariant = 'error' | 'notFound' | 'restricted' | 'offline';

export interface StatePanelProps {
  variant?: StatePanelVariant;
  /** What happened, in the user's terms. */
  title: string;
  /** Why it happened and what it means for them. */
  description: string;
  /** The way forward — retry, or navigate somewhere useful. Always provide one. */
  action?: React.ReactNode;
  /** An alternative route out (e.g. "Retour à l'accueil"). */
  secondaryAction?: React.ReactNode;
  /**
   * Raw technical detail. Rendered in a de-emphasised block and only when the
   * caller explicitly opts in — never surface stack traces or provider errors to
   * end users by default.
   */
  technicalDetail?: string;
  className?: string;
}

const VARIANT_META: Record<
  StatePanelVariant,
  { Icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  error: { Icon: AlertTriangle, tone: 'bg-danger-surface text-danger border-danger-border' },
  notFound: { Icon: SearchX, tone: 'bg-bg-subtle text-stone-600 border-border-base' },
  restricted: { Icon: Lock, tone: 'bg-warning-surface text-warning border-warning-border' },
  offline: { Icon: ServerCrash, tone: 'bg-info-surface text-info border-info-border' },
};

/**
 * Whole-view state for a page that cannot show its normal content: the resource
 * is missing, the request failed, or the user lacks access.
 *
 * Distinct from `EmptyState`, which is for a collection that is legitimately
 * empty. Every state rendered here carries a way forward — pages previously
 * hand-rolled "Boutique introuvable" / "Contact introuvable" dead ends with
 * different markup and no next step.
 */
export const StatePanel: React.FC<StatePanelProps> = ({
  variant = 'error',
  title,
  description,
  action,
  secondaryAction,
  technicalDetail,
  className = '',
}) => {
  const { Icon, tone } = VARIANT_META[variant];

  return (
    <div
      role={variant === 'error' || variant === 'offline' ? 'alert' : undefined}
      className={`flex flex-col items-center justify-center text-center px-6 py-12 sm:py-16 rounded-2xl bg-bg-surface border border-border-base shadow-xs ${className}`}
    >
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${tone}`}>
        <Icon className="w-6 h-6" />
      </div>

      <h2 className="text-base sm:text-lg font-bold text-stone-900">{title}</h2>
      <p className="text-xs sm:text-sm text-stone-600 max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
          {action}
          {secondaryAction}
        </div>
      )}

      {technicalDetail && (
        <details className="mt-6 w-full max-w-md text-left">
          <summary className="text-micro font-semibold text-stone-500 cursor-pointer hover:text-stone-700">
            Détails techniques
          </summary>
          <p className="mt-2 p-3 rounded-xl bg-bg-subtle border border-border-base text-micro font-mono text-stone-600 break-words">
            {technicalDetail}
          </p>
        </details>
      )}
    </div>
  );
};
