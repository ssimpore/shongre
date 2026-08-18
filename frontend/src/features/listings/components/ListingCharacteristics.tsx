import React from 'react';
import { Tag, Zap, Home, Car, Cpu, Sparkles, Sliders } from 'lucide-react';
import { GroupedCharacteristics } from '../../../domains/listing/listing.display';

export interface ListingCharacteristicsProps {
  groups: GroupedCharacteristics[];
  className?: string;
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  general: <Tag className="w-4 h-4 text-primary" />,
  technical: <Cpu className="w-4 h-4 text-info" />,
  engine: <Car className="w-4 h-4 text-warning" />,
  property: <Home className="w-4 h-4 text-success" />,
  energy: <Zap className="w-4 h-4 text-yellow-500" />,
  dimensions: <Sliders className="w-4 h-4 text-purple-600" />,
};

// DPE Energy Rating Colors
const DPE_COLORS: Record<string, string> = {
  A: 'bg-success text-white',
  B: 'bg-success text-white',
  C: 'bg-lime-500 text-stone-900',
  D: 'bg-yellow-400 text-stone-900',
  E: 'bg-amber-500 text-white',
  F: 'bg-orange-600 text-white',
  G: 'bg-danger text-white',
};

export const ListingCharacteristics: React.FC<ListingCharacteristicsProps> = ({
  groups = [],
  className = '',
}) => {
  if (groups.length === 0) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {groups.map((group) => (
        <div
          key={group.groupKey}
          className="bg-white rounded-2xl border border-border-base p-5 sm:p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
            {GROUP_ICONS[group.groupKey] || <Sparkles className="w-4 h-4 text-primary" />}
            <h2 className="text-sm sm:text-base font-bold text-stone-900 uppercase tracking-wider">
              {group.groupTitle}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {group.items.map((item) => {
              const isDpeOrGes = item.code.includes('energy_class') || item.code.includes('ges_class');
              const dpeVal = String(item.value).toUpperCase();

              return (
                <div
                  key={item.code}
                  className="p-3 rounded-xl bg-bg-base/70 border border-border-base flex flex-col justify-between"
                >
                  <span className="text-micro text-stone-500 font-medium block truncate mb-1">
                    {item.label}
                  </span>

                  {isDpeOrGes && DPE_COLORS[dpeVal] ? (
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow-xs ${DPE_COLORS[dpeVal]}`}>
                        {dpeVal}
                      </span>
                      <span className="text-xs font-bold text-stone-900">Classe {dpeVal}</span>
                    </div>
                  ) : (
                    <span className="text-xs sm:text-sm font-black text-stone-900 break-words">
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
