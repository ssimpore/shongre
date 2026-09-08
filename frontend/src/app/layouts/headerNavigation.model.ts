import type {
  TaxonomyHeaderCategoryItem,
  TaxonomyHeaderNavigationConfiguration,
  TaxonomyHeaderNavigationLink,
} from "@shongre/contracts/taxonomy";
import { routes } from "../../configuration/routes";

export type HeaderNavigationItem =
  | ({ kind: "category" } & TaxonomyHeaderCategoryItem)
  | ({ kind: "link" } & TaxonomyHeaderNavigationLink);

export function headerNavigationItems(
  configuration: Pick<TaxonomyHeaderNavigationConfiguration, "items" | "links">,
): HeaderNavigationItem[] {
  return [
    ...configuration.items.map((item) => ({
      ...item,
      kind: "category" as const,
    })),
    ...(configuration.links ?? []).map((item) => ({
      ...item,
      kind: "link" as const,
    })),
  ].sort((left, right) => left.displayOrder - right.displayOrder);
}

export function headerNavigationLabel(
  item: Pick<TaxonomyHeaderCategoryItem, "labels" | "shortLabels">,
  locale: string,
): string {
  const language = locale.split("-")[0];
  const localized = (values: Record<string, string>) =>
    values[locale] ??
    Object.entries(values).find(
      ([key]) => key.split("-")[0] === language,
    )?.[1] ??
    values["fr-FR"] ??
    Object.values(values)[0];
  return localized(item.shortLabels) ?? localized(item.labels) ?? "";
}

export function dedicatedCategoryDestination(slug: string): string | undefined {
  if (slug === "vehicules") return routes.auto.search();
  if (slug === "immobilier") return routes.immo.search();
  if (slug === "emploi") return routes.employment.search();
  if (slug === "education") return routes.courses.search();
  return undefined;
}

export function headerLinkDestination(
  target: TaxonomyHeaderNavigationLink["target"],
): string {
  return target === "category_overview" ? routes.categories() : routes.deals();
}

export function headerNavigationDestination(
  item: HeaderNavigationItem,
): string {
  return item.kind === "category"
    ? (dedicatedCategoryDestination(item.slug) ??
        routes.search({ category: item.slug }))
    : headerLinkDestination(item.target);
}
