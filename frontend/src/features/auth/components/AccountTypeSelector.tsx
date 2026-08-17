import React from 'react';
import { User, Briefcase, CheckCircle2, ShieldCheck, Zap, Store, ArrowRight } from 'lucide-react';
import { AccountType } from '../../../types';

export interface AccountTypeSelectorProps {
  selectedType: AccountType;
  onChange: (type: AccountType) => void;
}

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  selectedType,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Individual Option */}
      <button
        type="button"
        onClick={() => onChange('individual')}
        className={`relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
          selectedType === 'individual'
            ? 'border-primary bg-primary-light/30 shadow-md ring-2 ring-primary/20'
            : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
              selectedType === 'individual'
                ? 'bg-primary text-white'
                : 'bg-stone-100 text-stone-700'
            }`}
          >
            <User className="w-5 h-5" />
          </div>

          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
              selectedType === 'individual'
                ? 'border-primary bg-primary text-white'
                : 'border-stone-300 bg-white'
            }`}
          >
            {selectedType === 'individual' && <CheckCircle2 className="w-4 h-4" />}
          </div>
        </div>

        <span className="font-extrabold text-base text-stone-950 mb-1">
          Particulier
        </span>
        <p className="text-xs text-stone-600 leading-relaxed mb-3">
          Pour acheter en toute sécurité et vendre vos objets du quotidien sans frais d'inscription.
        </p>

        <div className="mt-auto pt-3 border-t border-stone-100 space-y-1.5 text-micro font-medium text-stone-600">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Dépôt d'annonces gratuit et instantané</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Paiement sécurisé avec séquestre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Messagerie instantanée directe</span>
          </div>
        </div>
      </button>

      {/* Pro Option */}
      <button
        type="button"
        onClick={() => onChange('professional')}
        className={`relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
          selectedType === 'professional'
            ? 'border-primary bg-primary-light/30 shadow-md ring-2 ring-primary/20'
            : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
              selectedType === 'professional'
                ? 'bg-primary text-white'
                : 'bg-stone-100 text-stone-700'
            }`}
          >
            <Briefcase className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white font-black text-micro tracking-wider uppercase">
              SIRET PRO
            </span>
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                selectedType === 'professional'
                  ? 'border-primary bg-primary text-white'
                  : 'border-stone-300 bg-white'
              }`}
            >
              {selectedType === 'professional' && <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
        </div>

        <span className="font-extrabold text-base text-stone-950 mb-1 flex items-center gap-1.5">
          Professionnel
        </span>
        <p className="text-xs text-stone-600 leading-relaxed mb-3">
          Pour les entreprises, artisans, boutiques et commerçants immatriculés.
        </p>

        <div className="mt-auto pt-3 border-t border-stone-100 space-y-1.5 text-micro font-medium text-stone-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Badge officiel Vendeur Pro Vérifié</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Vitrine de boutique personnalisable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Facturation automatique avec TVA</span>
          </div>
        </div>
      </button>
    </div>
  );
};
