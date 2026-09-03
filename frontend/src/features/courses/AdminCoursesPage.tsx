import React, { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Lock,
  Save,
  Settings2,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  CourseCatalog,
  CourseFeatureFlags,
  CourseMarketConfig,
  CoursePlan,
  CourseSubject,
} from "@shongre/contracts/courses";
import { COURSE_CONSTRAINTS } from "@shongre/contracts/courses";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Input,
  ProgressBar,
  Skeleton,
  Switch,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";

type Tab = "overview" | "taxonomy" | "plans" | "settings";

const FLAG_LABELS: Record<keyof CourseFeatureFlags, string> = {
  learnerRequestsEnabled: "Demandes guidées d’élèves",
  qualifiedLeadsEnabled: "Routage des demandes qualifiées",
  bookingEnabled: "Réservations de cours — Phase 2",
  paymentsEnabled: "Paiements — Phase 2",
  payoutsEnabled: "Versements professeurs — Phase 2",
  packagesEnabled: "Forfaits multi-cours — Phase 2",
  recurringLessonsEnabled: "Cours récurrents — Phase 2",
};

export const AdminCoursesPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const { formatMoneyMinor } = useRegionalFormatters();
  const toast = useToast();
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [config, setConfig] = useState<CourseMarketConfig | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [isSaving, setIsSaving] = useState(false);

  usePageMeta({
    title: t("verticals.education.adminTitle"),
    description: t("verticals.education.adminDescription"),
    canonicalPath: "/admin/education",
    noIndex: true,
  });

  const load = () => {
    services.courses
      .getAdminCatalog(activeMarket.code)
      .then((next) => {
        setCatalog(next);
        setConfig(next.config);
      })
      .catch(() => toast.error(t("verticals.education.adminLoadError")));
  };

  useEffect(load, [activeMarket.code, toast]);

  const saveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const updated = await services.courses.updateMarketConfig(
        activeMarket.code,
        config,
      );
      setConfig(updated);
      setCatalog((current) =>
        current ? { ...current, config: updated } : current,
      );
      toast.success(t("verticals.education.adminSaved"));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Enregistrement impossible.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSubject = async (subject: CourseSubject) => {
    try {
      const updated = await services.courses.updateSubject(
        activeMarket.code,
        subject.id,
        { isActive: !subject.isActive },
      );
      setCatalog((current) =>
        current
          ? {
              ...current,
              subjects: current.subjects.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      toast.success(
        `${updated.label} ${updated.isActive ? "activée" : "désactivée"}.`,
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Modification impossible.",
      );
    }
  };

  const updatePlan = async (
    plan: CoursePlan,
    patch: Parameters<typeof services.courses.updatePlan>[2],
  ) => {
    try {
      const updated = await services.courses.updatePlan(
        activeMarket.code,
        plan.id,
        patch,
      );
      setCatalog((current) =>
        current
          ? {
              ...current,
              plans: current.plans.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      toast.success(`Formule ${updated.name} mise à jour.`);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Modification impossible.",
      );
    }
  };

  if (!catalog || !config)
    return <Skeleton className="h-168 w-full rounded-card" />;

  const phase2Enabled = Object.entries(config.featureFlags)
    .filter(([key]) =>
      [
        "bookingEnabled",
        "paymentsEnabled",
        "payoutsEnabled",
        "packagesEnabled",
        "recurringLessonsEnabled",
      ].includes(key),
    )
    .some(([, value]) => value);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-text-main sm:text-2xl">
              {t("verticals.education.brand")}
            </h1>
            <Badge variant={config.isEnabled ? "success" : "neutral"}>
              {activeMarket.name} · {config.isEnabled ? "Actif" : "Inactif"}
            </Badge>
            <Badge variant="primary">Schéma v{config.schemaVersion}</Badge>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Taxonomie, formules, demandes qualifiées, sécurité et activation par
            marché.
          </p>
        </div>
        <Button
          onClick={saveConfig}
          isLoading={isSaving}
          leftIcon={<Save className="h-icon-sm w-icon-sm" />}
        >
          Enregistrer la configuration
        </Button>
      </header>

      <nav
        aria-label={t("verticals.education.adminSections")}
        className="flex gap-1 overflow-x-auto rounded-card border border-border-base bg-bg-surface p-1 shadow-xs"
      >
        {[
          ["overview", BarChart3, "Vue d’ensemble"],
          ["taxonomy", GraduationCap, "Matières & niveaux"],
          ["plans", CreditCard, "Formules & options"],
          ["settings", Settings2, "Règles & sécurité"],
        ].map(([value, Icon, label]) => {
          const TabIcon = Icon as React.ComponentType<{ className?: string }>;
          return (
            <button
              key={String(value)}
              type="button"
              onClick={() => setTab(value as Tab)}
              className={`flex min-h-control-touch shrink-0 items-center gap-2 rounded-control px-4 text-xs font-semibold ${tab === value ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-subtle"}`}
            >
              <TabIcon className="h-icon-sm w-icon-sm" aria-hidden="true" />
              {String(label)}
            </button>
          );
        })}
      </nav>

      {tab === "overview" && (
        <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [Users, "Professeurs actifs", "1 248", "+8,4 % sur 30 jours"],
              [BookOpen, "Cours publiés", "2 936", "94 en modération"],
              [
                Sparkles,
                "Demandes qualifiées",
                "684",
                "71 % acceptées ou vues",
              ],
              [
                CheckCircle2,
                "Profils vérifiés",
                "43 %",
                "Identité ou organisme",
              ],
            ].map(([Icon, label, value, note]) => {
              const MetricIcon = Icon as React.ComponentType<{
                className?: string;
              }>;
              return (
                <article
                  key={String(label)}
                  className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
                >
                  <MetricIcon
                    className="h-icon-md w-icon-md text-primary"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-micro font-bold uppercase tracking-wide text-text-muted">
                    {String(label)}
                  </p>
                  <p className="mt-1 text-xl font-bold text-text-main">
                    {String(value)}
                  </p>
                  <p className="mt-1 text-micro text-text-secondary">
                    {String(note)}
                  </p>
                </article>
              );
            })}
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
              <h2 className="text-sm font-bold text-text-main">
                Qualité des demandes
              </h2>
              <div className="mt-4 space-y-4">
                {[
                  ["Matière + niveau compatibles", 94],
                  ["Créneau compatible", 82],
                  ["Zone ou visio compatible", 91],
                  ["Budget compatible", 76],
                ].map(([label, percent]) => (
                  <div key={String(label)}>
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-text-secondary">
                        {String(label)}
                      </span>
                      <span className="font-bold text-text-main">
                        {Number(percent)} %
                      </span>
                    </div>
                    <ProgressBar
                      value={Number(percent)}
                      label={`${String(label)} : ${Number(percent)} %`}
                      className="mt-1.5"
                    />
                  </div>
                ))}
              </div>
            </section>
            <section
              className={`rounded-card border p-5 shadow-xs ${phase2Enabled ? "border-danger-border bg-danger-surface" : "border-warning-border bg-warning-surface"}`}
            >
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-main">
                {phase2Enabled ? (
                  <ShieldAlert className="h-icon-md w-icon-md text-danger" />
                ) : (
                  <Lock className="h-icon-md w-icon-md text-warning" />
                )}
                État de la Phase 2
              </h2>
              <p className="mt-3 text-sm font-bold text-text-main">
                {phase2Enabled
                  ? "Activation partielle détectée"
                  : "Réservations et paiements désactivés"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                L’activation marché exige l’onboarding du prestataire de
                paiement, les webhooks idempotents, la fiscalité, la
                facturation, les annulations, les litiges et les versements
                vérifiés.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setTab("settings")}
              >
                Voir les garde-fous
              </Button>
            </section>
          </div>
        </div>
      )}

      {tab === "taxonomy" && (
        <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
          <div className="border-b border-border-subtle p-5">
            <h2 className="text-sm font-bold text-text-main">
              Matières actives en {activeMarket.name}
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Les niveaux autorisés pilotent le formulaire professeur et les
              filtres élèves.
            </p>
          </div>
          <div className="grid gap-px bg-border-subtle sm:grid-cols-2 xl:grid-cols-3">
            {catalog.subjects.map((subject) => (
              <article
                key={subject.id}
                className="flex items-start justify-between gap-3 bg-bg-surface p-4"
              >
                <div>
                  <p className="text-xs font-bold text-text-main">
                    {subject.label}
                  </p>
                  <p className="mt-1 text-micro text-text-muted">
                    {subject.levelIds.length} niveaux · {subject.slug}
                  </p>
                </div>
                <Switch
                  label={`${subject.isActive ? "Désactiver" : "Activer"} ${subject.label}`}
                  checked={subject.isActive}
                  onChange={() => toggleSubject(subject)}
                />
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "plans" && (
        <div className="space-y-5">
          <section className="grid gap-4 lg:grid-cols-2">
            {catalog.plans.map((plan) => (
              <article
                key={plan.id}
                className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-text-main">
                        {plan.name}
                      </h2>
                      {plan.isRecommended && (
                        <Badge variant="primary">Recommandé</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">
                      {plan.description}
                    </p>
                  </div>
                  <Switch
                    label={`${plan.isActive ? "Désactiver" : "Activer"} ${plan.name}`}
                    checked={plan.isActive}
                    onChange={() =>
                      updatePlan(plan, { isActive: !plan.isActive })
                    }
                  />
                </div>
                <p className="mt-4 text-lg font-bold text-text-main">
                  {plan.monthlyPrice
                    ? formatMoneyMinor(
                        plan.monthlyPrice.amountMinor,
                        plan.monthlyPrice.currency,
                      )
                    : "Gratuit"}
                  {plan.monthlyPrice && (
                    <span className="text-xs font-medium text-text-muted">
                      {" "}
                      / mois
                    </span>
                  )}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border-subtle pt-4 text-xs">
                  <div>
                    <dt className="text-text-muted">Cours</dt>
                    <dd className="mt-1 font-bold">
                      {plan.entitlements.maxActiveOffers}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Leads / mois</dt>
                    <dd className="mt-1 font-bold">
                      {plan.entitlements.maxMonthlyLeads}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Équipe</dt>
                    <dd className="mt-1 font-bold">
                      {plan.entitlements.teamMembers}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updatePlan(plan, {
                        entitlements: {
                          ...plan.entitlements,
                          maxMonthlyLeads:
                            plan.entitlements.maxMonthlyLeads + 5,
                        },
                      })
                    }
                  >
                    +5 leads / mois
                  </Button>
                  {plan.entitlements.maxMonthlyLeads >= 5 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updatePlan(plan, {
                          entitlements: {
                            ...plan.entitlements,
                            maxMonthlyLeads:
                              plan.entitlements.maxMonthlyLeads - 5,
                          },
                        })
                      }
                    >
                      −5 leads
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </section>
          <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
            <h2 className="text-sm font-bold text-text-main">
              Options à la carte
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {catalog.addOns.map((addOn) => (
                <div
                  key={addOn.id}
                  className="rounded-card border border-border-subtle p-3"
                >
                  <p className="text-xs font-bold text-text-main">
                    {addOn.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-primary">
                    {formatMoneyMinor(
                      addOn.price.amountMinor,
                      addOn.price.currency,
                    )}
                  </p>
                  <p className="mt-1 text-micro text-text-muted">
                    {addOn.validityDays
                      ? `${addOn.validityDays} jours`
                      : addOn.creditQuantity
                        ? `${addOn.creditQuantity} crédit`
                        : "À l’unité"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid gap-5 xl:grid-cols-content-aside-lg">
          <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
            <h2 className="text-sm font-bold text-text-main">
              Fonctionnalités du marché {activeMarket.name}
            </h2>
            <div className="mt-4 divide-y divide-border-subtle">
              {(
                Object.keys(config.featureFlags) as (keyof CourseFeatureFlags)[]
              ).map((key) => {
                const phase2 = [
                  "bookingEnabled",
                  "paymentsEnabled",
                  "payoutsEnabled",
                  "packagesEnabled",
                  "recurringLessonsEnabled",
                ].includes(key);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-text-main">
                        {FLAG_LABELS[key]}
                      </p>
                      {phase2 && (
                        <p className="mt-0.5 text-micro text-warning">
                          Activation réglementée, enregistrée dans l’audit
                        </p>
                      )}
                    </div>
                    <Switch
                      label={`${config.featureFlags[key] ? "Désactiver" : "Activer"} ${FLAG_LABELS[key]}`}
                      checked={config.featureFlags[key]}
                      onChange={() =>
                        setConfig({
                          ...config,
                          featureFlags: {
                            ...config.featureFlags,
                            [key]: !config.featureFlags[key],
                          },
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid gap-4 border-t border-border-subtle pt-5 sm:grid-cols-2">
              <label className="text-xs font-semibold text-text-main">
                Validité demande (jours)
                <Input
                  className="mt-2"
                  type="number"
                  min={COURSE_CONSTRAINTS.validity.min}
                  value={config.learnerRequestValidityDays}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      learnerRequestValidityDays: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-semibold text-text-main">
                Validité lead (heures)
                <Input
                  className="mt-2"
                  type="number"
                  min={COURSE_CONSTRAINTS.validity.min}
                  value={config.leadValidityHours}
                  onChange={(event) =>
                    setConfig({
                      ...config,
                      leadValidityHours: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
          </section>
          <aside className="space-y-4">
            <section className="rounded-card border border-warning-border bg-warning-surface p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-main">
                <ShieldAlert className="h-icon-md w-icon-md text-warning" />
                Garde-fous Phase 2
              </h2>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-secondary">
                <li>• Paiement impossible sans réservation et versements.</li>
                <li>• Aucun prix en virgule flottante : centimes + devise.</li>
                <li>• Webhooks, remboursements et litiges idempotents.</li>
                <li>• Avis uniquement après interaction vérifiée.</li>
                <li>
                  • Fiscalité et onboarding prestataire requis par marché.
                </li>
              </ul>
            </section>
            <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
              <h2 className="text-sm font-bold text-text-main">
                Sécurité & mineurs
              </h2>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-secondary">
                {config.safetyGuidance.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <p className="mt-4 border-t border-border-subtle pt-3 text-micro text-text-muted">
                Âge mineur configuré : moins de {config.minorAgeThreshold} ans ·
                consentement responsable obligatoire.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};
