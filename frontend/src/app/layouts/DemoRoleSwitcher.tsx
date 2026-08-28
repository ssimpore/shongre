import React, { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { roleLabel } from "../../security/roles.config";
import {
  Shield,
  Sparkles,
  User,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CarFront,
  ChevronDown,
  Check,
  GraduationCap,
  LoaderCircle,
  Database,
  Target,
  ReceiptText,
} from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import { useToast } from "../providers/ToastProvider";
import { Link, useNavigate } from "react-router-dom";
import { routes } from "../../configuration/routes";
import { DataModeSettingsControl } from "./DataModeSettingsControl";
import { useDataMode } from "../providers/DataModeProvider";

interface DemoPersona {
  userKey: string;
  userId?: string;
  label?: string;
  labelKey?: MessageKey;
  desc?: string;
  descKey?: MessageKey;
  group: "marketplace" | "verticals" | "staff";
  destination?: string;
  Icon: LucideIcon;
  iconClassName: string;
}

const PERSONA_GROUP_LABELS: Record<DemoPersona["group"], string> = {
  marketplace: "Parcours marketplace",
  verticals: "Offres Pro par métier",
  staff: "Équipe Shongre",
};

const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    userKey: "guest",
    label: "1. Visiteur non connecté",
    desc: "Navigation publique, recherche, découverte sans compte",
    group: "marketplace",
    Icon: User,
    iconClassName: "text-stone-400",
  },
  {
    userKey: "buyer_thomas",
    userId: "user_thomas",
    label: "2. Acheteur Particulier (Thomas)",
    desc: "Favoris, offres, achats, messagerie acheteur",
    group: "marketplace",
    Icon: User,
    iconClassName: "text-info",
  },
  {
    userKey: "seller_camille",
    userId: "user_camille",
    label: "3. Vendeur Particulier (Camille)",
    desc: "Publication, gestion d'annonces, offres reçues",
    group: "marketplace",
    Icon: Sparkles,
    iconClassName: "text-warning",
  },
  {
    userKey: "pro_atelier",
    userId: "user_pro_atelier",
    label: "4. Vendeur Pro (Atelier Nordique SAS)",
    desc: "Boutique Pro, SIRET, catalogue, statistiques avancées",
    group: "marketplace",
    Icon: Briefcase,
    iconClassName: "text-primary",
  },
  {
    userKey: "standalone_trial_owner",
    userId: "user_standalone_trial_owner",
    label: "5. Prospects autonome (Amina · Nova Croissance)",
    desc: "Essai SaaS indépendant · ICP, découverte, listes et pipeline",
    group: "marketplace",
    destination: routes.prospects.workspace(),
    Icon: Target,
    iconClassName: "text-primary",
  },
  {
    userKey: "standalone_facturation_owner",
    userId: "user_standalone_facturation_owner",
    label: "6. Facturation autonome (Léa · Studio Rivage)",
    desc: "Compte et organisation dédiés uniquement à la facturation",
    group: "marketplace",
    destination: routes.facturation.workspace(),
    Icon: ReceiptText,
    iconClassName: "text-primary",
  },
  {
    userKey: "pro_immo_clara",
    userId: "user_immo_clara",
    label: "5. Pro Immobilier (Clara · Agence Canopée)",
    desc: "Agency Growth · biens, leads, visites et statistiques",
    group: "verticals",
    destination: routes.immo.workspace(),
    Icon: Building2,
    iconClassName: "text-category-real-estate",
  },
  {
    userKey: "pro_auto_michel",
    userId: "user_dealer_owner",
    label: "6. Pro Automobile (Michel · Auto Select Lyon)",
    desc: "Dealer Growth · stock, leads, essais et statistiques",
    group: "verticals",
    destination: routes.auto.workspace(),
    Icon: CarFront,
    iconClassName: "text-category-vehicles",
  },
  {
    userKey: "pro_courses_sophie",
    userId: "user_tutor_sophie",
    labelKey: "verticals.education.demoPersona",
    desc: "Organisme · offres, demandes, CRM et statistiques",
    group: "verticals",
    destination: routes.courses.organization(),
    Icon: GraduationCap,
    iconClassName: "text-category-services",
  },
  {
    userKey: "pro_employment_clara",
    userId: "user_employment_clara",
    label: "8. Pro Emploi (Clara · TechNova)",
    desc: "Employer Growth · offres, candidatures, entretiens et statistiques",
    group: "verticals",
    destination: routes.employment.recruiterWorkspace(),
    Icon: BriefcaseBusiness,
    iconClassName: "text-category-jobs",
  },
  {
    userKey: "support_hugo",
    userId: "user_support_hugo",
    label: "9. Support Shongre (Hugo)",
    desc: "Dossiers support et consultation limitée des comptes",
    group: "staff",
    destination: "/admin/support",
    Icon: Shield,
    iconClassName: "text-info",
  },
  {
    userKey: "moderator_claire",
    userId: "user_mod_claire",
    label: "10. Modérateur Shongre (Claire)",
    desc: "Validation annonces et traitement des signalements",
    group: "staff",
    destination: routes.admin.moderation(),
    Icon: Shield,
    iconClassName: "text-indigo-600",
  },
  {
    userKey: "trust_nadia",
    userId: "user_trust_nadia",
    label: "11. Trust & Safety (Nadia)",
    desc: "Conformité, restrictions de compte et audit",
    group: "staff",
    destination: routes.admin.verifications(),
    Icon: Shield,
    iconClassName: "text-danger",
  },
  {
    userKey: "compliance_samia",
    userId: "user_compliance_samia",
    label: "12. Conformité (Samia)",
    desc: "Revues manuelles, politiques KYC/KYB et journal d’audit",
    group: "staff",
    destination: routes.admin.verifications(),
    Icon: Shield,
    iconClassName: "text-violet-600",
  },
  {
    userKey: "finance_marc",
    userId: "user_finance_marc",
    label: "13. Finance Shongre (Marc)",
    desc: "Revenus, transactions, remboursements et rapprochement",
    group: "staff",
    destination: routes.admin.finance(),
    Icon: Shield,
    iconClassName: "text-success",
  },
  {
    userKey: "ops_elena",
    userId: "user_ops_elena",
    label: "14. Opérations Shongre (Elena)",
    desc: "Santé des fournisseurs et opérations de marché",
    group: "staff",
    destination: routes.admin.providers(),
    Icon: Shield,
    iconClassName: "text-warning",
  },
  {
    userKey: "commercial_lea",
    userId: "user_commercial_lea",
    labelKey: "shell.demoRoleSwitcher.commercialLabel",
    descKey: "shell.demoRoleSwitcher.commercialDescription",
    group: "staff",
    destination: routes.admin.crm(),
    Icon: BriefcaseBusiness,
    iconClassName: "text-fuchsia-600",
  },
  {
    userKey: "admin_antoine",
    userId: "user_admin_antoine",
    label: "16. Administrateur Système (Antoine)",
    desc: "Configuration, marchés, plans et fournisseurs",
    group: "staff",
    destination: routes.admin.overview(),
    Icon: Shield,
    iconClassName: "text-success",
  },
  {
    userKey: "super_admin_alex",
    userId: "user_super_admin_alex",
    label: "17. Propriétaire Gouvernance (Alexandre)",
    desc: "Permissions, rôles, identifiants sensibles et audit",
    group: "staff",
    destination: routes.admin.roles(),
    Icon: Shield,
    iconClassName: "text-violet-600",
  },
];

