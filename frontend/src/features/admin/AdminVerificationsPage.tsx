import React, { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  Building2,
  Check,
  Clock3,
  FileKey2,
  History,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  ComplianceAuditEvent,
  ComplianceRule,
  ManualReviewCase,
} from "@shongre/contracts/compliance";
import { services } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";
import { PromptModal } from "../../design-system/primitives/PromptModal";
import { Tabs, TabPanel } from "../../design-system";
import { useToast } from "../../app/providers/ToastProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { labelIdentifier } from "../../utilities/identifier-label";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { useTranslation } from "../../i18n/I18nProvider";

export const AdminVerificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatDateTime } = useRegionalFormatters();
  usePageMeta({
    title: t(
      "admin.adminVerificationsPage.conformiteProgressiveAdministrationShongre",
    ),
    description: t(
      "admin.adminVerificationsPage.revueManuellePolitiquesEtAuditDeConformite",
    ),
    canonicalPath: "/admin/verifications",
    noIndex: true,
  });
  const toast = useToast();
  const [queue, setQueue] = useState<ManualReviewCase[]>([]);
  const [policies, setPolicies] = useState<ComplianceRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<ComplianceAuditEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "policies" | "audit">(
    "queue",
  );
  const [decision, setDecision] = useState<{
    review: ManualReviewCase;
    outcome: "approve" | "reject";
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [reviews, rules, audit] = await Promise.all([
        services.verification.listManualReviews(),
        services.verification.listComplianceRules(),
        services.verification.listComplianceAudit(100),
      ]);
      setQueue(reviews);
      setPolicies(rules);
      setAuditLogs(audit);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger le registre de conformité.",
      );
    }
  }, [toast]);
  useEffect(() => {
    void loadData();
  }, [loadData]);

  const applyDecision = async (reason: string) => {
    if (!decision) return;
    if (reason.trim().length < 10) {
      toast.error("Le motif doit comporter au moins 10 caractères.");
      return;
    }
    try {
      await services.verification.decideManualReview({
        caseId: decision.review.id,
        state: decision.outcome === "approve" ? "APPROVED" : "REJECTED",
        reason,
      });
      toast.success("Décision enregistrée dans le journal d’audit.");
      setDecision(null);
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "La décision n’a pas pu être enregistrée.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-stone-200 bg-bg-surface p-5 shadow-xs sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-success-surface text-success">
            <ShieldCheck className="h-icon-lg w-icon-lg" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-success">
              {t("admin.adminVerificationsPage.accesConformiteRestreint")}
            </p>
            <h1 className="mt-1 text-2xl font-black text-stone-950">
              {t(
                "admin.adminVerificationsPage.verificationsReglesEtRevueHumaine",
              )}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary">
              {t(
                "admin.adminVerificationsPage.lesAgentsVoientLesStatutsNecessairesALeurMissionLes",
              )}
            </p>
          </div>
        </div>
      </section>

      <Tabs
        variant="segmented"
        label={t("admin.adminVerificationsPage.sectionsDeConformite")}
        idPrefix="admin-progressive-compliance"
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as typeof activeTab)}
        tabs={[
          {
            id: "queue",
            label: "Revue manuelle",
            count: queue.length,
            icon: <Clock3 className="h-icon-md w-icon-md" aria-hidden="true" />,
          },
          {
            id: "policies",
            label: t("admin.adminVerificationsPage.registreDesRegles"),
            count: policies.length,
            icon: <Scale className="h-icon-md w-icon-md" aria-hidden="true" />,
          },
          {
            id: "audit",
            label: "Audit",
            count: auditLogs.length,
            icon: (
              <History className="h-icon-md w-icon-md" aria-hidden="true" />
            ),
          },
        ]}
      />

      <TabPanel tab={activeTab} idPrefix="admin-progressive-compliance">
        {activeTab === "queue" ? (
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-bg-surface shadow-xs">
            <div className="border-b border-stone-100 p-4">
              <h2 className="font-bold text-stone-950">
                {t(
                  "admin.adminVerificationsPage.dossiersNecessitantUneDecision",
                )}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {t(
                  "admin.adminVerificationsPage.touteDecisionExigeUnMotifEtResteTracable",
                )}
              </p>
            </div>
            {queue.length === 0 ? (
              <p className="p-8 text-center text-sm text-stone-500">
                {t("admin.adminVerificationsPage.aucunDossierEnAttente")}
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {queue.map((review) => (
                  <article
                    key={review.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-stone-100 text-stone-700">
                        {review.dimension === "identity" ? (
                          <FileKey2
                            className="h-icon-lg w-icon-lg"
                            aria-hidden="true"
                          />
                        ) : (
                          <Building2
                            className="h-icon-lg w-icon-lg"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-950">
                          Dossier {review.userId}
                        </h3>
                        <p className="mt-1 text-xs text-stone-500">
                          {labelIdentifier(review.dimension)} ·{" "}
                          {labelIdentifier(review.state)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={
                          <X
                            className="h-icon-md w-icon-md"
                            aria-hidden="true"
                          />
                        }
                        onClick={() =>
                          setDecision({ review, outcome: "reject" })
                        }
                      >
                        Refuser
                      </Button>
                      <Button
                        size="sm"
                        leftIcon={
                          <Check
                            className="h-icon-md w-icon-md"
                            aria-hidden="true"
                          />
                        }
                        onClick={() =>
                          setDecision({ review, outcome: "approve" })
                        }
                      >
                        Approuver
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "policies" ? (
          <section className="rounded-2xl border border-stone-200 bg-bg-surface p-4 shadow-xs sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <BookOpenCheck
                className="mt-0.5 h-icon-lg w-icon-lg text-success"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-bold text-stone-950">
                  {t("admin.adminVerificationsPage.registreVersionne")}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {t(
                    "admin.adminVerificationsPage.lesModificationsJuridiquesSontPlanifieesSourceesEtAuditeesCoteServeur",
                  )}
                </p>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {policies.map((policy) => (
                <article
                  key={policy.id}
                  className="grid gap-2 py-4 sm:grid-cols-admin-verification sm:items-center"
                >
                  <div>
                    <h3 className="text-sm font-bold text-text-main">
                      {labelIdentifier(policy.action)}
                    </h3>
                    <p className="mt-0.5 text-micro font-mono text-stone-500">
                      {policy.ruleCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">
                      {policy.description}
                    </p>
                    <p className="mt-1 text-micro text-stone-500">
                      Requis :{" "}
                      {policy.requiredChecks.length
                        ? policy.requiredChecks.map(labelIdentifier).join(", ")
                        : "aucun"}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span
                      className={`inline-flex rounded-pill border px-2.5 py-1 text-micro font-bold ${
                        policy.status === "LEGAL_REVIEW_REQUIRED"
                          ? "border-warning-border bg-warning-surface text-warning"
                          : "border-success-border bg-success-surface text-success"
                      }`}
                    >
                      {policy.status}
                    </span>
                    <p className="mt-1 text-micro text-stone-500">
                      {policy.policyVersion}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "audit" ? (
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-bg-surface shadow-xs">
            <div className="border-b border-stone-100 p-4">
              <h2 className="font-bold text-stone-950">
                {t("admin.adminVerificationsPage.evenementsDeConformite")}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {t(
                  "admin.adminVerificationsPage.lesValeursSensiblesEtReponsesBrutesDesPrestatairesSontExclues",
                )}
              </p>
            </div>
            <div className="divide-y divide-stone-100">
              {auditLogs.map((log) => (
                <article
                  key={log.id}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-text-main">
                      {labelIdentifier(log.dimension || "policy")} ·{" "}
                      {labelIdentifier(log.newState || log.eventType)}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Acteur : {log.actorId || log.actorType}{" "}
                      {t("admin.adminVerificationsPage.referenceUtilisateur")}{" "}
                      {log.userId}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-micro text-stone-500"
                    dateTime={log.occurredAt}
                  >
                    {formatDateTime(log.occurredAt)}
                  </time>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </TabPanel>

      <PromptModal
        isOpen={Boolean(decision)}
        onClose={() => setDecision(null)}
        onSubmit={applyDecision}
        title={
          decision?.outcome === "approve"
            ? "Motif d’approbation"
            : "Motif du refus"
        }
        label={t("admin.adminVerificationsPage.decisionMotivee")}
        hint="Minimum 10 caractères. Le motif est conservé dans l’audit et sert au recours utilisateur."
        placeholder={t(
          "admin.adminVerificationsPage.decrivezLesElementsControlesEtLaJustificationDeLaDecision",
        )}
        confirmText={decision?.outcome === "approve" ? "Approuver" : "Refuser"}
        multiline
      />
    </div>
  );
};
