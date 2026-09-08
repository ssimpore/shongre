import type { components } from "@shongre/contracts/openapi";
import type { TaxonomyV1Node } from "@shongre/contracts/taxonomy";

/** Web view types project the canonical v1 transport contract. */
export type TaxonomyNode = components["schemas"]["TaxonomyV1CategoryLookup"];
export type TaxonomyAttribute =
  components["schemas"]["TaxonomyV1FilterAttribute"];

/** Nested menu presentation built from the API's flat, market-filtered tree. */
export type TaxonomyNavigationNode = Pick<
  TaxonomyV1Node,
  | "id"
  | "slug"
  | "parentId"
  | "publishable"
  | "labels"
  | "shortLabels"
  | "description"
  | "iconName"
  | "sortOrder"
  | "status"
> & {
  code: string;
  level: "category" | "subcategory" | "type";
  name: string;
  children?: TaxonomyNavigationNode[];
};

export type TaxonomyPrimaryCta =
  | "contact_seller"
  | "apply"
  | "request_quote"
  | "request_visit"
  | "request_test_drive"
  | "request_lesson"
  | "check_availability"
  | "propose_exchange";

export type TaxonomyLabelMode = "full" | "compact";
export interface TaxonomyLabelOptions {
  compact?: boolean;
  locale?: string;
}
