import React from "react";
import { Link } from "react-router-dom";
import { SemanticIcon } from "@shongre/ui/web";
import type { IconName } from "@shongre/ui/web";

/**
 * The reading rhythm of a listing detail page.
 *
 * Every category previously described itself in its own markup — a four-column
 * cell grid on vehicles, bordered cards on generic listings, something else
 * again on property and jobs — so the same fact looked like a different kind of
 * thing depending on where a visitor arrived. These primitives are the one
 * shape all of them use: a titled, bounded card surface, facts as a two-column
 * list of icon, label and value, and capabilities as named amenities. Nothing
 * here knows which vertical it is rendering.
 */

export interface DetailSectionProps {
  title: string;
  /** Rendered under the title, before the content. */
  subtitle?: React.ReactNode;
  /**
   * A single trailing control on the heading row — "see everything in this
   * category", "more from this seller". It sits beside the title rather than
   * under the content because it is an alternative to reading the section, not
   * a conclusion to it.
   */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  id,
}) => (
  <section
    id={id}
    data-detail-section="true"
    data-detail-section-surface="card"
    className={`min-w-0 rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6 ${className}`}
  >
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2 className="text-xl font-bold tracking-tight text-text-main sm:text-2xl">
        {title}
      </h2>
      {action}
    </div>
    {subtitle ? <div className="mt-2">{subtitle}</div> : null}
    <div className="mt-5">{children}</div>
  </section>
);

/**
 * The circular tint behind a fact's icon. It is what makes a long list of facts
 * scannable rather than a wall of text, and it is deliberately the same size
 * and tone for every category.
 */
const FactIcon: React.FC<{ name: IconName }> = ({ name }) => (
  <span
    aria-hidden="true"
    data-fact-icon={name}
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-bg-subtle text-text-emphasis"
  >
    <SemanticIcon name={name} size="sm" />
  </span>
);

export interface DetailFact {
  code: string;
  label: string;
  value: string;
  icon: IconName;
  /** When present the value becomes a link, as a browsable facet would. */
  href?: string;
}

export interface DetailFactListProps {
  facts: readonly DetailFact[];
  className?: string;
  "data-testid"?: string;
}

export const DetailFactList: React.FC<DetailFactListProps> = ({
  facts,
  className = "",
  ...rest
}) => {
  if (!facts.length) return null;
  return (
    <dl
      data-detail-fact-list="true"
      data-testid={rest["data-testid"]}
      className={`grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 ${className}`}
    >
      {facts.map((fact) => (
        <div
          key={`${fact.code}-${fact.label}`}
          data-detail-fact={fact.code}
          className="grid min-w-0 grid-cols-1 items-center gap-y-0.5 sm:grid-cols-2 sm:gap-x-4"
        >
          {/*
           * The value sits beside its label at a repeating offset rather than
           * against the far edge of the column: pushed apart, a long label and a
           * short value stop reading as one pair and the eye has to travel back
           * across whitespace for every row. Below `sm` there is not enough
           * width for two columns of text, so the pair stacks instead.
           *
           * The icon belongs inside `dt`: a definition list group may contain
           * only `dt` and `dd` children. Keeping the decorative icon as their
           * sibling produced malformed list semantics in every detail template.
           */}
          <dt className="flex min-w-0 items-center gap-3 text-sm text-text-supporting">
            <FactIcon name={fact.icon} />
            <span className="min-w-0 break-words">{fact.label}</span>
          </dt>
          <dd className="min-w-0 break-words pl-12 text-sm font-bold text-text-main sm:pl-0">
            {fact.href ? (
              <Link to={fact.href} className="underline underline-offset-4">
                {fact.value}
              </Link>
            ) : (
              fact.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export interface DetailFeatureListProps {
  features: readonly { code: string; label: string; icon: IconName }[];
  className?: string;
}

/**
 * Capabilities the listing has. Three across, because these are names rather
 * than name/value pairs and read as a set — the visitor is scanning for whether
 * something is present, not comparing values.
 */
export const DetailFeatureList: React.FC<DetailFeatureListProps> = ({
  features,
  className = "",
}) => {
  if (!features.length) return null;
  return (
    <ul
      data-detail-feature-list="true"
      className={`grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {features.map((feature) => (
        <li
          key={feature.code}
          data-detail-feature={feature.code}
          className="flex min-w-0 items-center gap-3"
        >
          <FactIcon name={feature.icon} />
          <span className="min-w-0 break-words text-sm font-bold text-text-main">
            {feature.label}
          </span>
        </li>
      ))}
    </ul>
  );
};

export interface DetailDisclosureProps {
  label: string;
  expandedLabel: string;
  expanded: boolean;
  onToggle: () => void;
  controls: string;
}

/**
 * The "see everything" affordance. A button rather than a link because it
 * reveals content already on the page, and it names what it will show so a
 * screen-reader user knows the size of what is behind it.
 */
export const DetailDisclosure: React.FC<DetailDisclosureProps> = ({
  label,
  expandedLabel,
  expanded,
  onToggle,
  controls,
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={expanded}
    aria-controls={controls}
    data-detail-disclosure="true"
    className="mt-6 inline-flex min-h-control-target items-center font-bold text-text-main underline underline-offset-4 hover:text-primary"
  >
    {expanded ? expandedLabel : label}
  </button>
);
