import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  FileWarning,
  Globe2,
  Settings2,
  UsersRound,
} from "lucide-react";
import type {
  EmploymentAdminOverview,
  EmploymentMarketConfig,
} from "@shongre/contracts/employment";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  Skeleton,
  StatePanel,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatEmploymentMoney } from "../employment/employment-format";
import { labelIdentifier } from "../../utilities/identifier-label";

type FeatureFlag = keyof EmploymentMarketConfig["featureFlags"];

export const EmploymentAdminPage: React.FC = () => {
  const toast = useToast();
  const [overview, setOverview] = useState<EmploymentAdminOverview | null>(
    null,
  );
  const [config, setConfig] = useState<EmploymentMarketConfig | null>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  usePageMeta({
    title: "Administration Emploi",
    description:
      "Configuration, conformité, catalogue et opérations du vertical Shongre Emploi.",
    canonicalPath: "/admin/emploi",
    noIndex: true,
  });

  const load = () => {
    setError(undefined);
    services.employment
      .getAdminOverview("FR")
      .then((next) => {
        setOverview(next);
        setConfig(next.catalog.config);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Administration Emploi indisponible.",
        ),
      );
  };
  useEffect(load, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await services.employment.updateMarketConfig("FR", config);
      setConfig(saved);
      setOverview((current) =>
        current
          ? { ...current, catalog: { ...current.catalog, config: saved } }
          : current,
      );
      toast.success("Configuration Emploi enregistrée.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Configuration non enregistrée.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleOffer = async (offerId: string, isActive: boolean) => {
    try {
      const offer = await services.employment.updateOffer(offerId, {
        isActive,
      });
      setOverview((current) =>
        current
          ? {
              ...current,
              catalog: {
                ...current.catalog,
                offers: current.catalog.offers.map((item) =>
                  item.id === offer.id ? offer : item,
                ),
              },
            }
          : current,
      );
      toast.success(`Offre ${isActive ? "activée" : "désactivée"}.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Offre non modifiée.",
      );
    }
  };

  if (error)
    return (
      <StatePanel
        variant="error"
        title="Console Emploi indisponible"
        description={error}
        action={<Button onClick={load}>Réessayer</Button>}
      />
    );
  if (!overview || !config)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    );

  const metrics = [
    ["Employeurs actifs", overview.employerCounts.active || 0, Building2],
    ["Offres publiées", overview.jobCounts.published || 0, BriefcaseBusiness],
    [
      "Candidatures reçues",
      overview.applicationCounts.received || 0,
      UsersRound,
    ],
    ["File de modération", overview.moderationQueueCount, FileWarning],
  ] as const;
  const featureFlags: Array<[FeatureFlag, string, string]> = [
    [
      "verticalEnabled",
      "Vertical Emploi",
      "Rend les routes publiques et les parcours Emploi disponibles.",
    ],
    [
      "privateEmployersEnabled",
      "Particuliers employeurs",
      "Autorise les offres d’emploi standard gratuites des particuliers.",
    ],
    [
      "directApplicationsEnabled",
      "Candidatures directes",
      "Active la candidature sécurisée dans Shongre.",
    ],
    [
      "externalApplicationsEnabled",
      "Redirections externes",
      "Autorise les URL de carrière validées.",
    ],
    [
      "candidateSearchEnabled",
      "Recherche de candidats",
      "Seulement pour les profils ayant consenti et les recruteurs vérifiés.",
    ],
    [
      "interviewsEnabled",
      "Entretiens",
      "Active la planification avec fuseaux horaires explicites.",
    ],
    [
      "importsEnabled",
      "Imports de masse",
      "Active CSV, XML et les rapports d’erreurs.",
    ],
    [
      "apiSyncEnabled",
      "Synchronisation API",
      "Active le cadre de connecteurs ATS idempotents.",
    ],
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={config.isEnabled ? "success" : "warning"}>
              {config.isEnabled ? "Actif" : "Désactivé"}
            </Badge>
            <span className="text-xs text-text-muted">
              Schéma v{config.schemaVersion} · politique{" "}
              {config.regulatoryContentVersion}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-text-main">
            Shongre Emploi
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Pilotage du marché France, sans dupliquer la catégorie canonique «
            Emploi ».
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <div
            key={label}
            className="rounded-card border border-border-base bg-bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-text-muted">{label}</p>
              <Icon className="h-icon-md w-icon-md text-primary" />
            </div>
            <p className="mt-2 text-3xl font-black">
              {new Intl.NumberFormat(config.locale).format(value)}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section className="rounded-card border border-border-base bg-bg-surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Globe2 className="h-icon-md w-icon-md text-primary" />
            Configuration du marché
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField label="Durée de publication (jours)">
              <Input
                type="number"
                min={1}
                value={config.defaultPublicationDurationDays}
                onChange={(event) =>
                  setConfig((current) =>
                    current
                      ? {
                          ...current,
                          defaultPublicationDurationDays: Number(
                            event.target.value,
                          ),
                        }
                      : current,
                  )
                }
              />
            </FormField>
            <FormField label="Rétention des brouillons (jours)">
              <Input
                type="number"
                min={1}
                value={config.draftRetentionDays}
                onChange={(event) =>
                  setConfig((current) =>
                    current
                      ? {
                          ...current,
                          draftRetentionDays: Number(event.target.value),
                        }
                      : current,
                  )
                }
              />
            </FormField>
            <FormField label="Rétention des candidatures (jours)">
              <Input
                type="number"
                min={1}
                value={config.applicationRetentionDays}
                onChange={(event) =>
                  setConfig((current) =>
                    current
                      ? {
                          ...current,
                          applicationRetentionDays: Number(event.target.value),
                        }
                      : current,
                  )
                }
              />
            </FormField>
            <FormField label="Délai avant nouvelle candidature (jours)">
              <Input
                type="number"
                min={0}
                value={config.applicationResubmissionCooldownDays}
                onChange={(event) =>
                  setConfig((current) =>
                    current
                      ? {
                          ...current,
                          applicationResubmissionCooldownDays: Number(
                            event.target.value,
                          ),
                        }
                      : current,
                  )
                }
              />
            </FormField>
          </div>
          <div className="mt-6 border-t border-border-subtle pt-5">
            <h3 className="text-sm font-black">Fonctionnalités</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {featureFlags.map(([flag, label, description]) => (
                <div
                  key={flag}
                  className="rounded-control border border-border-base p-3"
                >
                  <Checkbox
                    checked={config.featureFlags[flag]}
                    onChange={(event) =>
                      setConfig((current) =>
                        current
                          ? {
                              ...current,
                              featureFlags: {
                                ...current.featureFlags,
                                [flag]: event.target.checked,
                              },
                            }
                          : current,
                      )
                    }
                    label={label}
                  />
                  <p className="mt-1 pl-7 text-micro leading-relaxed text-text-muted">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-card border border-warning-border bg-warning-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-black">
              <AlertTriangle className="h-icon-sm w-icon-sm text-warning" />
              Actions requises
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Langage à revoir</dt>
                <dd className="font-black">
                  {overview.prohibitedLanguageReviewCount}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Erreurs d’import</dt>
                <dd className="font-black">{overview.importErrorCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Employeurs suspendus</dt>
                <dd className="font-black">
                  {overview.employerCounts.suspended || 0}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-black">
              <Settings2 className="h-icon-sm w-icon-sm text-primary" />
              Principes de conformité
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-secondary">
              <li>Données candidats privées et RLS par défaut</li>
              <li>Aucune décision juridique automatique</li>
              <li>Aucun attribut sensible dans le classement</li>
              <li>Aucun paiement demandé aux candidats</li>
              <li>Rétention et consentements versionnés</li>
            </ul>
          </div>
        </aside>
      </div>

      <section className="rounded-card border border-border-base bg-bg-surface p-5">
        <h2 className="text-lg font-black">Catalogue des offres employeur</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[50rem] text-left text-xs">
            <thead className="bg-bg-subtle text-text-secondary">
              <tr>
                <th className="p-3">Offre</th>
                <th className="p-3">Audience</th>
                <th className="p-3">Modèle</th>
                <th className="p-3">Prix</th>
                <th className="p-3">État</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {overview.catalog.offers.map((offer) => {
                const price = offer.prices.find(
                  (item) => item.isActive,
                )?.amount;
                return (
                  <tr key={offer.id} className="border-t border-border-subtle">
                    <td className="p-3">
                      <p className="font-black">{offer.name}</p>
                      <p className="mt-1 max-w-md text-micro text-text-muted">
                        {offer.description}
                      </p>
                    </td>
                    <td className="p-3">{labelIdentifier(offer.audience)}</td>
                    <td className="p-3">{labelIdentifier(offer.kind)}</td>
                    <td className="p-3 font-bold">
                      {price && price.amountMinor
                        ? formatEmploymentMoney(
                            price.amountMinor,
                            price.currency,
                          )
                        : offer.kind === "custom"
                          ? "Sur devis"
                          : "Gratuit"}
                    </td>
                    <td className="p-3">
                      <Badge variant={offer.isActive ? "success" : "neutral"}>
                        {offer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleOffer(offer.id, !offer.isActive)}
                      >
                        {offer.isActive ? "Désactiver" : "Activer"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-card border border-border-base bg-bg-surface p-5">
        <h2 className="text-lg font-black">Dictionnaires administrables</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {overview.catalog.dictionaries.length} valeurs actives couvrant
          secteurs, familles, métiers, compétences, contrats, rythmes, diplômes
          et langues.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from(
            new Set(overview.catalog.dictionaries.map((entry) => entry.kind)),
          ).map((kind) => (
            <Badge key={kind}>
              {kind} ·{" "}
              {
                overview.catalog.dictionaries.filter(
                  (entry) => entry.kind === kind,
                ).length
              }
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
};
