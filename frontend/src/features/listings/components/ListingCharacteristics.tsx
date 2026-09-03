import React from "react";
import { Tag, Zap, Home, Car, Cpu, Sparkles, Sliders } from "lucide-react";
import { GroupedCharacteristics } from "../../../domains/listing/listing.display";

export interface ListingCharacteristicsProps {
  groups: GroupedCharacteristics[];
  className?: string;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  general: <Tag className="w-icon-md h-icon-md text-primary" />,
  technical: <Cpu className="w-icon-md h-icon-md text-info" />,
  engine: <Car className="w-icon-md h-icon-md text-warning" />,
  property: <Home className="w-icon-md h-icon-md text-success" />,
  energy: <Zap className="w-icon-md h-icon-md text-yellow-500" />,
  dimensions: <Sliders className="w-icon-md h-icon-md text-purple-600" />,
};

// DPE Energy Rating Colors
const DPE_COLORS: Record<string, string> = {
  A: "bg-success text-white",
  B: "bg-success text-white",
  C: "bg-lime-500 text-stone-900",
  D: "bg-yellow-400 text-stone-900",
  E: "bg-amber-500 text-white",
  F: "bg-orange-600 text-white",
  G: "bg-danger text-white",
};

export const ListingCharacteristics: React.FC<ListingCharacteristicsProps> = ({
  groups = [],
  className = "",
}) => {
  if (groups.length === 0) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {groups.map((group) => (
        <div
          key={group.groupKey}
          className="bg-bg-surface rounded-card border border-border-base p-5 sm:p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-border-subtle">
            {GROUP_ICONS[group.groupKey] || (
              <Sparkles className="w-icon-lg h-icon-lg text-primary" />
            )}
            <h2 className="text-base font-bold text-text-main">
              {group.groupTitle}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {group.items.map((item) => {
              const isDpeOrGes =
                item.code.includes("energy_class") ||
                item.code.includes("ges_class");
              const dpeVal = String(item.value).toUpperCase();

              return (
                <div
                  key={item.code}
                  className="p-3 rounded-control bg-bg-subtle border border-border-subtle flex flex-col justify-between hover:bg-bg-muted motion-interactive"
                >
                  <span className="text-xs text-text-secondary font-medium block truncate mb-1.5">
                    {item.label}
                  </span>

                  {isDpeOrGes && DPE_COLORS[dpeVal] ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs ${DPE_COLORS[dpeVal]}`}
                      >
                        {dpeVal}
                      </span>
                      <span className="text-sm font-bold text-text-main">
                        Classe {dpeVal}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-text-main break-words">
                      {item.value}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
