import React, { useMemo } from "react";
import { Tag, Zap, Home, Car, Cpu, Sliders } from "lucide-react";
import type { TaxonomyV4ResolvedSchema } from "@shongre/contracts/taxonomy";
import type { Listing } from "../../../types";

export interface ListingCharacteristicsProps {
  listing: Listing;
  schema: TaxonomyV4ResolvedSchema | null;
  state: "loading" | "ready" | "error";
  locale: string;
  onRetry: () => void;
  className?: string;
}

interface CharacteristicItem {
  code: string;
  label: string;
  value: string;
}

interface CharacteristicGroup {
  groupKey: string;
  groupTitle: string;
  items: CharacteristicItem[];
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  general: <Tag className="w-icon-md h-icon-md text-primary" />,
  technical: <Cpu className="w-icon-md h-icon-md text-info" />,
  engine: <Car className="w-icon-md h-icon-md text-warning" />,
  property: <Home className="w-icon-md h-icon-md text-success" />,
  energy: <Zap className="w-icon-md h-icon-md text-rating-strong-bright" />,
  dimensions: <Sliders className="w-icon-md h-icon-md text-automation" />,
};

const DPE_COLORS: Record<string, string> = {
  A: "bg-success text-text-inverse",
  B: "bg-success text-text-inverse",
  C: "bg-sustainability-fill text-text-main",
  D: "bg-rating-fill-bright text-text-main",
  E: "bg-rating-strong text-text-inverse",
  F: "bg-primary-fill text-text-inverse",
  G: "bg-danger text-text-inverse",
};

function localizedLabel(
  labels: Readonly<Record<string, string | undefined>>,
  locale: string,
): string {
  return (
    labels[locale] ||
    labels[locale.split("-")[0]] ||
    labels["fr-FR"] ||
    Object.values(labels).find(Boolean) ||
    ""
  );
}

function formatValue(
  value: unknown,
  locale: string,
  unit: string | undefined,
  options: TaxonomyV4ResolvedSchema["attributes"][number]["options"],
): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatValue(entry, locale, unit, options))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "boolean") {
    return value
      ? locale.toLowerCase().startsWith("fr")
        ? "Oui"
        : "Yes"
      : locale.toLowerCase().startsWith("fr")
        ? "Non"
        : "No";
  }
  const option = options.find(
    (candidate) =>
      candidate.id === String(value) || candidate.key === String(value),
  );
  if (option) return localizedLabel(option.labels, locale);
  if (typeof value === "number") {
    const formatted = new Intl.NumberFormat(locale).format(value);
    return unit ? `${formatted} ${unit}` : formatted;
  }
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function projectGroups(
  listing: Listing,
  schema: TaxonomyV4ResolvedSchema,
  locale: string,
): CharacteristicGroup[] {
  const definitions = new Map(
    schema.attributes.map((attribute) => [attribute.definition.id, attribute]),
  );
  const seen = new Set<string>();
  const groups = new Map<string, CharacteristicGroup>();

  for (const field of schema.projections.detailFields) {
    if (field.field?.kind !== "attribute") continue;
    const resolved = definitions.get(field.field.key);
    if (!resolved) continue;
    const { definition } = resolved;
    const value =
      listing.attributes[definition.code] ??
      listing.attributes[definition.id] ??
      listing.attributes[field.field.key];
    const formattedValue = formatValue(
      value,
      locale,
      definition.unit,
      resolved.options,
    );
    if (!formattedValue) continue;

    const groupKey = field.sectionId || resolved.binding.groupId || "general";
    const group = groups.get(groupKey) ?? {
      groupKey,
      groupTitle:
        localizedLabel(field.sectionLabels, locale) ||
        localizedLabel(definition.labels, locale),
      items: [],
    };
    group.items.push({
      code: definition.code,
      label: localizedLabel(field.labels, locale),
      value: formattedValue,
    });
    groups.set(groupKey, group);
    seen.add(definition.id);
  }

  for (const resolved of schema.attributes) {
    const { definition, binding } = resolved;
    if (!definition.detailVisible || seen.has(definition.id)) continue;
    const value =
      listing.attributes[definition.code] ?? listing.attributes[definition.id];
    const formattedValue = formatValue(
      value,
      locale,
      definition.unit,
      resolved.options,
    );
    if (!formattedValue) continue;
    const groupKey = binding.groupId || definition.groupId || "general";
    const group = groups.get(groupKey) ?? {
      groupKey,
      groupTitle: localizedLabel(definition.labels, locale),
      items: [],
    };
    group.items.push({
      code: definition.code,
      label: localizedLabel(definition.labels, locale),
      value: formattedValue,
    });
    groups.set(groupKey, group);
  }

  return [...groups.values()].filter((group) => group.items.length > 0);
}

export const ListingCharacteristics: React.FC<ListingCharacteristicsProps> = ({
  listing,
  schema,
  state,
  locale,
  onRetry,
  className = "",
}) => {
  const groups = useMemo(
    () => (schema ? projectGroups(listing, schema, locale) : []),
    [listing, locale, schema],
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
        <p>Les caractéristiques ne sont pas disponibles pour le moment.</p>
        <button
          type="button"
          className="mt-3 min-h-control-sm font-semibold text-primary hover:underline"
          onClick={onRetry}
        >
          Réessayer
        </button>
      </div>
    );
  }
  if (groups.length === 0) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {groups.map((group) => (
        <div
          key={group.groupKey}
          className="space-y-4 rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center gap-2.5 border-b border-border-soft pb-3">
            {GROUP_ICONS[group.groupKey] ?? GROUP_ICONS.general}
            <h2 className="font-bold text-text-main">{group.groupTitle}</h2>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {group.items.map((item) => {
              const isDpe =
                item.code.toLowerCase().includes("dpe") &&
                setsValidDpe(item.value);
              return (
                <div
                  key={`${group.groupKey}-${item.code}`}
                  className="flex min-w-0 items-center justify-between gap-3 border-b border-border-soft py-2 last:border-b-0"
                >
                  <dt className="text-sm text-text-supporting">{item.label}</dt>
                  <dd
                    className={
                      isDpe
                        ? `rounded-md px-2 py-1 text-sm font-bold ${DPE_COLORS[item.value]}`
                        : "text-right text-sm font-semibold text-text-main"
                    }
                  >
                    {item.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
};

function setsValidDpe(value: string): value is keyof typeof DPE_COLORS {
  return Object.hasOwn(DPE_COLORS, value);
}
