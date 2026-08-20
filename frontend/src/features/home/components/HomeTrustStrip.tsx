import React from 'react';
import { ShieldCheck, Truck, Lock } from 'lucide-react';
import { useTranslation } from '../../../i18n/I18nProvider';
import { MessageKey } from '../../../i18n/messages.fr';

interface TrustPillar {
  id: string;
  icon: React.FC<{ className?: string }>;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

/* Message keys, not literals: this strip is chrome and has to follow the
   interface language like the rest of the shell. */
const TRUST_PILLARS: TrustPillar[] = [
  { id: 'escrow', icon: Lock, titleKey: 'home.trust.escrowTitle', bodyKey: 'home.trust.escrowBody' },
  { id: 'delivery', icon: Truck, titleKey: 'home.trust.deliveryTitle', bodyKey: 'home.trust.deliveryBody' },
  { id: 'verified', icon: ShieldCheck, titleKey: 'home.trust.verifiedTitle', bodyKey: 'home.trust.verifiedBody' },
];

export const HomeTrustStrip: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t('home.homeTrustStrip.engagementsEtGarantiesShongre')}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 sm:mt-2"
    >
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs">
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-3.5 md:gap-6 divide-y md:divide-y-0 md:divide-x divide-stone-100">
          {TRUST_PILLARS.map(({ id, icon: Icon, titleKey, bodyKey }) => (
            <li
              key={id}
              className="flex items-center gap-3.5 pt-3 first:pt-0 md:pt-0 md:px-4 md:first:pl-0 md:last:pr-0"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                  {t(titleKey)}
                </h3>
                <p className="text-micro sm:text-xs text-stone-500 font-normal leading-tight mt-0.5">
                  {t(bodyKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
