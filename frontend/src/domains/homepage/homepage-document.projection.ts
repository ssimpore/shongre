import { projectListingForSearchCard } from "../listing/listing-search-card.projection";
import type { HomepageExperience } from "./homepage.types";

/**
 * The homepage experience as the document carries it.
 *
 * Every section's listings are serialised into the initial HTML, and each
 * one is painted as a card, so each is narrowed to what a card reads — the
 * same projection the search page applies to its first results. The sections
 * themselves, their order, schedules and thresholds are the backend's
 * published composition and travel untouched.
 */
export function projectHomepageExperienceForDocument(
  experience: HomepageExperience,
): HomepageExperience {
  return {
    ...experience,
    sections: experience.sections.map((section) => ({
      ...section,
      listings: section.listings?.map(projectListingForSearchCard),
      universeGroups: section.universeGroups?.map((group) => ({
        ...group,
        listings: group.listings.map(projectListingForSearchCard),
      })),
      deals: section.deals?.map((deal) => ({
        ...deal,
        listing: projectListingForSearchCard(deal.listing),
      })),
      trending: section.trending
        ? {
            ...section.trending,
            topics: section.trending.topics.map((topic) => ({
              ...topic,
              listings: topic.listings.map(projectListingForSearchCard),
            })),
          }
        : undefined,
    })),
  };
}
