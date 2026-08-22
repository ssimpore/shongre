import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { roleLabel } from "../../security/roles.config";
import {
  Shield,
  Sparkles,
  User,
  Briefcase,
  ChevronDown,
  Check,
  LoaderCircle,
} from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { useToast } from "../providers/ToastProvider";

interface DemoPersona {
  userKey: string;
  userId?: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
  iconClassName: string;
}

const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    userKey: "guest",
    label: "1. Visiteur non connecté",
    desc: "Navigation publique, recherche, découverte sans compte",
    Icon: User,
    iconClassName: "text-stone-400",
  },
  {
    userKey: "buyer_thomas",
    userId: "user_thomas",
    label: "2. Acheteur Particulier (Thomas)",
    desc: "Favoris, offres, achats, messagerie acheteur",
    Icon: User,
    iconClassName: "text-info",
  },
  {
    userKey: "seller_camille",
    userId: "user_camille",
    label: "3. Vendeur Particulier (Camille)",
    desc: "Publication, gestion d'annonces, offres reçues",
    Icon: Sparkles,
    iconClassName: "text-warning",
  },
  {
    userKey: "pro_atelier",
    userId: "user_pro_atelier",
    label: "4. Vendeur Pro (Atelier Nordique SAS)",
    desc: "Boutique Pro, SIRET, catalogue, statistiques avancées",
    Icon: Briefcase,
    iconClassName: "text-primary",
  },
  {
    userKey: "moderator_claire",
    userId: "user_mod_claire",
    label: "5. Modérateur Shongre (Claire)",
    desc: "Validation annonces, signalements, sécurité",
    Icon: Shield,
    iconClassName: "text-indigo-600",
  },
  {
    userKey: "admin_antoine",
    userId: "user_admin_antoine",
    label: "6. Administrateur Système (Antoine)",
    desc: "Accès intégral plateforme, plans, configuration",
    Icon: Shield,
    iconClassName: "text-success",
  },
];

export const DemoRoleSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { platformRole, currentUser, switchDemoUser } = useAuth();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingUserKey, setSwitchingUserKey] = useState<string | null>(null);

  /**
   * Match the exact account rather than the role: several demo accounts can
   * legitimately share one permission set. Staff roles outside these six
   * personas fall back to their real platform label instead of appearing as a
   * signed-out visitor.
   */
  const matchedRole = DEMO_PERSONAS.find(
    (persona) =>
      persona.userId ? persona.userId === currentUser?.id : !currentUser,
  );
  const currentRoleObj = matchedRole ?? {
    label: roleLabel(platformRole),
    desc: t("shell.demoRoleSwitcher.roleHorsPersonasDemo"),
    Icon: Shield,
    iconClassName: "text-stone-400",
  };

  const handlePersonaSwitch = async (persona: DemoPersona) => {
    const isActive = persona.userId
      ? persona.userId === currentUser?.id
      : !currentUser;
    if (isActive) {
      setIsOpen(false);
      return;
    }

    setSwitchingUserKey(persona.userKey);
    try {
      await switchDemoUser(persona.userKey);
      setIsOpen(false);
      toast.success(
        persona.userKey === "guest"
          ? t("shell.demoRoleSwitcher.guestActivated")
          : t("shell.demoRoleSwitcher.personaActivated", {
              profile: persona.label.replace(/^\d+\.\s*/, ""),
            }),
        t("shell.demoRoleSwitcher.sessionUpdated"),
      );
    } catch {
      toast.error(
        t("shell.demoRoleSwitcher.switchFailed"),
        t("shell.demoRoleSwitcher.sessionUnchanged"),
      );
    } finally {
      setSwitchingUserKey(null);
    }
  };

  return (
    /* `z-drawer` follows the same tier as the mobile drawer: above page chrome
       (the sticky header is `z-header`), below modals and toasts (`z-modal`).

       It was `z-header`. Because this element is positioned, that created a
       stacking context, which trapped the dropdown's own `z-modal` inside it — so
       the menu competed with the header as a `z-header` sibling and lost on DOM
       order, since the header comes later. The role list rendered underneath
       the header and its first entry was unreadable. */
    <div className="bg-stone-900 text-stone-200 text-xs py-1.5 px-4 border-b border-stone-800 relative z-drawer">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-white text-micro font-bold px-2 py-1 rounded tracking-wider uppercase">
            {t("shell.demoRoleSwitcher.modeDemo")}
          </span>
          <span className="hidden sm:inline text-stone-400">
            {t("shell.demoRoleSwitcher.testerLes6ProfilsEt")}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls="demo-persona-menu"
            aria-busy={Boolean(switchingUserKey)}
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-white px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-stone-700"
          >
            <currentRoleObj.Icon
              className={`w-4 h-4 shrink-0 ${currentRoleObj.iconClassName}`}
              aria-hidden="true"
            />
            <span className="font-semibold">
              {currentRoleObj.label.split("(")[0]}
            </span>
            {currentUser && (
              <span className="text-stone-400 hidden md:inline">
                ({currentUser.name})
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {isOpen && (
            <div
              id="demo-persona-menu"
              role="menu"
              aria-label={t("shell.demoRoleSwitcher.changerDeRolePourTester")}
              className="absolute right-0 mt-1 w-[calc(100vw-24px)] max-w-xs sm:w-80 bg-white text-stone-900 rounded-xl shadow-dropdown border border-stone-200 py-1.5 z-popover animate-in fade-in zoom-in-95 duration-fast"
            >
              <div className="px-3 py-1.5 border-b border-stone-100 text-xs font-bold text-stone-400 uppercase tracking-wider">
                {t("shell.demoRoleSwitcher.changerDeRolePourTester")}
              </div>
              {DEMO_PERSONAS.map((persona) => {
                const isActive = persona.userId
                  ? persona.userId === currentUser?.id
                  : !currentUser;
                const isSwitching = switchingUserKey === persona.userKey;
                return (
                  <button
                    key={persona.userKey}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    aria-busy={isSwitching}
                    disabled={Boolean(switchingUserKey)}
                    onClick={() => void handlePersonaSwitch(persona)}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-stone-50 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary-light text-primary"
                        : "text-stone-800"
                    } disabled:cursor-wait disabled:opacity-70`}
                  >
                    <persona.Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${persona.iconClassName}`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{persona.label}</span>
                        {isSwitching ? (
                          <LoaderCircle
                            className="w-3.5 h-3.5 text-primary animate-spin"
                            aria-hidden="true"
                          />
                        ) : isActive ? (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : null}
                      </div>
                      <div className="text-xs text-stone-400 font-normal leading-tight mt-0.5">
                        {persona.desc}
                      </div>
                    </div>
                  </button>
                );
              })}

              <div className="border-t border-stone-100 my-1 pt-1">
                <div className="px-3 py-1 text-micro font-bold text-stone-400 uppercase tracking-wider">
                  {t("shell.demoRoleSwitcher.accesDirectAuxProfilsPublics")}
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
                    {t("shell.demoRoleSwitcher.0AnnonceParticulier")}
                  </a>
                  <a
                    href="/boutique/optique-des-arts"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-stone-100 text-stone-600 truncate"
                  >
                    {t("shell.demoRoleSwitcher.0AnnoncePro")}
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
                    {t("shell.demoRoleSwitcher.profilSuspenduSecurite")}
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
