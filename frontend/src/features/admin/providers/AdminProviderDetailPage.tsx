import type { ProviderControlPlaneEntry } from "@shongre/contracts/provider-platform";
import { ArrowLeft, ExternalLink } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { services } from "../../../api/client/service-registry";
import { Badge } from "../../../design-system/primitives/Badge";
import { Button } from "../../../design-system/primitives/Button";
import { StatePanel } from "../../../design-system/primitives/StatePanel";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useTranslation } from "../../../i18n/I18nProvider";

export const AdminProviderDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { providerId = "" } = useParams<{ providerId: string }>();
  const [provider, setProvider] = useState<ProviderControlPlaneEntry | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePageMeta({
    title: t("meta.adminProviderDetail.title"),
    description: t("meta.adminProviderDetail.description"),
    noIndex: true,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void services.providerControlPlane
      .getSnapshot()
      .then((snapshot) => {
        if (!active) return;
        setProvider(
          snapshot.providers.find(
            (entry) => entry.definition.id === providerId,
          ) ?? null,
        );
        setError(null);
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Fournisseur indisponible.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [providerId]);

  if (loading) {
    return (
      <div
        className="min-h-48 animate-pulse rounded-card bg-bg-subtle"
        role="status"
      />
    );
  }
  if (error || !provider) {
    return (
      <StatePanel
        variant={error ? "error" : "notFound"}
        title={error ? "Fournisseur indisponible" : "Fournisseur introuvable"}
        description={
          error || "Aucune intégration serveur ne porte cet identifiant."
        }
        action={
          <Button to="/admin/fournisseurs">Retour aux intégrations</Button>
        }
      />
    );
  }

  const { definition, runtime, readiness } = provider;
  return (
    <div className="space-y-6">
      <Link
        to="/admin/fournisseurs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-icon-sm w-icon-sm" /> Retour aux intégrations
      </Link>
      <header className="rounded-card border border-border-base bg-bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-micro text-text-tertiary">
              {definition.id}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-text-main">
              {definition.displayName}
            </h1>
            <p className="mt-1 text-xs text-text-secondary">
              {runtime.message}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{definition.lifecycle}</Badge>
            <Badge
              variant={runtime.health === "HEALTHY" ? "success" : "warning"}
            >
              {runtime.health}
            </Badge>
          </div>
        </div>
        {definition.documentationUrl ? (
          <a
            href={definition.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Documentation <ExternalLink className="h-icon-xs w-icon-xs" />
          </a>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
          <h2 className="font-bold text-text-main">Exécution effective</h2>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-audit-row">
            <dt className="text-text-tertiary">Environnement</dt>
            <dd>{runtime.environment}</dd>
            <dt className="text-text-tertiary">Configuré</dt>
            <dd>{runtime.configured ? "Oui" : "Non"}</dd>
            <dt className="text-text-tertiary">Activé</dt>
            <dd>{runtime.enabled ? "Oui" : "Non"}</dd>
            <dt className="text-text-tertiary">Preuve de santé</dt>
            <dd>{runtime.healthEvidence}</dd>
            {runtime.lastCheckedAt ? (
              <>
                <dt className="text-text-tertiary">Dernier contrôle</dt>
                <dd>{runtime.lastCheckedAt}</dd>
              </>
            ) : null}
          </dl>
        </section>
        <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
          <h2 className="font-bold text-text-main">Préparation</h2>
          <p className="mt-3 text-3xl font-bold text-text-main">
            {readiness.score}%
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {readiness.productionReady
              ? "Prêt pour la production"
              : "Préparation incomplète"}
          </p>
          {readiness.blockers.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-text-secondary">
              {readiness.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <h2 className="font-bold text-text-main">Capacités implémentées</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {definition.implementedCapabilities.map((capability) => (
            <Badge key={capability} variant="neutral">
              {capability}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
};
