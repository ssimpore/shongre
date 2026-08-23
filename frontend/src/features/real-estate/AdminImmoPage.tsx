import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Flag,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import type {
  PropertyFieldRule,
  RealEstateAdminOverview,
} from "@shongre/contracts/real-estate";
import type { VerticalAddOn, VerticalOffer } from "@shongre/contracts/vertical";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import { Badge, Button, Skeleton, Switch } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatImmoMoney } from "./immo-format";
import { labelIdentifier } from "../../utilities/identifier-label";

const featureFlagLabels: Record<string, string> = {
  verticalEnabled: "Verticale disponible",
  mapSearchEnabled: "Recherche cartographique",
  savedSearchesEnabled: "Recherches et alertes",
  recentlyViewedEnabled: "Biens consultés récemment",
  comparablesEnabled: "Biens comparables",
  structuredLeadsEnabled: "Demandes qualifiées",
  appointmentsEnabled: "Demandes de visite",
  paidOffersEnabled: "Offres payantes",
  professionalImportsEnabled: "Imports professionnels",
  professionalApiSyncEnabled: "Synchronisation API",
  privateDocumentsEnabled: "Documents privés",
};

export const AdminImmoPage: React.FC = () => {
  const toast = useToast();
  const [overview, setOverview] = useState<RealEstateAdminOverview | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  usePageMeta({
    title: "Administration Shongre Immo",
    description:
      "Configuration du marché, catalogue, modération et métriques immobilières.",
    canonicalPath: "/admin/immo",
    noIndex: true,
  });
  useEffect(() => {
    services.realEstate
      .getAdminOverview("FR")
      .then(setOverview)
      .catch(() => toast.error("Administration Immo indisponible."));
  }, [toast]);

  const toggleMarket = async () => {
    if (!overview) return;
    setSaving(true);
    try {
      const config = await services.realEstate.updateMarketConfig("FR", {
        isEnabled: !overview.catalog.config.isEnabled,
      });
      setOverview({
        ...overview,
        catalog: {
          ...overview.catalog,
          config,
          activation: {
            ...overview.catalog.activation,
            isActive: config.isEnabled,
          },
        },
      });
      toast.success(
        `Vertical Immo ${config.isEnabled ? "activé" : "désactivé"} pour la France.`,
      );
    } catch {
      toast.error("Configuration non enregistrée.");
    } finally {
      setSaving(false);
    }
  };
  const saveOffer = async (id: string, patch: Partial<VerticalOffer>) => {
    if (!overview) return;
    try {
      const updated = await services.realEstate.updateOffer("FR", id, patch);
      setOverview((current) =>
        current
          ? {
              ...current,
              catalog: {
                ...current.catalog,
                offers: current.catalog.offers.map((item) =>
                  item.id === id
                    ? { ...item, ...updated, verticalType: "real_estate" }
                    : item,
                ),
              },
            }
          : current,
      );
      toast.success("Offre mise à jour.");
    } catch {
      toast.error("L’offre n’a pas pu être mise à jour.");
    }
  };
  const saveAddOn = async (id: string, patch: Partial<VerticalAddOn>) => {
    if (!overview) return;
    try {
      const updated = await services.realEstate.updateAddOn("FR", id, patch);
      setOverview((current) =>
        current
          ? {
              ...current,
              catalog: {
                ...current.catalog,
                addOns: current.catalog.addOns.map((item) =>
                  item.id === id
                    ? { ...item, ...updated, verticalType: "real_estate" }
                    : item,
                ),
              },
            }
          : current,
      );
      toast.success("Option mise à jour.");
    } catch {
      toast.error("L’option n’a pas pu être mise à jour.");
    }
  };
  const updateFieldRule = async (
    rule: PropertyFieldRule,
    patch: Partial<PropertyFieldRule>,
  ) => {
    if (!overview) return;
    const updated = await services.realEstate.updateFieldRule(
      "FR",
      rule.id,
      patch,
    );
    setOverview({
      ...overview,
      catalog: {
        ...overview.catalog,
        fieldRules: overview.catalog.fieldRules.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      },
    });
    toast.success("Règle de publication mise à jour.");
  };

  if (!overview) return <Skeleton className="h-[42rem] rounded-card" />;
  const metrics = [
    ["Biens actifs", overview.metrics.activeProperties, Building2],
    ["À modérer", overview.metrics.pendingModeration, Flag],
    ["Pros vérifiés", overview.metrics.verifiedProfessionals, ShieldCheck],
    [
      "Conversion gratuit → payant",
      `${overview.metrics.freeToPaidConversionPercent} %`,
      CheckCircle2,
    ],
  ] as const;
  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Verticale spécialisée
          </p>
          <h1 className="mt-1 text-xl font-black">Shongre Immo · France</h1>
          <p className="mt-1 text-xs text-text-muted">
            Schéma v{overview.catalog.config.schemaVersion} · contenu
            réglementaire {overview.catalog.config.regulatoryContentVersion}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-control border border-border-base bg-bg-surface px-4 py-2">
          <span className="text-xs font-bold">Marché actif</span>
          <Switch
            checked={overview.catalog.config.isEnabled}
            onChange={toggleMarket}
            disabled={saving}
            aria-label="Activer le marché immobilier France"
          />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <article
            key={label}
            className="rounded-card border border-border-base bg-bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-text-muted">{label}</p>
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-black">{String(value)}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-card border border-border-base bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black">Offres et quotas</h2>
              <p className="text-micro text-text-muted">
                Catalogue générique, spécialisé par verticale et marché.
              </p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left text-xs">
              <thead className="bg-bg-subtle text-text-muted">
                <tr>
                  <th className="p-3">Offre</th>
                  <th className="p-3">Audience</th>
                  <th className="p-3">Prix</th>
                  <th className="p-3">Quota actif</th>
                  <th className="p-3">Durée</th>
                  <th className="p-3">Essai</th>
                  <th className="p-3">Taxe</th>
                  <th className="p-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {overview.catalog.offers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="p-3">
                      <p className="font-black">{offer.name}</p>
                      <p className="text-micro text-text-muted">
                        {labelIdentifier(offer.kind)}
                      </p>
                    </td>
                    <td className="p-3">{labelIdentifier(offer.audience)}</td>
                    <td className="p-3 font-bold">
                      {offer.prices[0] ? (
                        <input
                          aria-label={`Prix de ${offer.name} en euros`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={
                            offer.prices[0].amount.amountMinor / 100
                          }
                          className="h-control-md w-24 rounded-control border border-border-base bg-white px-2"
                          onBlur={(event) =>
                            saveOffer(offer.id, {
                              prices: offer.prices.map((price, index) =>
                                index === 0
                                  ? {
                                      ...price,
                                      amount: {
                                        ...price.amount,
                                        amountMinor: Math.max(
                                          0,
                                          Math.round(
                                            Number(event.target.value) * 100,
                                          ),
                                        ),
                                      },
                                    }
                                  : price,
                              ),
                            })
                          }
                        />
                      ) : (
                        "Sur devis"
                      )}
                    </td>
                    <td className="p-3">
                      <input
                        aria-label={`Quota de biens actifs de ${offer.name}`}
                        type="number"
                        min="0"
                        defaultValue={Number(
                          offer.entitlements.maxActiveListings || 0,
                        )}
                        className="h-control-md w-20 rounded-control border border-border-base bg-white px-2"
                        onBlur={(event) =>
                          saveOffer(offer.id, {
                            entitlements: {
                              ...offer.entitlements,
                              maxActiveListings: Math.max(
                                0,
                                Number(event.target.value),
                              ),
                            },
                          })
                        }
                      />
                    </td>
                    <td className="p-3">
                      {offer.prices[0] ? (
                        <input
                          aria-label={`Durée de ${offer.name} en jours`}
                          type="number"
                          min="1"
                          defaultValue={offer.prices[0].durationDays || ""}
                          className="h-control-md w-16 rounded-control border border-border-base bg-white px-2"
                          onBlur={(event) =>
                            saveOffer(offer.id, {
                              prices: offer.prices.map((price, index) =>
                                index === 0
                                  ? {
                                      ...price,
                                      durationDays: event.target.value
                                        ? Number(event.target.value)
                                        : undefined,
                                    }
                                  : price,
                              ),
                            })
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      {offer.prices[0] ? (
                        <input
                          aria-label={`Essai de ${offer.name} en jours`}
                          type="number"
                          min="0"
                          defaultValue={offer.prices[0].trialDays || 0}
                          className="h-control-md w-16 rounded-control border border-border-base bg-white px-2"
                          onBlur={(event) =>
                            saveOffer(offer.id, {
                              prices: offer.prices.map((price, index) =>
                                index === 0
                                  ? {
                                      ...price,
                                      trialDays: Math.max(
                                        0,
                                        Number(event.target.value),
                                      ),
                                    }
                                  : price,
                              ),
                            })
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      {offer.prices[0] ? (
                        <input
                          aria-label={`Taxe de ${offer.name} en pourcentage`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={offer.prices[0].taxRateBps / 100}
                          className="h-control-md w-16 rounded-control border border-border-base bg-white px-2"
                          onBlur={(event) =>
                            saveOffer(offer.id, {
                              prices: offer.prices.map((price, index) =>
                                index === 0
                                  ? {
                                      ...price,
                                      taxRateBps: Math.min(
                                        10_000,
                                        Math.max(
                                          0,
                                          Math.round(
                                            Number(event.target.value) * 100,
                                          ),
                                        ),
                                      ),
                                    }
                                  : price,
                              ),
                            })
                          }
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <Switch
                        checked={offer.isActive}
                        onChange={(checked) =>
                          saveOffer(offer.id, { isActive: checked })
                        }
                        aria-label={`Activer ${offer.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-card border border-border-base bg-bg-surface p-5">
          <Settings2 className="h-6 w-6 text-primary" />
          <h2 className="mt-3 text-sm font-black">Fonctionnalités France</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(overview.catalog.config.featureFlags).map(
              ([key, active]) => (
                <div key={key} className="text-xs">
                  <Switch
                    checked={active}
                    label={featureFlagLabels[key] || key}
                    onChange={async (checked) => {
                      const config =
                        await services.realEstate.updateMarketConfig("FR", {
                          featureFlags: {
                            ...overview.catalog.config.featureFlags,
                            [key]: checked,
                          },
                        });
                      setOverview({
                        ...overview,
                        catalog: { ...overview.catalog, config },
                      });
                    }}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-card border border-border-base bg-bg-surface">
          <div className="border-b border-border-base p-5">
            <h2 className="text-sm font-black">Options de visibilité</h2>
            <p className="mt-1 text-micro text-text-muted">
              Prix, durée et activation par marché.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[35rem] text-left text-xs">
              <thead className="bg-bg-subtle text-text-muted">
                <tr>
                  <th className="p-3">Option</th>
                  <th className="p-3">Prix €</th>
                  <th className="p-3">Jours</th>
                  <th className="p-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {overview.catalog.addOns.map((addOn) => (
                  <tr key={addOn.id}>
                    <td className="p-3 font-black">{addOn.name}</td>
                    <td className="p-3">
                      <input
                        aria-label={`Prix de ${addOn.name} en euros`}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={addOn.price.amountMinor / 100}
                        className="h-control-md w-20 rounded-control border border-border-base bg-white px-2"
                        onBlur={(event) =>
                          saveAddOn(addOn.id, {
                            price: {
                              ...addOn.price,
                              amountMinor: Math.max(
                                0,
                                Math.round(Number(event.target.value) * 100),
                              ),
                            },
                          })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <input
                        aria-label={`Durée de ${addOn.name} en jours`}
                        type="number"
                        min="1"
                        defaultValue={addOn.validityDays || ""}
                        className="h-control-md w-16 rounded-control border border-border-base bg-white px-2"
                        onBlur={(event) =>
                          saveAddOn(addOn.id, {
                            validityDays: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Switch
                        checked={addOn.isActive}
                        onChange={(checked) =>
                          saveAddOn(addOn.id, { isActive: checked })
                        }
                        aria-label={`Activer ${addOn.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="overflow-hidden rounded-card border border-border-base bg-bg-surface">
          <div className="border-b border-border-base p-5">
            <h2 className="text-sm font-black">Types de biens</h2>
            <p className="mt-1 text-micro text-text-muted">
              Activation et transactions permises pour la France.
            </p>
          </div>
          <div className="divide-y divide-border-subtle">
            {overview.catalog.propertyTypes.map((type) => (
              <div
                key={type.type}
                className="flex items-center justify-between gap-3 p-3 text-xs"
              >
                <div>
                  <p className="font-black">{type.label}</p>
                  <p className="text-micro text-text-muted">
                    {type.transactionTypes.length} transaction(s) · schéma v
                    {type.schemaVersion}
                  </p>
                </div>
                <Switch
                  checked={type.isActive}
                  aria-label={`Activer ${type.label}`}
                  onChange={async (checked) => {
                    const updated =
                      await services.realEstate.updatePropertyType(
                        "FR",
                        type.type,
                        { isActive: checked },
                      );
                    setOverview({
                      ...overview,
                      catalog: {
                        ...overview.catalog,
                        propertyTypes: overview.catalog.propertyTypes.map(
                          (item) => (item.type === type.type ? updated : item),
                        ),
                      },
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface">
        <div className="border-b border-border-base p-5">
          <h2 className="text-sm font-black">Champs requis par marché</h2>
          <p className="mt-1 text-micro text-text-muted">
            Ces règles versionnées pilotent la validation de publication sans
            condition France dans l’interface.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-xs">
            <thead className="bg-bg-subtle text-text-muted">
              <tr>
                <th className="p-3">Champ</th>
                <th className="p-3">Type de bien</th>
                <th className="p-3">Transaction</th>
                <th className="p-3">Exigence</th>
                <th className="p-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {overview.catalog.fieldRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="p-3 font-black">
                    {overview.catalog.attributes.find(
                      (attribute) => attribute.id === rule.fieldId,
                    )?.label || rule.fieldId}
                  </td>
                  <td className="p-3">{rule.propertyType || "Tous"}</td>
                  <td className="p-3">{rule.transactionType || "Toutes"}</td>
                  <td className="p-3">
                    <select
                      aria-label={`Exigence pour ${rule.fieldId}`}
                      className="h-control-md rounded-control border border-border-base bg-white px-2"
                      value={rule.requirement}
                      onChange={(event) =>
                        updateFieldRule(rule, {
                          requirement: event.target
                            .value as PropertyFieldRule["requirement"],
                        })
                      }
                    >
                      <option value="required">Obligatoire</option>
                      <option value="recommended">Recommandé</option>
                      <option value="optional">Facultatif</option>
                      <option value="hidden">Masqué</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={rule.isActive}
                      onChange={(checked) =>
                        updateFieldRule(rule, { isActive: checked })
                      }
                      aria-label={`Activer la règle ${rule.fieldId}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border-base bg-bg-surface p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="text-sm font-black">File de modération</h2>
          </div>
          <div className="mt-4 space-y-3">
            {overview.moderationQueue.map((item) => (
              <article
                key={item.id}
                className="rounded-control border border-border-base p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black">Bien {item.propertyId}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {item.reasonLabel}
                    </p>
                  </div>
                  <Badge variant="warning">À examiner</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  to="/admin/moderation"
                >
                  Ouvrir dans la modération
                </Button>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-border-base bg-bg-surface p-5">
          <h2 className="text-sm font-black">Économie du canal</h2>
          <dl className="mt-4 space-y-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-text-muted">Leads par annonce active</dt>
              <dd className="font-black">{overview.metrics.leadsPerListing}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Réponse médiane</dt>
              <dd className="font-black">
                {overview.metrics.medianResponseMinutes} min
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Recherche → contact</dt>
              <dd className="font-black">
                {overview.metrics.searchToContactRatePercent} %
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Rétention agences (30 j)</dt>
              <dd className="font-black">
                {overview.metrics.agencyRetentionPercent} %
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Revenu mensuel récurrent</dt>
              <dd className="font-black">
                {formatImmoMoney(overview.metrics.subscriptionMrr)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Revenu options</dt>
              <dd className="font-black">
                {formatImmoMoney(overview.metrics.addOnRevenue)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Coût par lead</dt>
              <dd className="font-black">
                {formatImmoMoney(overview.metrics.costPerLead)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Revenu par lead</dt>
              <dd className="font-black">
                {formatImmoMoney(overview.metrics.revenuePerLead)}
              </dd>
            </div>
          </dl>
          <p className="mt-5 rounded-control bg-bg-subtle p-3 text-micro text-text-muted">
            Les métriques agrégées excluent l’adresse exacte, les documents
            privés et les signaux de risque internes.
          </p>
        </div>
      </section>

      {overview.syncErrors.length ? (
        <section className="rounded-card border border-danger-border bg-danger-surface p-5">
          <h2 className="text-sm font-black text-danger">
            Erreurs de synchronisation
          </h2>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-3 rounded-card border border-border-base bg-bg-surface p-4">
        <Button variant="outline" to="/admin/verifications">
          Vérifications professionnelles
        </Button>
        <Button variant="outline" to="/admin/moderation">
          Règles fraude & modération
        </Button>
      </section>
    </div>
  );
};