const DemoRoleSwitcherContent: React.FC<{ utility?: ReactNode }> = ({
  utility,
}) => {
  const { t } = useTranslation();
  const { platformRole, currentUser, switchDemoUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingUserKey, setSwitchingUserKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const activeItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitemradio"][aria-checked="true"]',
    );
    activeItem?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  /**
   * Match the exact account rather than the role: several demo accounts can
   * legitimately share one permission set. Staff roles outside these six
   * personas fall back to their real platform label instead of appearing as a
   * signed-out visitor.
   */
  const personaLabel = (persona: DemoPersona) =>
    persona.labelKey ? t(persona.labelKey) : (persona.label ?? persona.userKey);
  const personaDescription = (persona: DemoPersona) =>
    persona.descKey ? t(persona.descKey) : (persona.desc ?? "");
  const matchedRole = DEMO_PERSONAS.find((persona) =>
    persona.userId ? persona.userId === currentUser?.id : !currentUser,
  );
  const currentRoleObj = matchedRole
    ? { ...matchedRole, label: personaLabel(matchedRole) }
    : {
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
      if (persona.destination) navigate(persona.destination);
      return;
    }

    setSwitchingUserKey(persona.userKey);
    try {
      await switchDemoUser(persona.userKey);
      setIsOpen(false);
      if (persona.destination) navigate(persona.destination);
      toast.success(
        persona.userKey === "guest"
          ? t("shell.demoRoleSwitcher.guestActivated")
          : t("shell.demoRoleSwitcher.personaActivated", {
              profile: personaLabel(persona).replace(/^\d+\.\s*/, ""),
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

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]:not(:disabled)',
      ) ?? [],
    );
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowUp"
            ? (currentIndex - 1 + items.length) % items.length
            : (currentIndex + 1) % items.length;
    items[nextIndex]?.focus();
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
            {t("shell.demoRoleSwitcher.testerLesProfilsEtParcours")}
          </span>
          <DataModeSettingsControl />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {utility}
          <div ref={containerRef} className="relative min-w-0">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              aria-controls="demo-persona-menu"
              aria-busy={Boolean(switchingUserKey)}
              className="flex min-w-0 max-w-full items-center gap-2 rounded-md border border-stone-700 bg-stone-800 px-2.5 py-1 text-white transition-colors hover:bg-stone-700 cursor-pointer"
            >
              <currentRoleObj.Icon
                className={`w-4 h-4 shrink-0 ${currentRoleObj.iconClassName}`}
                aria-hidden="true"
              />
              <span className="truncate font-semibold">
                {currentRoleObj.label.split("(")[0]}
              </span>
              {currentUser && (
                <span className="text-stone-400 hidden md:inline">
                  ({currentUser.name})
                </span>
              )}
              <ChevronDown className="w-icon-sm h-icon-sm text-stone-400" />
            </button>

            {isOpen && (
              <div
                ref={menuRef}
                id="demo-persona-menu"
                role="menu"
                aria-label={t("shell.demoRoleSwitcher.changerDeRolePourTester")}
                onKeyDown={handleMenuKeyDown}
                className="absolute right-0 mt-1 w-viewport-popover-max max-w-xs overflow-y-auto overscroll-contain rounded-card border border-border-base bg-bg-surface py-1.5 text-stone-900 shadow-dropdown sm:w-80 z-popover max-h-menu-max animate-in fade-in zoom-in-95 duration-fast"
              >
                <div className="sticky top-0 z-raised border-b border-border-subtle bg-bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                  {t("shell.demoRoleSwitcher.changerDeRolePourTester")}
                </div>
                {DEMO_PERSONAS.map((persona, index) => {
                  const isActive = persona.userId
                    ? persona.userId === currentUser?.id
                    : !currentUser;
                  const isSwitching = switchingUserKey === persona.userKey;
                  return (
                    <React.Fragment key={persona.userKey}>
                      {(index === 0 ||
                        DEMO_PERSONAS[index - 1].group !== persona.group) && (
                        <div
                          role="presentation"
                          className="border-b border-border-subtle bg-bg-subtle px-3 py-1 text-micro font-bold uppercase tracking-wider text-text-muted"
                        >
                          {PERSONA_GROUP_LABELS[persona.group]}
                        </div>
                      )}
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        aria-busy={isSwitching}
                        disabled={Boolean(switchingUserKey)}
                        onClick={() => void handlePersonaSwitch(persona)}
                        className={`touch-row w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-stone-50 cursor-pointer ${
                          isActive
                            ? "bg-primary-light text-primary"
                            : "text-stone-800"
                        } disabled:cursor-wait disabled:opacity-70`}
                      >
                        <persona.Icon
                          className={`mt-0.5 h-icon-md w-icon-md shrink-0 ${persona.iconClassName}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2 text-xs font-bold">
                            <span>{personaLabel(persona)}</span>
                            {isSwitching ? (
                              <LoaderCircle
                                className="h-icon-sm w-icon-sm shrink-0 animate-spin text-primary"
                                aria-hidden="true"
                              />
                            ) : isActive ? (
                              <Check className="h-icon-sm w-icon-sm shrink-0 text-primary" />
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-xs font-normal leading-tight text-stone-400">
                            {personaDescription(persona)}
                          </div>
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })}

                <div className="border-t border-stone-100 my-1 pt-1">
                  <div className="px-3 py-1 text-micro font-bold text-stone-400 uppercase tracking-wider">
                    {t("shell.demoRoleSwitcher.accesDirectAuxProfilsPublics")}
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-2 pb-1 text-xs">
                    <Link
                      to={routes.seller.profile("camille-martin")}
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded hover:bg-stone-100 font-semibold text-stone-700 truncate"
                    >
                      👤 Camille (Particulier)
                    </Link>
                    <Link
                      to={routes.seller.storefront("atelier-nordique")}
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded hover:bg-stone-100 font-semibold text-primary truncate"
                    >
                      🏬 Atelier Nordique (Pro)
                    </Link>
                    <Link
                      to={routes.seller.profile("marion-dupuis")}
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded hover:bg-stone-100 text-stone-600 truncate"
                    >
                      {t("shell.demoRoleSwitcher.0AnnonceParticulier")}
                    </Link>
                    <Link
                      to={routes.seller.storefront("optique-des-arts")}
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded hover:bg-stone-100 text-stone-600 truncate"
                    >
                      {t("shell.demoRoleSwitcher.0AnnoncePro")}
                    </Link>
                    <Link
                      to={routes.seller.profile("lucas-bernard")}
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded hover:bg-stone-100 text-stone-600 truncate"
                    >
                      ⭐ 0 avis (Nouveau)
                    </Link>
                    <Link
                      to={routes.seller.profile("vendeur-suspendu")}
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded hover:bg-danger-surface text-danger truncate"
                    >
                      {t("shell.demoRoleSwitcher.profilSuspenduSecurite")}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveModeToolbar: React.FC<{ utility?: ReactNode }> = ({ utility }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  return (
    <div className="relative z-drawer border-b border-emerald-950 bg-emerald-950 px-4 py-1.5 text-xs text-emerald-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded bg-success px-2 py-1 text-micro font-bold uppercase tracking-wider text-white">
            <Database className="h-icon-xs w-icon-xs" aria-hidden="true" />
            {t("shell.dataMode.modeLive")}
          </span>
          <span className="hidden truncate text-emerald-200 sm:inline">
            {t("shell.dataMode.liveSummary")}
          </span>
          <DataModeSettingsControl />
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">
          {utility}
          {currentUser ? (
            <span className="truncate font-semibold text-white">
              {currentUser.name}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Persona simulation exists only in Demo mode. Live mode keeps the same shell
// position for an unambiguous source indicator and exposes settings only to
// accounts carrying the central administration permission.
export const DemoRoleSwitcher: React.FC<{ utility?: ReactNode }> = ({
  utility,
}) => {
  const { mode } = useDataMode();
  return mode === "demo" ? (
    <DemoRoleSwitcherContent utility={utility} />
  ) : (
    <LiveModeToolbar utility={utility} />
  );
};
