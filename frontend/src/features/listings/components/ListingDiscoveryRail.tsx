import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { DetailSection } from "../../../design-system/primitives/DetailFacts";
import { ListingRail } from "../../../design-system/primitives/ListingRail";

export interface ListingDiscoveryRailProps {
  /** The section heading — "Les annonces de ce vendeur", "Annonces similaires". */
  title: string;
  /** One line under the heading saying how the set was chosen. */
  subtitle?: string;
  /** Where "see more" goes. Omitted when there is nothing more to see. */
  moreHref?: string;
  moreLabel?: string;
  /** Names the rail's scroll controls; defaults to the heading. */
  railLabel?: string;
  /** Identifies the rail in tests and analytics. */
  kind: string;
  /** `ListingCard`s, or any card the vertical uses. */
  children: React.ReactNode;
  className?: string;
}

/**
 * A row of other listings worth looking at, under a heading that says why.
 *
 * Four verticals each grew their own version of this: the generic page built a
 * flex header with a chevron link by hand, vehicles wrapped a bare `ListingRail`
 * in a bordered box, jobs did something else, and property had none at all — so
 * the two questions every detail page has to answer, *what else does this seller
 * have* and *what else is like this*, were answered in a different shape
 * depending on where the visitor landed, and on one page not at all.
 *
 * Built on `DetailSection` so these rails sit in the same rhythm as the facts
 * and the location above them: one rule, one heading, one trailing action.
 */
export const ListingDiscoveryRail: React.FC<ListingDiscoveryRailProps> = ({
  title,
  subtitle,
  moreHref,
  moreLabel,
  railLabel,
  kind,
  children,
  className = "",
}) => {
  // A rail with nothing in it is a heading and a rule promising content that
  // never arrives, which reads as a broken page rather than an empty one.
  if (!React.Children.toArray(children).some(Boolean)) return null;

  return (
    <DetailSection
      title={title}
      className={className}
      subtitle={
        subtitle ? (
          <p className="text-sm text-text-supporting">{subtitle}</p>
        ) : undefined
      }
      action={
        moreHref && moreLabel ? (
          <Link
            to={moreHref}
            data-listing-rail-more={kind}
            className="inline-flex min-h-control-target items-center gap-1 font-bold text-text-main underline underline-offset-4 hover:text-primary"
          >
            <span>{moreLabel}</span>
            <ChevronRight aria-hidden="true" className="h-icon-md w-icon-md" />
          </Link>
        ) : undefined
      }
    >
      <div data-listing-discovery-rail={kind}>
        <ListingRail label={railLabel ?? title}>{children}</ListingRail>
      </div>
    </DetailSection>
  );
};
