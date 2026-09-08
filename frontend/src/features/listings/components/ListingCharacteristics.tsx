import React from "react";
import { Tag, Zap, Home, Car, Cpu, Sliders } from "lucide-react";
import type { ListingCharacteristicsData } from "../../../api/contracts/listings.contract";

export interface ListingCharacteristicsProps {
  data: ListingCharacteristicsData | null;
  state: "loading" | "ready" | "error";
  onRetry: () => void;
  className?: string;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  "grp.characteristics": <Tag className="w-icon-md h-icon-md text-primary" />,
  "grp.vehicle_technical": <Cpu className="w-icon-md h-icon-md text-info" />,
  "grp.vehicle_identity": <Car className="w-icon-md h-icon-md text-warning" />,
  "grp.property_specs": <Home className="w-icon-md h-icon-md text-success" />,
  "grp.property_energy": (
    <Zap className="w-icon-md h-icon-md text-rating-strong-bright" />
  ),
  "grp.dimensions": <Sliders className="w-icon-md h-icon-md text-automation" />,
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

export const ListingCharacteristics: React.FC<ListingCharacteristicsProps> = ({
  data,
  state,
  onRetry,
  className = "",
}) => {
  const groups = data?.groups ?? [];

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
    <div
      data-listing-characteristics="true"
      className={`space-y-6 ${className}`}
    >
      {groups.map((group) => (
        <div
          key={group.id}
          className="space-y-4 rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center gap-2.5 border-b border-border-soft pb-3">
            {GROUP_ICONS[group.id] ?? GROUP_ICONS["grp.characteristics"]}
            <h2 className="font-bold text-text-main">{group.label}</h2>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {group.items.map((item) => {
              const isDpe =
                item.code.toLowerCase().includes("dpe") &&
                setsValidDpe(item.value);
              return (
                <div
                  key={`${group.id}-${item.code}`}
                  className="flex min-w-0 items-center justify-between gap-3 border-b border-border-soft py-2 last:border-b-0"
                >
                  <dt className="text-sm text-text-supporting">{item.label}</dt>
                  <dd
                    className={
                      isDpe
                        ? `rounded-md px-2 py-1 text-sm font-bold ${DPE_COLORS[item.value]}`
                        : "min-w-0 break-words text-right text-sm font-semibold text-text-main"
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
