import type { TaxonomyV4ResolvedSchema } from "@shongre/contracts/taxonomy";
import { resolveTaxonomyControl } from "@shongre/features";
import { Select } from "../../design-system";
import {
  Checkbox,
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";

type ResolvedAttribute = TaxonomyV4ResolvedSchema["attributes"][number];

export interface TaxonomyV4FieldProps {
  field: ResolvedAttribute;
  locale: string;
  value: unknown;
  disabled?: boolean;
  state?: "ready" | "loading" | "empty" | "error";
  error?: string;
  onRetry?: () => void;
  onChange: (value: unknown) => void;
  onFiles?: (files: FileList) => void;
}

function localized(
  labels: Record<string, string | undefined>,
  locale: string,
): string {
  return labels[locale] ?? labels["fr-FR"] ?? "";
}

export function TaxonomyV4Field({
  field,
  locale,
  value,
  disabled = false,
  state = "ready",
  error,
  onRetry,
  onChange,
  onFiles,
}: TaxonomyV4FieldProps) {
  const { definition, binding, options } = field;
  const control = resolveTaxonomyControl(definition);
  const label = localized(definition.labels, locale);
  const hint = localized(definition.helpText, locale);
  const placeholder = localized(definition.placeholder, locale);
  const required = binding.required;

  if (control.kind === "hidden") return null;
  if (state === "loading") {
    return (
      <div
        role="status"
        className="rounded-control bg-bg-base p-3 text-xs text-text-muted"
      >
        Chargement de « {label} »…
      </div>
    );
  }
  if (state === "error") {
    return (
      <div
        role="alert"
        className="rounded-control border border-danger-border bg-danger-surface p-3 text-xs text-danger"
      >
        <p>{error || `Le champ « ${label} » n’a pas pu être chargé.`}</p>
        {onRetry ? (
          <button
            type="button"
            className="mt-2 font-bold underline"
            onClick={onRetry}
          >
            Réessayer
          </button>
        ) : null}
      </div>
    );
  }
  if (control.requiresOptions && options.length === 0 && state === "empty") {
    return (
      <div
        role="status"
        className="rounded-control bg-bg-base p-3 text-xs text-text-muted"
      >
        Aucune option disponible pour « {label} ».
      </div>
    );
  }
  if (control.kind === "readonly") {
    return (
      <FormField label={label} required={required} hint={hint}>
        <output className="block min-h-control-md rounded-control bg-bg-base px-3 py-2 text-xs text-text-main">
          {String(value ?? "")}
        </output>
      </FormField>
    );
  }
  if (control.kind === "boolean") {
    return (
      <div className="flex items-center pt-6">
        <Checkbox
          label={label}
          description={hint}
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      </div>
    );
  }
  if (
    (control.kind === "single_choice" ||
      control.kind === "autocomplete" ||
      control.kind === "cascade") &&
    options.length > 0
  ) {
    return (
      <FormField label={label} required={required} hint={hint}>
        <Select
          size="compact"
          className="w-full"
          labelledByAncestor
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Sélectionner une option</option>
          {options.map((option) => (
            <option key={option.id} value={option.key}>
              {localized(option.labels, locale)}
            </option>
          ))}
        </Select>
      </FormField>
    );
  }
  if (control.kind === "multiple_choice" && options.length > 0) {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <FormField label={label} required={required} hint={hint}>
        <div className="grid grid-cols-1 gap-2 rounded-control border border-border-base bg-bg-base p-3 sm:grid-cols-2">
          {options.map((option) => (
            <Checkbox
              key={option.id}
              label={localized(option.labels, locale)}
              checked={selected.includes(option.key)}
              disabled={disabled}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.key]
                    : selected.filter((item) => item !== option.key),
                )
              }
            />
          ))}
        </div>
      </FormField>
    );
  }
  if (control.kind === "number") {
    return (
      <FormField
        label={`${label}${definition.unit ? ` (${definition.unit})` : ""}`}
        required={required}
        hint={hint}
      >
        <Input
          type="number"
          disabled={disabled}
          value={value === undefined || value === null ? "" : String(value)}
          min={definition.validation.min}
          max={definition.validation.max}
          step={definition.dataType === "integer" ? 1 : "any"}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(
              event.target.value === "" ? "" : Number(event.target.value),
            )
          }
        />
      </FormField>
    );
  }
  if (control.kind === "date_range") {
    const range =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as { start?: string; end?: string })
        : {};
    return (
      <FormField label={label} required={required} hint={hint}>
        <div className="grid grid-cols-2 gap-2">
          {(["start", "end"] as const).map((bound) => (
            <Input
              key={bound}
              type="date"
              disabled={disabled}
              aria-label={bound === "start" ? "Date de début" : "Date de fin"}
              value={range[bound] ?? ""}
              onChange={(event) =>
                onChange({ ...range, [bound]: event.target.value })
              }
            />
          ))}
        </div>
      </FormField>
    );
  }
  if (control.kind === "date") {
    return (
      <FormField label={label} required={required} hint={hint}>
        <Input
          type={definition.dataType === "date_time" ? "datetime-local" : "date"}
          disabled={disabled}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      </FormField>
    );
  }
  if (control.kind === "media" || control.kind === "document") {
    return (
      <FormField
        label={label}
        required={required}
        hint={
          onFiles
            ? hint
            : "Ce document utilise le flux de téléversement privé sécurisé."
        }
      >
        <input
          type="file"
          multiple={control.multiple}
          disabled={disabled || !onFiles}
          accept={control.kind === "media" ? "image/*,video/*" : undefined}
          className="block w-full text-xs"
          onChange={(event) => {
            if (event.target.files && onFiles) onFiles(event.target.files);
          }}
        />
      </FormField>
    );
  }
  if (control.kind === "long_text" || control.kind === "multiple_choice") {
    return (
      <FormField label={label} required={required} hint={hint}>
        <Textarea
          disabled={disabled}
          value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(
              control.kind === "multiple_choice"
                ? event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : event.target.value,
            )
          }
        />
      </FormField>
    );
  }
  return (
    <FormField label={label} required={required} hint={hint}>
      <Input
        type={
          definition.dataType === "email"
            ? "email"
            : definition.dataType === "url"
              ? "url"
              : definition.dataType === "phone"
                ? "tel"
                : "text"
        }
        disabled={disabled}
        value={String(value ?? "")}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}
