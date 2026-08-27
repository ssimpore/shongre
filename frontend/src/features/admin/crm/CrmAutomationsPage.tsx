import React from "react";
import { CirclePause, Clock3, Mail, ShieldCheck, Workflow } from "lucide-react";
import { Button } from "../../../design-system/primitives/Button";
import { usePageMeta } from "../../../hooks/usePageMeta";

export const CrmAutomationsPage: React.FC = () => {
  usePageMeta({
    title: "Automatisations CRM | Shongre",
    description: "Workflows et séquences CRM.",
    canonicalPath: "/admin/crm/automations",
    noIndex: true,
  });
  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-micro font-bold uppercase tracking-wider text-violet-300">
              CRM · Orchestration
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Automatisations
            </h1>
            <p className="mt-1 text-xs text-stone-400">
              Workflows événementiels et séquences commerciales avec garde-fous.
            </p>
          </div>
          <Button
            size="sm"
            disabled
            title="Activez d’abord un worker d’automatisation backend"
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
              Moteur non activé dans cet environnement
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-warning">
              Le modèle persistant, l’isolation tenant, les exécutions
              idempotentes et la file de reprise sont provisionnés. Aucun
              workflow n’est exécutable tant qu’un worker CRM explicite et ses
              fournisseurs autorisés ne sont pas actifs. Cette interface ne
              simule pas une exécution de production.
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
              className="rounded-2xl border border-border-base bg-white p-5 shadow-xs"
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
      <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
        <h2 className="text-sm font-black">Règles d’activation</h2>
        <ol className="mt-3 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
          <li className="rounded-xl bg-stone-50 p-3">
            <strong className="block text-stone-900">
              1. Worker disponible
            </strong>
            Consommation de la queue avec retries bornés et dead-letter.
          </li>
          <li className="rounded-xl bg-stone-50 p-3">
            <strong className="block text-stone-900">
              2. Fournisseur explicite
            </strong>
            Aucun email ou appel sans connexion autorisée.
          </li>
          <li className="rounded-xl bg-stone-50 p-3">
            <strong className="block text-stone-900">3. Consentement</strong>
            Arrêt sur opt-out, refus ou statut ne pas contacter.
          </li>
          <li className="rounded-xl bg-stone-50 p-3">
            <strong className="block text-stone-900">
              4. Validation humaine
            </strong>
            Les actions à risque restent soumises à approbation.
          </li>
        </ol>
      </section>
    </div>
  );
};
