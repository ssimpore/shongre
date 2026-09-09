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
 * shape all of them use: a titled section separated by a rule, facts as a
 * two-column list of icon, label and value, and capabilities as named
 * amenities. Nothing here knows which vertical it is rendering.
 */

export interface DetailSectionProps {
  title: string;
  /** Rendered under the title, before the content. */
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Omit the leading rule when the section opens a column. */
  divider?: boolean;
  className?: string;
  id?: string;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  subtitle,
  children,
  divider = true,
  className = "",
  id,
}) => (
  <section
    id={id}
    data-detail-section="true"
    className={`${divider ? "border-t border-border-base pt-7" : ""} ${className}`}
  >
    <h2 className="text-xl font-bold tracking-tight text-text-main sm:text-2xl">
      {title}
    </h2>
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
          className="flex min-w-0 items-center gap-3"
        >
          <FactIcon name={fact.icon} />
          {/*
           * The value sits beside its label at a repeating offset rather than
           * against the far edge of the column: pushed apart, a long label and a
           * short value stop reading as one pair and the eye has to travel back
           * across whitespace for every row. Below `sm` there is not enough
           * width for two columns of text, so the pair stacks instead.
           */}
          <div className="flex min-w-0 flex-1 flex-col gap-y-0.5 sm:flex-row sm:items-baseline sm:gap-x-4">
            <dt className="text-sm text-text-supporting sm:w-40 sm:shrink-0">
              {fact.label}
            </dt>
            <dd className="min-w-0 break-words text-sm font-bold text-text-main">
              {fact.href ? (
                <Link to={fact.href} className="underline underline-offset-4">
                  {fact.value}
                </Link>
              ) : (
                fact.value
              )}
            </dd>
          </div>
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
