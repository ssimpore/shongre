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

export interface TaxonomyFieldContext {
  sellerType: "individual" | "professional";
  fulfillmentTypes?: readonly string[];
  values?: Readonly<Record<string, unknown>>;
}

export type TaxonomyValueRemovalReason =
  | "not_in_schema"
  | "hidden"
  | "invalid_option"
  | "invalid_type"
  | "out_of_range"
  | "cleared_by_rule";

export interface TaxonomyValueRemoval {
  attributeId: string;
  reason: TaxonomyValueRemovalReason;
}

export interface TaxonomyValueIssue {
  attributeId: string;
  code: "required" | "invalid_option" | "invalid_type" | "out_of_range";
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

function fieldContext(
  schema: Pick<TaxonomyV4ResolvedSchema, "listingType" | "marketCode">,
  input: TaxonomyFieldContext,
): Readonly<Record<string, unknown>> {
  return {
    intent: schema.listingType.intent,
    country: schema.marketCode,
    seller_type: input.sellerType,
    fulfillment_model: input.fulfillmentTypes?.[0],
    fulfillment_types: input.fulfillmentTypes ?? [],
    ...(input.values ?? {}),
  };
}

function valueHasExpectedType(
  attribute: TaxonomyV4Attribute,
  value: unknown,
): boolean {
  switch (attribute.dataType) {
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "decimal":
    case "money":
    case "percent":
    case "number":
    case "range":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "multi_enum":
    case "multi_select":
    case "media":
    case "document":
      return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
      );
    case "json":
      return value !== undefined;
    case "date":
    case "date_time":
      return typeof value === "string" && !Number.isNaN(Date.parse(value));
    default:
      return typeof value === "string";
  }
}

function valueWithinRange(
  attribute: TaxonomyV4Attribute,
  value: unknown,
): boolean {
  if (typeof value !== "number") return true;
  const { min, max } = attribute.validation;
  return (
    (min === undefined || value >= min) && (max === undefined || value <= max)
  );
}

function allowedOptionKeys(
  schema: TaxonomyV4ResolvedSchema,
  attributeId: string,
  optionsByAttribute?: Readonly<
    Record<string, TaxonomyV4ResolvedSchema["attributes"][number]["options"]>
  >,
): Set<string> | null {
  const field = schema.attributes.find(
    ({ definition }) => definition.id === attributeId,
  );
  if (!field?.definition.optionSetId) return null;
  const options = optionsByAttribute?.[attributeId] ?? field.options;
  return new Set(options.map((option) => option.key));
}

function valueUsesAllowedOptions(
  value: unknown,
  allowed: Set<string> | null,
): boolean {
  if (!allowed) return true;
  return Array.isArray(value)
    ? value.every((candidate) => allowed.has(String(candidate)))
    : allowed.has(String(value));
}

