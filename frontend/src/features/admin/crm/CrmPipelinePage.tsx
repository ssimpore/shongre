import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  XCircle,
} from "lucide-react";
import type {
  CrmAccount,
  CrmOpportunity,
  CrmPipeline,
  CrmPipelineStage,
} from "@shongre/contracts/crm";
import { CRM_FIELD_CONSTRAINTS } from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { ProgressBar, ScrollRail, Skeleton } from "../../../design-system";
import { useToast } from "../../../app/providers/ToastProvider";
import { useTranslation } from "../../../i18n/I18nProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { useCrmSurface } from "../../crm/CrmSurfaceContext";
import { forecastCategoryMessageKey } from "../../../domains/crm/crm.labels";

function money(amountMinor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

const columnTone: Record<string, string> = {
  blue: "bg-info",
  teal: "bg-cyan-500",
  amber: "bg-amber-500",
  orange: "bg-primary",
  red: "bg-danger",
  green: "bg-success",
  neutral: "bg-stone-400",
};

const columnProgressVariant: Record<
  string,
  "primary" | "success" | "warning" | "danger" | "info"
> = {
  blue: "info",
  teal: "info",
  amber: "warning",
  orange: "primary",
  red: "danger",
  green: "success",
  neutral: "primary",
};

interface ClosingState {
  opportunity: CrmOpportunity;
  stage: CrmPipelineStage;
}

export const CrmPipelinePage: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket, currentLocale } = useMarketLocation();
  const crmPaths = useCrmSurface();
  const toast = useToast();
  // The board previously mapped `commit` and labelled the other four forecast
  // members "Pipeline", so a best-case, closed or omitted deal read as ordinary
  // pipeline on the card an operator scans fastest.
  const forecastLabel = (category: string) => {
    const key = forecastCategoryMessageKey(category);
    return key ? t(key) : category;
  };
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [closing, setClosing] = useState<ClosingState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [amountMajor, setAmountMajor] = useState("588");
  const [expectedCloseDate, setExpectedCloseDate] = useState("2026-09-30");
  const [lossReason, setLossReason] = useState("");
  const [lossDetail, setLossDetail] = useState("");
  const [onboardingStatus, setOnboardingStatus] = useState("à_planifier");

  usePageMeta({
    title: t("meta.crmPipeline.title"),
    description: t("meta.crmPipeline.description"),
    canonicalPath: crmPaths.pipeline,
    noIndex: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [pipelineList, opportunityPage, accountPage] = await Promise.all([
        services.crm.listPipelines(),
        services.crm.listOpportunities({ limit: 100 }),
        services.crm.listAccounts({ limit: 100 }),
      ]);
      setPipelines(pipelineList);
      setSelectedPipelineId((current) => current || pipelineList[0]?.id || "");
      setOpportunities(opportunityPage.items);
      setAccounts(accountPage.items);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger le pipeline.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeMarket.code]);

  const pipeline =
    pipelines.find((item) => item.id === selectedPipelineId) ?? pipelines[0];
  const visibleOpportunities = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    const marketAccountIds = new Set(
      accounts
        .filter(
          (account) =>
            crmPaths.kind === "admin" ||
            account.marketCode === activeMarket.code,
        )
        .map((account) => account.id),
    );
    return opportunities.filter(
      (item) =>
        item.pipelineId === pipeline?.id &&
        (crmPaths.kind === "admin" ||
          (item.accountId ? marketAccountIds.has(item.accountId) : false)) &&
        (!query ||
          item.name.toLocaleLowerCase("fr").includes(query) ||
          item.accountName?.toLocaleLowerCase("fr").includes(query)),
    );
  }, [
    accounts,
    activeMarket.code,
    crmPaths.kind,
    opportunities,
    pipeline?.id,
    search,
  ]);
  const availableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          crmPaths.kind === "admin" || account.marketCode === activeMarket.code,
      ),
    [accounts, activeMarket.code, crmPaths.kind],
  );
  const pipelineValue = visibleOpportunities
    .filter((item) => item.status === "open")
    .reduce((sum, item) => sum + item.amount.amountMinor, 0);

  const moveToStage = async (
    opportunity: CrmOpportunity,
    stage: CrmPipelineStage,
  ) => {
    if (stage.isWon || stage.isLost) {
      setLossReason("");
      setLossDetail("");
      setClosing({ opportunity, stage });
      return;
    }
    try {
      const updated = await services.crm.transitionOpportunity(opportunity.id, {
        stageId: stage.id,
        expectedVersion: opportunity.version,
      });
      setOpportunities((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(
        `« ${opportunity.name} » est maintenant à l’étape ${stage.name}.`,
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Transition impossible.",
      );
    }
  };

  const createOpportunity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pipeline || !name.trim()) return;
    const firstStage = pipeline.stages.find((stage) => stage.isOpen);
    if (!firstStage) return;
    setSubmitting(true);
    try {
      const created = await services.crm.createOpportunity({
        pipelineId: pipeline.id,
        stageId: firstStage.id,
        name: name.trim(),
        accountId: accountId || undefined,
        amount: {
          amountMinor: Math.round(Number(amountMajor || 0) * 100),
          currency: activeMarket.currency,
        },
        expectedCloseDate: expectedCloseDate || undefined,
        source: "manual",
        forecastCategory: "pipeline",
      });
      setOpportunities((items) => [created, ...items]);
      setCreateOpen(false);
      setName("");
      setAccountId("");
      toast.success("L’opportunité a été ajoutée au pipeline.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Création impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const completeClosing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!closing) return;
    if (closing.stage.isLost && !lossReason) {
      toast.error("Sélectionnez un motif de perte.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await services.crm.transitionOpportunity(
        closing.opportunity.id,
        {
          stageId: closing.stage.id,
          expectedVersion: closing.opportunity.version,
          lossReason: closing.stage.isLost ? lossReason : undefined,
          lossDetail: closing.stage.isLost
            ? lossDetail || undefined
            : undefined,
          contractValue: closing.stage.isWon
            ? {
                amountMinor: closing.opportunity.amount.amountMinor,
                currency: closing.opportunity.amount.currency,
              }
            : undefined,
          onboardingStatus: closing.stage.isWon ? onboardingStatus : undefined,
        },
      );
      setOpportunities((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setClosing(null);
      toast.success(
        closing.stage.isWon
          ? "Opportunité gagnée et transmise à l’onboarding."
          : "Opportunité clôturée avec son motif de perte.",
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Clôture impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !pipeline) {
    return (
      <div
        className="space-y-4"
        aria-label={t("admin.crmPipelinePage.chargementDuPipelineCrm")}
      >
        <Skeleton className="h-32 rounded-2xl" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-96 w-72 shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-text-inverse shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link
              to={crmPaths.overview}
              className="mb-2 inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-text-disabled hover:text-text-inverse"
            >
              <ArrowLeft className="h-icon-sm w-icon-sm" aria-hidden="true" />{" "}
              Vue d’ensemble
            </Link>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {t("admin.crmOverviewPage.pipelineCommercial")}
            </h1>
            <p className="mt-1 text-sm text-text-disabled">
              {visibleOpportunities.length}{" "}
              {t("admin.crmPipelinePage.opportunites")}{" "}
              {money(pipelineValue, activeMarket.currency, currentLocale)}{" "}
              ouverts
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative min-w-52 flex-1 xl:flex-none">
              <span className="sr-only">
                {t("admin.crmPipelinePage.pipelineActif")}
              </span>
              <Select
                size="compact"
                className="w-full pl-3 pr-9 text-text-inverse"
                labelledByAncestor
                value={pipeline.id}
                onChange={(event) => setSelectedPipelineId(event.target.value)}
              >
                {pipelines.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-text-disabled"
                aria-hidden="true"
              />
            </label>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-icon-md w-icon-md" aria-hidden="true" />{" "}
              {t("admin.crmPipelinePage.nouvelleOpportunite")}
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border-base bg-bg-surface p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-icon-md w-icon-md -translate-y-1/2 text-text-disabled"
            aria-hidden="true"
          />
          <span className="sr-only">
            {t("admin.crmPipelinePage.rechercherUneOpportunite")}
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t(
              "admin.crmPipelinePage.rechercherUneOpportuniteOuUneEntreprise",
            )}
            className="h-control-md w-full rounded-control border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <SlidersHorizontal
              className="h-icon-md w-icon-md"
              aria-hidden="true"
            />{" "}
            Filtres
          </Button>
          <span className="hidden text-micro text-stone-500 sm:inline">
            {t(
              "admin.crmPipelinePage.utilisezLesFlechesSurChaqueCartePourDeplacerSansGlisser",
            )}
          </span>
        </div>
      </section>

      <ScrollRail
        label={t("admin.crmPipelinePage.colonnesDuPipelineCommercial")}
        className="flex min-h-96 items-start gap-3 pb-4"
      >
        {pipeline.stages.map((stage, stageIndex) => {
          const stageItems = visibleOpportunities.filter(
            (item) => item.stageId === stage.id,
          );
          const stageAmount = stageItems.reduce(
            (sum, item) => sum + item.amount.amountMinor,
            0,
          );
          return (
            <section
              key={stage.id}
              aria-labelledby={`stage-${stage.id}`}
              className="w-68 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100/80"
            >
              <div className="border-b border-stone-200 bg-bg-surface px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-pill ${columnTone[stage.colorToken] ?? "bg-stone-400"}`}
                      aria-hidden="true"
                    />
                    <h2
                      id={`stage-${stage.id}`}
                      className="truncate text-xs font-black text-text-main"
                    >
                      {stage.name}
                    </h2>
                    <span className="rounded-pill bg-stone-100 px-1.5 py-0.5 text-micro font-bold text-text-secondary">
                      {stageItems.length}
                    </span>
                  </div>
                  <strong className="text-micro font-black tabular-nums text-stone-700">
                    {money(stageAmount, activeMarket.currency, currentLocale)}
                  </strong>
                </div>
                <ProgressBar
                  value={stage.defaultProbability}
                  label={`Probabilité par défaut de l’étape ${stage.name}`}
                  variant={columnProgressVariant[stage.colorToken] ?? "primary"}
                  className="mt-2 h-1"
                />
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto p-2.5">
                {stageItems.length === 0 ? (
                  <div className="rounded-control border border-dashed border-stone-300 bg-bg-surface/60 px-3 py-8 text-center text-micro text-stone-500">
                    {t("admin.crmPipelinePage.aucuneOpportunite")}
                  </div>
                ) : (
                  stageItems.map((opportunity) => (
                    <article
                      key={opportunity.id}
                      className="rounded-control border border-stone-200 bg-bg-surface p-3 shadow-xs transition hover:-translate-y-px hover:shadow-sm"
                    >
                      <Link
                        to={crmPaths.opportunity(opportunity.id)}
                        className="block text-xs font-black leading-snug text-stone-950 hover:text-primary"
                      >
                        {opportunity.name}
                      </Link>
                      <div className="mt-1.5 flex items-center gap-1.5 text-micro text-stone-500">
                        <Building2
                          className="h-icon-xs w-icon-xs shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {opportunity.accountName ?? "Sans entreprise"}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-2 border-t border-stone-100 pt-2.5">
                        <div>
                          <strong className="block text-sm font-black tabular-nums text-stone-950">
                            {money(
                              opportunity.amount.amountMinor,
                              opportunity.amount.currency,
                              currentLocale,
                            )}
                          </strong>
                          <span className="text-micro text-stone-500">
                            {opportunity.probability}% ·{" "}
                            {forecastLabel(opportunity.forecastCategory)}
                          </span>
                        </div>
                        {opportunity.expectedCloseDate && (
                          <span className="inline-flex items-center gap-1 text-micro font-semibold text-stone-500">
                            <CalendarDays
                              className="h-icon-xs w-icon-xs"
                              aria-hidden="true"
                            />
                            {new Intl.DateTimeFormat(currentLocale, {
                              day: "numeric",
                              month: "short",
                            }).format(
                              new Date(
                                `${opportunity.expectedCloseDate}T12:00:00`,
                              ),
                            )}
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-stone-50 p-1">
                        <button
                          type="button"
                          disabled={stageIndex === 0}
                          onClick={() =>
                            stageIndex > 0 &&
                            void moveToStage(
                              opportunity,
                              pipeline.stages[stageIndex - 1],
                            )
                          }
                          aria-label={`Déplacer « ${opportunity.name} » vers l’étape précédente`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-stone-500 hover:bg-bg-surface hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-25"
                        >
                          <ArrowLeft
                            className="h-icon-sm w-icon-sm"
                            aria-hidden="true"
                          />
                        </button>
                        <span className="inline-flex min-w-0 items-center gap-1 text-micro text-stone-500">
                          <UserRound
                            className="h-icon-xs w-icon-xs shrink-0"
                            aria-hidden="true"
                          />
                          <span className="max-w-28 truncate">
                            {opportunity.ownerName ?? "Non assignée"}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={stageIndex === pipeline.stages.length - 1}
                          onClick={() =>
                            stageIndex < pipeline.stages.length - 1 &&
                            void moveToStage(
                              opportunity,
                              pipeline.stages[stageIndex + 1],
                            )
                          }
                          aria-label={`Déplacer « ${opportunity.name} » vers l’étape suivante`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-stone-500 hover:bg-bg-surface hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-25"
                        >
                          <ArrowRight
                            className="h-icon-sm w-icon-sm"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </ScrollRail>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("admin.crmPipelinePage.creerUneOpportunite")}
        description={`Ajout dans ${pipeline.name}`}
      >
        <form onSubmit={createOpportunity} className="space-y-4 text-xs">
          <FormField
            label={t("admin.crmPipelinePage.nomDeLOpportunite")}
            required
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex. Abonnement Shongre Pro Business"
              required
            />
          </FormField>
          <FormField label="Entreprise">
            <Select
              aria-label={t("admin.crmContactsPage.entrepriseAssociee")}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              options={[
                { value: "", label: t("admin.crmContactsPage.sansEntreprise") },
                ...availableAccounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
              ]}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label={`Montant estimé (${activeMarket.currency})`}
              required
            >
              <Input
                type="number"
                min={CRM_FIELD_CONSTRAINTS.opportunityAmountMin}
                step={CRM_FIELD_CONSTRAINTS.opportunityAmountStep}
                value={amountMajor}
                onChange={(event) => setAmountMajor(event.target.value)}
                required
              />
            </FormField>
            <FormField label={t("admin.crmPipelinePage.cloturePrevue")}>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(event) => setExpectedCloseDate(event.target.value)}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting ? "Création…" : "Créer l’opportunité"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(closing)}
        onClose={() => setClosing(null)}
        title={
          closing?.stage.isWon ? "Marquer comme gagnée" : "Marquer comme perdue"
        }
        description={closing?.opportunity.name}
      >
        {closing && (
          <form onSubmit={completeClosing} className="space-y-4 text-xs">
            <div
              className={`flex items-start gap-3 rounded-control border p-3 ${closing.stage.isWon ? "border-success-border bg-success-surface" : "border-danger-border bg-danger-surface"}`}
            >
              {closing.stage.isWon ? (
                <CheckCircle2
                  className="mt-0.5 h-icon-lg w-icon-lg shrink-0 text-success"
                  aria-hidden="true"
                />
              ) : (
                <XCircle
                  className="mt-0.5 h-icon-lg w-icon-lg shrink-0 text-danger"
                  aria-hidden="true"
                />
              )}
              <div>
                <strong className="font-black text-text-main">
                  {closing.stage.isWon
                    ? "Confirmer le contrat"
                    : "Capitaliser sur la perte"}
                </strong>
                <p className="mt-0.5 text-text-secondary">
                  {t(
                    "admin.crmPipelinePage.cetteTransitionEstAuditeeEtMetAJourLesPrevisions",
                  )}
                </p>
              </div>
            </div>
            {closing.stage.isWon ? (
              <>
                <FormField label="Valeur contractuelle">
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 font-black text-text-main">
                    <CircleDollarSign
                      className="h-icon-md w-icon-md text-success"
                      aria-hidden="true"
                    />
                    {money(
                      closing.opportunity.amount.amountMinor,
                      closing.opportunity.amount.currency,
                      currentLocale,
                    )}
                  </div>
                </FormField>
                <FormField label="Statut d’onboarding">
                  <Select
                    aria-label="Statut d’onboarding"
                    value={onboardingStatus}
                    onChange={(event) =>
                      setOnboardingStatus(event.target.value)
                    }
                    options={[
                      {
                        value: "à_planifier",
                        label: t("admin.crmPipelinePage.aPlanifier"),
                      },
                      {
                        value: "prêt",
                        label: t("admin.crmPipelinePage.pretADemarrer"),
                      },
                      { value: "en_cours", label: "En cours" },
                    ]}
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField
                  label={t("admin.crmOpportunityDetailPage.motifDePerte")}
                  required
                >
                  <Select
                    aria-label={t(
                      "admin.crmOpportunityDetailPage.motifDePerte",
                    )}
                    value={lossReason}
                    onChange={(event) => setLossReason(event.target.value)}
                    options={[
                      {
                        value: "",
                        label: t("admin.crmOpportunityDetailPage.selectionner"),
                      },
                      { value: "budget", label: "Budget insuffisant" },
                      { value: "concurrent", label: "Concurrent retenu" },
                      {
                        value: "timing",
                        label: t(
                          "admin.crmOpportunityDetailPage.calendrierReporte",
                        ),
                      },
                      {
                        value: "no_need",
                        label: t(
                          "admin.crmOpportunityDetailPage.besoinNonConfirme",
                        ),
                      },
                      {
                        value: "no_response",
                        label: t(
                          "admin.crmOpportunityDetailPage.absenceDeReponse",
                        ),
                      },
                      { value: "other", label: "Autre" },
                    ]}
                  />
                </FormField>
                <FormField
                  label={t("admin.crmOpportunityDetailPage.precisions")}
                >
                  <Textarea
                    value={lossDetail}
                    onChange={(event) => setLossDetail(event.target.value)}
                    placeholder={t(
                      "admin.crmPipelinePage.contexteConcurrentOuProchaineFenetreDeContact",
                    )}
                    rows={3}
                  />
                </FormField>
              </>
            )}
            <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClosing(null)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
              >
                {submitting ? "Validation…" : "Confirmer la transition"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
