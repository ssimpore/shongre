import { Search } from "lucide-react";
import type { SolutionIconId } from "../../domains/solutions/solutions.types";
import { SolutionIcon } from "./SolutionIcon";

const marketplaceRows = [
  ["Maison familiale", "Immobilier", "Écully", "À la une"],
  ["Vélo cargo", "Mobilité", "Lyon", "Nouveau"],
] as const;

const rows = {
  prospects: [
    ["Atelier Lumière", "Design", "82", "Nouveau"],
    ["Greenov", "Énergie", "76", "Contacté"],
    ["Techmind", "Logiciels", "71", "À relancer"],
  ],
  facturation: [
    ["F-2026-0012", "Atelier Lumière", "1 250,00 €", "Émise"],
    ["F-2026-0011", "Maison Sève", "840,00 €", "Payée"],
  ],
  marketplace: marketplaceRows,
  pilotage: [],
  apps: marketplaceRows,
} as const;

const previewTitles: Record<SolutionIconId, string> = {
  prospects: "Prospects",
  facturation: "Factures",
  marketplace: "Marketplace",
  pilotage: "Pilotage",
  apps: "Application",
};

export function SolutionPreview({
  icon,
  variant = "catalog",
}: {
  icon: SolutionIconId;
  variant?: "catalog" | "detail";
}) {
  const detail = variant === "detail";
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-border-base bg-white shadow-xs"
    >
      <div className={`flex ${detail ? "min-h-64" : "min-h-28"}`}>
        <div className={`flex shrink-0 flex-col items-center border-r border-border-subtle bg-bg-subtle text-text-muted ${detail ? "w-24 gap-5 py-6" : "w-9 gap-3 py-3"}`}>
          <SolutionIcon
            icon={icon}
            className={`h-3.5 w-3.5 ${icon === "pilotage" ? "text-text-muted" : "text-primary"}`}
          />
          <span className="h-3.5 w-3.5 rounded border border-border-base" />
          <span className="h-3.5 w-3.5 rounded border border-border-base" />
        </div>
        <div className={`min-w-0 flex-1 ${detail ? "p-6" : "p-3"}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`${detail ? "text-base" : "text-micro"} font-black text-text-main`}>
              {previewTitles[icon]}
            </span>
            {icon !== "pilotage" ? (
              <span className="rounded bg-primary px-2 py-1 text-micro font-bold text-white">
                + Nouveau
              </span>
            ) : null}
          </div>
          {icon === "pilotage" ? (
              <div className={`${detail ? "mt-6" : "mt-3"} grid grid-cols-3 gap-2`}>
              {["Chiffre d’affaires", "Échéances", "Nouveaux clients"].map(
                (label) => (
                  <div key={label} className="rounded border border-border-subtle p-2">
                    <p className="text-micro text-text-muted">{label}</p>
                    <p className={`${detail ? "mt-6 text-base" : "mt-2 text-micro"} font-black text-text-muted`}>— —</p>
                  </div>
                ),
              )}
            </div>
          ) : (
            <>
              <div className={`flex items-center gap-1 rounded border border-border-subtle px-2 text-micro text-text-muted ${detail ? "mt-4 h-9" : "mt-2 h-5"}`}>
                <Search className="h-2.5 w-2.5" /> Rechercher…
              </div>
              <div className="mt-2 divide-y divide-border-subtle">
                {rows[icon].map((row) => (
                  <div key={row[0]} className={`grid grid-cols-4 gap-2 border-b border-border-subtle text-micro ${detail ? "py-4" : "py-1"}`}>
                    <span className="truncate font-semibold text-text-main">{row[0]}</span>
                    <span className="truncate text-text-muted">{row[1]}</span>
                    <span className="text-right font-bold text-text-main">{row[2]}</span>
                    <span className="text-right text-text-muted">{row[3]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