function parseRuleValue(
  attribute: TaxonomyV4Attribute,
  detail: string | undefined,
): unknown {
  if (detail === undefined) return undefined;
  if (attribute.dataType === "boolean") return detail === "true";
  if (
    ["integer", "decimal", "money", "percent", "number", "range"].includes(
      attribute.dataType,
    )
  ) {
    const parsed = Number(detail);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (["multi_enum", "multi_select"].includes(attribute.dataType)) {
    return detail
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return detail;
}

/**
 * Computes presentation state only. The backend resolver remains authoritative
 * for validation and mutation eligibility.
 */
export function resolveTaxonomyFieldState(input: {
  schema: Pick<
    TaxonomyV4ResolvedSchema,
    "attributes" | "dependencyRules" | "listingType" | "marketCode"
  >;
  attributeId: string;
  values: Readonly<Record<string, unknown>>;
  sellerType: "individual" | "professional";
  fulfillmentTypes?: readonly string[];
  context?: Readonly<Record<string, unknown>>;
}): TaxonomyFieldState {
  const rules = input.schema.dependencyRules.filter((rule) =>
    rule.targets.some(
      (target) =>
        target.kind === "attribute" && target.key === input.attributeId,
    ),
  );
  const context = fieldContext(input.schema, {
    sellerType: input.sellerType,
    fulfillmentTypes: input.fulfillmentTypes,
    values: input.context,
  });
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
      (input.schema.attributes.find(
        ({ definition }) => definition.id === input.attributeId,
      )?.binding.required === true ||
        matching.some((rule) => rule.effect === "REQUIRE")) &&
      !matching.some((rule) => rule.effect === "OPTIONAL"),
    disabled: false,
  };
}

/**
 * Produces the only client-side attribute map that may be persisted or sent.
 * Backend validation remains authoritative, but hidden and stale values never
 * cross the client service boundary.
 */
export function reconcileTaxonomyValues(input: {
  schema: TaxonomyV4ResolvedSchema;
  values: Readonly<Record<string, unknown>>;
  sellerType: "individual" | "professional";
  fulfillmentTypes?: readonly string[];
  context?: Readonly<Record<string, unknown>>;
  optionsByAttribute?: Readonly<
    Record<string, TaxonomyV4ResolvedSchema["attributes"][number]["options"]>
  >;
}): {
  values: Record<string, unknown>;
  removed: TaxonomyValueRemoval[];
  setByRule: string[];
} {
  const allowedFields = new Map(
    input.schema.attributes.map((field) => [field.definition.id, field]),
  );
  const values: Record<string, unknown> = {};
  const removed = new Map<string, TaxonomyValueRemovalReason>();
  const setByRule = new Set<string>();

  for (const [attributeId, value] of Object.entries(input.values)) {
    if (allowedFields.has(attributeId)) values[attributeId] = value;
    else removed.set(attributeId, "not_in_schema");
  }

  for (let pass = 0; pass < Math.max(2, allowedFields.size * 2); pass += 1) {
    let changed = false;
    for (const [attributeId, field] of allowedFields) {
      const value = values[attributeId];
      if (!hasValue(value)) {
        if (value !== undefined) {
          delete values[attributeId];
          changed = true;
        }
        continue;
      }
      const state = resolveTaxonomyFieldState({
        schema: input.schema,
        attributeId,
        values,
        sellerType: input.sellerType,
        fulfillmentTypes: input.fulfillmentTypes,
        context: input.context,
      });
      if (!state.visible) {
        delete values[attributeId];
        removed.set(attributeId, "hidden");
        changed = true;
        continue;
      }
      if (!valueHasExpectedType(field.definition, value)) {
        delete values[attributeId];
        removed.set(attributeId, "invalid_type");
        changed = true;
        continue;
      }
      if (!valueWithinRange(field.definition, value)) {
        delete values[attributeId];
        removed.set(attributeId, "out_of_range");
        changed = true;
        continue;
      }
      if (
        !valueUsesAllowedOptions(
          value,
          allowedOptionKeys(
            input.schema,
            attributeId,
            input.optionsByAttribute,
          ),
        )
      ) {
        delete values[attributeId];
        removed.set(attributeId, "invalid_option");
        changed = true;
      }
    }

    const context = fieldContext(input.schema, {
      sellerType: input.sellerType,
      fulfillmentTypes: input.fulfillmentTypes,
      values: input.context,
    });
    for (const rule of input.schema.dependencyRules) {
      if (!matchesRule(rule, values, context)) continue;
      for (const target of rule.targets) {
        if (target.kind !== "attribute" || !allowedFields.has(target.key))
          continue;
        if (rule.effect === "CLEAR_VALUE" && hasValue(values[target.key])) {
          delete values[target.key];
          removed.set(target.key, "cleared_by_rule");
          changed = true;
        }
        if (rule.effect === "SET_VALUE") {
          const parsed = parseRuleValue(
            allowedFields.get(target.key)!.definition,
            rule.detail,
          );
          if (parsed !== undefined && values[target.key] !== parsed) {
            values[target.key] = parsed;
            setByRule.add(target.key);
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }

  return {
    values,
    removed: [...removed].map(([attributeId, reason]) => ({
      attributeId,
      reason,
    })),
    setByRule: [...setByRule],
  };
}

export function validateTaxonomyValues(input: {
  schema: TaxonomyV4ResolvedSchema;
  values: Readonly<Record<string, unknown>>;
  sellerType: "individual" | "professional";
  fulfillmentTypes?: readonly string[];
  context?: Readonly<Record<string, unknown>>;
  optionsByAttribute?: Readonly<
    Record<string, TaxonomyV4ResolvedSchema["attributes"][number]["options"]>
  >;
}): TaxonomyValueIssue[] {
  const issues: TaxonomyValueIssue[] = [];
  for (const field of input.schema.attributes) {
    const attributeId = field.definition.id;
    const state = resolveTaxonomyFieldState({
      schema: input.schema,
      attributeId,
      values: input.values,
      sellerType: input.sellerType,
      fulfillmentTypes: input.fulfillmentTypes,
      context: input.context,
    });
    if (!state.visible) continue;
    const value = input.values[attributeId];
    if (!hasValue(value)) {
      if (state.required) issues.push({ attributeId, code: "required" });
      continue;
    }
    if (!valueHasExpectedType(field.definition, value)) {
      issues.push({ attributeId, code: "invalid_type" });
    } else if (!valueWithinRange(field.definition, value)) {
      issues.push({ attributeId, code: "out_of_range" });
    } else if (
      !valueUsesAllowedOptions(
        value,
        allowedOptionKeys(input.schema, attributeId, input.optionsByAttribute),
      )
    ) {
      issues.push({ attributeId, code: "invalid_option" });
    }
  }
  return issues;
}
