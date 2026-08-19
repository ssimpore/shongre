import React, { useState } from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../providers/AuthProvider';
import { normalizePlatformRole } from '../../security/roles.config';
import { Shield, Sparkles, User, Briefcase, ChevronDown, Check } from 'lucide-react';

export const DemoRoleSwitcher: React.FC = () => {
  const { platformRole, currentUser, switchRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roles: { role: UserRole; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      role: 'guest',
      label: '1. Visiteur non connecté',
      desc: 'Navigation publique, recherche, découverte sans compte',
      icon: <User className="w-4 h-4 text-stone-400" />,
    },
    {
      role: 'individual_buyer',
      label: '2. Acheteur Particulier (Thomas)',
      desc: 'Favoris, offres, achats, messagerie acheteur',
      icon: <User className="w-4 h-4 text-info" />,
    },
    {
      role: 'individual_seller',
      label: '3. Vendeur Particulier (Camille)',
      desc: 'Publication, gestion d\'annonces, offres reçues',
      icon: <Sparkles className="w-4 h-4 text-warning" />,
    },
    {
      role: 'pro_seller',
      label: '4. Vendeur Pro (Atelier Nordique SAS)',
      desc: 'Boutique Pro, SIRET, catalogue, statistiques avancées',
      icon: <Briefcase className="w-4 h-4 text-primary" />,
    },
    {
      role: 'moderator',
      label: '5. Modérateur Shongre (Claire)',
      desc: 'Validation annonces, signalements, sécurité',
      icon: <Shield className="w-4 h-4 text-indigo-600" />,
    },
    {
      role: 'admin',
      label: '6. Administrateur Système (Antoine)',
      desc: 'Accès intégral plateforme, plans, configuration',
      icon: <Shield className="w-4 h-4 text-success" />,
    },
  ];

  // Match on the normalised platform role, not the raw switcher id. The list
  // is keyed by `individual_seller` while the demo user carries `primaryRole:
  // 'seller'`, so a direct comparison never matched and the switcher fell back
  // to entry zero — it reported "Visiteur non connecté" while signed in as
  // Camille, the one thing this control exists to tell you.
  const currentRoleObj =
    roles.find((r) => normalizePlatformRole(r.role) === platformRole) || roles[0];

  return (
    /* `z-45` follows the same tier as the mobile drawer: above page chrome
       (the sticky header is `z-40`), below modals and toasts (`z-50`).

       It was `z-40`. Because this element is positioned, that created a
       stacking context, which trapped the dropdown's own `z-50` inside it — so
       the menu competed with the header as a `z-40` sibling and lost on DOM
       order, since the header comes later. The role list rendered underneath
       the header and its first entry was unreadable. */
    <div className="bg-stone-900 text-stone-200 text-xs py-1.5 px-4 border-b border-stone-800 relative z-45">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-white text-micro font-bold px-2 py-1 rounded tracking-wider uppercase">
            Mode Démo
          </span>
          <span className="hidden sm:inline text-stone-400">
            Tester les 6 profils et parcours sans mot de passe :
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-white px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-stone-700"
          >
            <span className="shrink-0">{currentRoleObj.icon}</span>
            <span className="font-semibold">{currentRoleObj.label.split('(')[0]}</span>
            {currentUser && <span className="text-stone-400 hidden md:inline">({currentUser.name})</span>}
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-[calc(100vw-24px)] max-w-xs sm:w-80 bg-white text-stone-900 rounded-xl shadow-2xl border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-fast">
              <div className="px-3 py-1.5 border-b border-stone-100 text-xs font-bold text-stone-400 uppercase tracking-wider">
                Changer de rôle pour tester
              </div>
              {roles.map((r) => {
                const isActive = normalizePlatformRole(r.role) === platformRole;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => {
                      switchRole(r.role);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-stone-50 transition-colors cursor-pointer ${
                      isActive ? 'bg-primary-light text-primary' : 'text-stone-800'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{r.label}</span>
                        {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <div className="text-xs text-stone-400 font-normal leading-tight mt-0.5">
                        {r.desc}
                      </div>
                    </div>
                  </button>
                );
              })}

              <div className="border-t border-stone-100 my-1 pt-1">
                <div className="px-3 py-1 text-micro font-bold text-stone-400 uppercase tracking-wider">
                  Accès direct aux profils publics
                </div>
                <div className="grid grid-cols-2 gap-1 px-2 pb-1 text-xs">
                  <a
                    href="/profil/camille-martin"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-stone-100 font-semibold text-stone-700 truncate"
                  >
                    👤 Camille (Particulier)
                  </a>
                  <a
                    href="/boutique/atelier-nordique"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-stone-100 font-semibold text-primary truncate"
                  >
                    🏬 Atelier Nordique (Pro)
                  </a>
                  <a
                    href="/profil/marion-dupuis"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-stone-100 text-stone-600 truncate"
                  >
                    📦 0 annonce (Particulier)
                  </a>
                  <a
                    href="/boutique/optique-des-arts"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-stone-100 text-stone-600 truncate"
                  >
                    📦 0 annonce (Pro)
                  </a>
                  <a
                    href="/profil/lucas-bernard"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-stone-100 text-stone-600 truncate"
                  >
                    ⭐ 0 avis (Nouveau)
                  </a>
                  <a
                    href="/profil/vendeur-suspendu"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-danger-surface text-danger truncate"
                  >
                    🚫 Profil Suspendu (Sécurité)
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
