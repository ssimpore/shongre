import React from "react";
import { CirclePause, Clock3, Mail, ShieldCheck, Workflow } from "lucide-react";
import { Button } from "../../../design-system/primitives/Button";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useTranslation } from "../../../i18n/I18nProvider";

export const CrmAutomationsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Automatisations CRM | Shongre",
    description: t("admin.crmAutomationsPage.workflowsEtSequencesCrm"),
    canonicalPath: "/admin/crm/automations",
    noIndex: true,
  });
  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-text-inverse sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-micro font-bold uppercase tracking-wider text-violet-300">
              CRM · Orchestration
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Automatisations
            </h1>
            <p className="mt-1 text-xs text-text-disabled">
              {t("admin.crmAutomationsPage.workflowsEvenementielsEtSequencesCommercialesAvecGardeFous")}
            </p>
          </div>
          <Button
            size="sm"
            disabled
            title={t("admin.crmAutomationsPage.activezDAbordUnWorkerDAutomatisationBackend")}
          >
            <Workflow className="h-icon-md w-icon-md" /> Nouveau workflow
          </Button>
        </div>
      </section>
      <section className="rounded-2xl border border-warning-border bg-warning-surface p-5">
        <div className="flex items-start gap-3">
          <CirclePause className="mt-0.5 h-icon-lg w-icon-lg shrink-0 text-warning" />
          <div>
            <h2 className="text-sm font-black text-warning">
              {t("admin.crmAutomationsPage.moteurNonActiveDansCetEnvironnement")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-warning">
              {t("admin.crmAutomationsPage.leModelePersistantLIsolationTenantLesExecutionsIdempotentesEt")}
            </p>
          </div>
        </div>
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        {[
          [
            "Déclencheurs",
            "Création, changement d’étape, tâche échue et événements Shongre.",
            Clock3,
          ],
          [
            "Actions",
            "Tâches, notifications et messages via les gateways partagées.",
            Mail,
          ],
          [
            "Sécurité",
            "Profondeur maximale, idempotence, DNC, consentement et quotas.",
            ShieldCheck,
          ],
        ].map(([title, description, Icon]) => {
          const CardIcon = Icon as React.ComponentType<{ className?: string }>;
          return (
            <article
              key={title as string}
              className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs"
            >
              <CardIcon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-black">{title as string}</h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                {description as string}
              </p>
            </article>
          );
        })}
      </section>
      <section className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs">
        <h2 className="text-sm font-black">{t("admin.crmAutomationsPage.reglesDActivation")}</h2>
        <ol className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
          <li className="rounded-control bg-stone-50 p-3">
            <strong className="block text-text-main">
              1. Worker disponible
            </strong>
            {t("admin.crmAutomationsPage.consommationDeLaQueueAvecRetriesBornesEtDeadLetter")}
          </li>
          <li className="rounded-control bg-stone-50 p-3">
            <strong className="block text-text-main">
              2. Fournisseur explicite
            </strong>
            {t("admin.crmAutomationsPage.aucunEmailOuAppelSansConnexionAutorisee")}
          </li>
          <li className="rounded-control bg-stone-50 p-3">
            <strong className="block text-text-main">3. Consentement</strong>
            {t("admin.crmAutomationsPage.arretSurOptOutRefusOuStatutNePasContacter")}
          </li>
          <li className="rounded-control bg-stone-50 p-3">
            <strong className="block text-text-main">
              4. Validation humaine
            </strong>
            {t("admin.crmAutomationsPage.lesActionsARisqueRestentSoumisesAApprobation")}
          </li>
        </ol>
      </section>
    </div>
  );
};
