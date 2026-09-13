import React, { useId, useMemo, useState } from "react";
import type { ListingCharacteristicsData } from "../../../api/contracts/listings.contract";
import { buildListingFactPresentation } from "@shongre/features/listings/facts";
import {
  DetailDisclosure,
  DetailFactList,
  DetailFeatureList,
  DetailSection,
} from "../../../design-system/primitives/DetailFacts";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface ListingCharacteristicsProps {
  data: ListingCharacteristicsData | null;
  state: "loading" | "ready" | "error";
  onRetry?: () => void;
  className?: string;
}

/**
 * The published characteristics of a listing, in the shape every category uses.
 *
 * What a reader needs first — what it is, which one, how much of it — comes
 * before the fold as a two-column fact list. Capabilities the listing has are
 * named rather than paired with the word "Oui". Everything the publication also
 * declared stays one click away instead of being dropped, because a buyer
 * comparing two listings is exactly the person who wants the long tail.
 *
 * The grouping and ordering come from the publication and the backend's
 * `presentation` flag, so this renders a vertical nobody anticipated without a
 * branch here or in the page that mounts it.
 */
export const ListingCharacteristics: React.FC<ListingCharacteristicsProps> = ({
  data,
  state,
  onRetry,
  className = "",
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const additionalId = useId();
  const featuresId = useId();

  const presentation = useMemo(
    () => buildListingFactPresentation(data),
    [data],
  );

  if (state === "loading") {
    return (
      <div
        aria-hidden="true"
        className={`skeleton-shimmer h-40 rounded-card border border-border-soft bg-bg-surface ${className}`}
      />
    );
  }
  if (state === "error") {
    return (
      <div
        className={`rounded-card border border-border-base bg-bg-surface p-5 text-sm text-text-supporting ${className}`}
      >
        <p>{t("listings.characteristics.unavailable")}</p>
        {onRetry ? (
          <button
            type="button"
            className="mt-3 min-h-control-target font-semibold text-primary hover:underline"
            onClick={onRetry}
          >
            {t("common.retry")}
          </button>
        ) : null}
      </div>
    );
  }

  const { keyFacts, features, additionalGroups, additionalCount } =
    presentation;
  if (!keyFacts.length && !features.length && !additionalCount) return null;

  // Only the first row of capabilities is shown until asked; a rental can
  // declare dozens and they would otherwise push the description off-screen.
  const visibleFeatures = features.slice(0, 6);
  const additionalFeatures = features.slice(6);

  return (
    <div
      data-listing-characteristics="true"
      className={`space-y-7 ${className}`}
    >
      {keyFacts.length ? (
        <DetailSection title={t("listings.characteristics.keyInformation")}>
          <DetailFactList facts={keyFacts} data-testid="listing-key-facts" />
          {additionalCount ? (
            <>
              <DetailDisclosure
                controls={additionalId}
                expanded={expanded}
                onToggle={() => setExpanded((open) => !open)}
                label={t("listings.characteristics.showMoreCriteria", {
                  count: additionalCount,
                })}
                expandedLabel={t("listings.characteristics.hideMoreCriteria")}
              />
              <div
                id={additionalId}
                hidden={!expanded}
                className="mt-6 space-y-6"
              >
                {additionalGroups.map((group) => (
                  <div key={group.id} data-detail-fact-group={group.id}>
                    {group.label ? (
                      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-text-tertiary">
                        {group.label}
                      </h3>
                    ) : null}
                    <DetailFactList facts={group.facts} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </DetailSection>
      ) : null}

      {features.length ? (
        <DetailSection title={t("listings.characteristics.amenities")}>
          <DetailFeatureList features={visibleFeatures} />
          {additionalFeatures.length ? (
            <>
              <DetailDisclosure
                controls={featuresId}
                expanded={featuresExpanded}
                onToggle={() => setFeaturesExpanded((open) => !open)}
                label={t("listings.characteristics.showAllAmenities")}
                expandedLabel={t("listings.characteristics.hideAllAmenities")}
              />
              <div id={featuresId} hidden={!featuresExpanded} className="mt-5">
                <DetailFeatureList features={additionalFeatures} />
              </div>
            </>
          ) : null}
        </DetailSection>
      ) : null}
    </div>
  );
};
