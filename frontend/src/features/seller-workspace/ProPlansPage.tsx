import React from 'react';
import { Sparkles, Check, Building2, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { PRO_PLANS, LISTING_BOOSTS } from '../../configuration/plans.config';
import { formatPrice } from '../../utilities/formatters';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { usePageMeta } from '../../hooks/usePageMeta';

export const ProPlansPage: React.FC = () => {
  usePageMeta({
    title: "Offres et forfaits professionnels",
    description:
      "Comparez les forfaits professionnels Shongre : quotas d'annonces, vitrine personnalisée, statistiques et options de mise en avant. Sans engagement.",
    canonicalPath: "/solutions-pro",
  });

  return (
    <div className="space-y-12 pb-16">
      
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light border border-primary-border text-primary text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          Offres & Forfaits Professionnels Shongre
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Développez vos ventes avec nos forfaits sur mesure
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          Sans engagement. Activez votre vitrine personnalisée, importez votre inventaire en masse et bénéficiez de remises exclusives sur les options de visibilité.
        </p>
      </div>

      {/* Subscription Plans Grid */}
      {/* Three pricing columns only from `xl`. Each card carries 32px of padding
          a side plus a feature list, so a third of 768px (and still a third of
          1024px, inside the account shell) left the plan name and its quota
          badge fighting over the same line and pushed the page sideways. */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {PRO_PLANS.map((plan) => {
          const isPopular = plan.isPopular;
          /* The free tier is the individual account, not a professional one, so
             it signs up through the individual flow. Every card used to point at
             the professional route, which met someone choosing "Particulier"
             with a SIREN and VAT form they have no way to complete. */
          const signupPath =
            plan.id === 'free' ? '/inscription/particulier' : '/inscription/professionnel';
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-normal ${
                isPopular
                  ? 'border-primary ring-2 ring-primary shadow-xl relative'
                  : 'border-border-base shadow-xs hover:border-stone-400'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  Le plus populaire
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                  <h2 className="text-lg font-black text-stone-900">{plan.name}</h2>
                  <Badge variant={isPopular ? 'primary' : 'neutral'} size="sm">
                    {plan.maxActiveListings} annonces
                  </Badge>
                </div>

                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl sm:text-4xl font-black text-stone-900">
                    {formatPrice(plan.monthlyPrice)}
                  </span>
                  <span className="text-xs text-stone-500 font-semibold">HT / mois</span>
                </div>

                <p className="text-xs text-stone-500 mb-6">{plan.tagline}</p>

                <ul className="space-y-3 text-xs text-stone-700 pb-6 border-b border-border-subtle">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Button
                  to={signupPath}
                  variant={isPopular ? 'primary' : 'outline'}
                  size="lg"
                  fullWidth
                  className="font-bold shadow-xs"
                >
                  Choisir l'offre {plan.name}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visibility Boost Options Grid */}
      <div className="max-w-6xl mx-auto space-y-6 pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-stone-900">
            Options de mise en avant à la carte
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            À activer sur n'importe quelle annonce pour accélérer la vente
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LISTING_BOOSTS.map((opt) => (
            <div key={opt.id} className="bg-white rounded-xl border border-border-base p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900">{opt.name}</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">{opt.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs text-stone-500">{opt.durationDays} jours</span>
                <span className="text-sm font-black text-primary">{formatPrice(opt.priceEur)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
