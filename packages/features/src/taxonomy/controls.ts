import type {
  TaxonomyV4Attribute,
  TaxonomyV4DependencyRule,
  TaxonomyV4ResolvedSchema,
  TaxonomyV4UiComponent,
} from "@shongre/contracts/taxonomy";

export type TaxonomyControlKind =
  | "text"
  | "long_text"
  | "number"
  | "boolean"
  | "single_choice"
  | "multiple_choice"
  | "autocomplete"
  | "cascade"
  | "date"
  | "date_range"
  | "location"
  | "media"
  | "document"
  | "readonly"
  | "hidden";

export interface TaxonomyControlDefinition {
  kind: TaxonomyControlKind;
  multiple: boolean;
  requiresOptions: boolean;
  supportsRemoteOptions: boolean;
}

const control = (
  kind: TaxonomyControlKind,
  overrides: Partial<TaxonomyControlDefinition> = {},
): TaxonomyControlDefinition => ({
  kind,
  multiple: false,
  requiresOptions: false,
  supportsRemoteOptions: false,
  ...overrides,
});

/** Exhaustive semantic registry shared by narrow Web and native renderers. */
export const TAXONOMY_CONTROL_REGISTRY = {
  select: control("single_choice", { requiresOptions: true }),
  number_input: control("number"),
  switch: control("boolean"),
  text_input: control("text"),
  money_input: control("number"),
  checkbox_group: control("multiple_choice", {
    multiple: true,
    requiresOptions: true,
  }),
  stepper: control("number"),
  radio_group: control("single_choice", { requiresOptions: true }),
  autocomplete: control("autocomplete", {
    requiresOptions: true,
    supportsRemoteOptions: true,
  }),
  date_picker: control("date"),
  segmented_control: control("single_choice", { requiresOptions: true }),
  textarea: control("long_text"),
  hidden: control("hidden"),
  cascading_select: control("cascade", {
    requiresOptions: true,
    supportsRemoteOptions: true,
  }),
  location_picker: control("location"),
  readonly_text: control("readonly"),
  size_grid: control("single_choice", { requiresOptions: true }),
  media_uploader: control("media", { multiple: true }),
  document_uploader: control("document", { multiple: true }),
  tag_input: control("multiple_choice", { multiple: true }),
  slider: control("number"),
  checkbox: control("boolean"),
  date_range_picker: control("date_range"),
  rich_textarea: control("long_text"),
  hierarchical_select: control("cascade", {
    requiresOptions: true,
    supportsRemoteOptions: true,
  }),
  multiselect: control("multiple_choice", {
    multiple: true,
    requiresOptions: true,
  }),
  country_select: control("autocomplete", { supportsRemoteOptions: true }),
  location_autocomplete: control("location", { supportsRemoteOptions: true }),
  postal_code_input: control("text"),
  address_autocomplete: control("location", { supportsRemoteOptions: true }),
  hidden_geo: control("hidden"),
  radius_input: control("number"),
  image_uploader: control("media", { multiple: true }),
  video_uploader: control("media", { multiple: true }),
  file_uploader: control("document", { multiple: true }),
  url_input: control("text"),
  schedule_editor: control("long_text"),
  business_id_input: control("text"),
  year_picker: control("number"),
  secure_text_input: control("text"),
  computed_readonly: control("readonly"),
  energy_rating: control("number"),
  time_picker: control("text"),
  structured_textarea: control("long_text"),
  tags_input: control("multiple_choice", { multiple: true }),
  evidence_editor: control("long_text"),
  status_badge: control("readonly"),
  document_status: control("readonly"),
  datetime_picker: control("date"),
  barcode_input: control("text"),
} satisfies Record<TaxonomyV4UiComponent, TaxonomyControlDefinition>;

export function resolveTaxonomyControl(
  attribute: Pick<TaxonomyV4Attribute, "uiComponent">,
): TaxonomyControlDefinition {
  return TAXONOMY_CONTROL_REGISTRY[attribute.uiComponent];
}

export interface TaxonomyFieldState {
  visible: boolean;
  required: boolean;
  disabled: boolean;
}

function hasValue(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function matchesRule(
  rule: TaxonomyV4DependencyRule,
  values: Readonly<Record<string, unknown>>,
  context: Readonly<Record<string, unknown>>,
): boolean {
  const source = rule.trigger.kind === "context" ? context : values;
  const value = source[rule.trigger.key];
  const stringValue = String(value ?? "");
  switch (rule.operator) {
    case "always":
      return true;
    case "is_set":
      return hasValue(value);
    case "eq":
      return rule.values.includes(stringValue);
    case "neq":
      return !rule.values.includes(stringValue);
    case "in":
      return Array.isArray(value)
        ? value.some((candidate) => rule.values.includes(String(candidate)))
        : rule.values.includes(stringValue);
    case "contains":
      return Array.isArray(value)
        ? value.map(String).some((candidate) => rule.values.includes(candidate))
        : rule.values.some((candidate) => stringValue.includes(candidate));
    case "contains_any":
      return Array.isArray(value)
        ? value.map(String).some((candidate) => rule.values.includes(candidate))
        : rule.values.some((candidate) => stringValue.includes(candidate));
    case "gt":
      return Number(value) > Number(rule.values[0]);
    case "gte":
      return Number(value) >= Number(rule.values[0]);
    case "lte":
      return Number(value) <= Number(rule.values[0]);
    // These operators require a dataset, prior-value snapshot, or authoritative
    // clock. They remain backend-enforced instead of being guessed by a client.
    case "changes":
    case "in_dataset":
    case "older_than":
      return false;
  }
}

/**
 * Computes presentation state only. The backend resolver remains authoritative
 * for validation and mutation eligibility.
 */
export function resolveTaxonomyFieldState(input: {
  schema: Pick<
    TaxonomyV4ResolvedSchema,
    "dependencyRules" | "listingType" | "marketCode"
  >;
  attributeId: string;
  values: Readonly<Record<string, unknown>>;
  sellerType: "individual" | "professional";
}): TaxonomyFieldState {
  const rules = input.schema.dependencyRules.filter((rule) =>
    rule.targets.some(
      (target) =>
        target.kind === "attribute" && target.key === input.attributeId,
    ),
  );
  const context = {
    intent: input.schema.listingType.intent,
    country: input.schema.marketCode,
    seller_type: input.sellerType,
  };
  const showRules = rules.filter((rule) => rule.effect === "SHOW");
  const matching = rules.filter((rule) =>
    matchesRule(rule, input.values, context),
  );
  const visible =
    !matching.some((rule) => rule.effect === "HIDE") &&
    (showRules.length === 0 || matching.some((rule) => rule.effect === "SHOW"));
  return {
    visible,
    required:
      matching.some((rule) => rule.effect === "REQUIRE") &&
      !matching.some((rule) => rule.effect === "OPTIONAL"),
    disabled: false,
  };
}
