import React, { useState } from "react";
import type { MonetizationProduct } from "@shongre/contracts/monetization";
import { Button } from "../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";
import { Modal } from "../../design-system/primitives/Modal";

type AdminPlanDraftModalProps = {
  product: MonetizationProduct;
  targetVersion: number;
  saving: boolean;
  onClose: () => void;
  onCreate: (input: {
    product: MonetizationProduct;
    reason: string;
    effectiveFrom?: string;
  }) => Promise<void>;
};

const csv = (values: string[]) => values.join(", ");
const parseCsv = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
const localDateTime = (value?: string) => value?.slice(0, 16) || "";
const optionalIso = (value: string) =>
  value ? new Date(value).toISOString() : undefined;

export function AdminPlanDraftModal({
  product,
  targetVersion,
  saving,
  onClose,
  onCreate,
}: AdminPlanDraftModalProps) {
  const [draft, setDraft] = useState<MonetizationProduct>(() =>
    structuredClone(product),
  );
  const [reason, setReason] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");

  const updatePrice = (
    priceId: string,
    update: (
      price: MonetizationProduct["prices"][number],
    ) => MonetizationProduct["prices"][number],
  ) => {
    setDraft((current) => ({
      ...current,
      prices: current.prices.map((price) =>
        price.id === priceId ? update(price) : price,
      ),
    }));
  };

  const updateEntitlement = (
    key: string,
    update: (
      entitlement: MonetizationProduct["entitlements"][number],
    ) => MonetizationProduct["entitlements"][number],
  ) => {
    setDraft((current) => ({
      ...current,
      entitlements: current.entitlements.map((entitlement) =>
        entitlement.key === key ? update(entitlement) : entitlement,
      ),
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 8) return;
    await onCreate({
      product: draft,
      reason: reason.trim(),
      effectiveFrom: optionalIso(effectiveFrom),
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Configurer l’offre dans un brouillon"
      description="Prix, quotas, fonctionnalités et essai sont versionnés ensemble. La version publiée reste inchangée jusqu’à approbation."
      maxWidth="xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-control border border-border-base bg-bg-subtle p-3 text-xs">
          <strong>{product.name}</strong> · version cible v{targetVersion}
        </div>

        <section className="space-y-3" aria-labelledby="plan-identity-heading">
          <h3 id="plan-identity-heading" className="text-sm font-black">
            Présentation et disponibilité
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nom public" required>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="État">
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as MonetizationProduct["status"],
                  }))
                }
                className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm"
              >
                <option value="active">Actif après publication</option>
                <option value="disabled">Désactivé</option>
                <option value="archived">Archivé</option>
              </select>
            </FormField>
          </div>
          <FormField label="Description publique" required>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Ordre d’affichage">
              <Input
                type="number"
                min={0}
                value={draft.commercialProfile.displayOrder}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    commercialProfile: {
                      ...current.commercialProfile,
                      displayOrder: Math.max(0, Number(event.target.value)),
                    },
                  }))
                }
              />
            </FormField>
            <FormField
              label="Pays disponibles"
              hint="Codes séparés par des virgules."
            >
              <Input
                value={csv(draft.commercialProfile.countryAvailability)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    commercialProfile: {
                      ...current.commercialProfile,
                      countryAvailability: parseCsv(
                        event.target.value.toUpperCase(),
                      ) as MonetizationProduct["commercialProfile"]["countryAvailability"],
                    },
                  }))
                }
              />
            </FormField>
            <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
              <input
                type="checkbox"
                checked={draft.recommended}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    recommended: event.target.checked,
                  }))
                }
              />
              Offre recommandée
            </label>
          </div>
          <FormField
            label="Catégories ciblées"
            hint="Identifiants séparés par des virgules. Les règles serveur restent autoritaires."
          >
            <Input
              value={csv(draft.commercialProfile.targetCategoryIds)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  commercialProfile: {
                    ...current.commercialProfile,
                    targetCategoryIds: parseCsv(event.target.value),
                  },
                }))
              }
            />
          </FormField>
        </section>

        <section className="space-y-3" aria-labelledby="plan-prices-heading">
          <h3 id="plan-prices-heading" className="text-sm font-black">
            Prix
          </h3>
          <div className="space-y-3">
            {draft.prices.map((price) => (
              <div
                key={price.id}
                className="grid gap-3 rounded-control border border-border-base p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <FormField label={`Montant ${price.billingPeriod} (centimes)`}>
                  <Input
                    type="number"
                    min={0}
                    value={price.amount.amountMinor}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        amount: {
                          ...current.amount,
                          amountMinor: Math.max(0, Number(event.target.value)),
                        },
                      }))
                    }
                  />
                </FormField>
                <FormField label="TVA (points de base)">
                  <Input
                    type="number"
                    min={0}
                    max={10_000}
                    value={price.taxRateBps}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        taxRateBps: Math.min(
                          10_000,
                          Math.max(0, Number(event.target.value)),
                        ),
                      }))
                    }
                  />
                </FormField>
                <FormField label="Début du prix">
                  <Input
                    type="datetime-local"
                    value={localDateTime(price.effectiveFrom)}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        effectiveFrom: optionalIso(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <FormField label="Fin du prix">
                  <Input
                    type="datetime-local"
                    value={localDateTime(price.effectiveUntil)}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        effectiveUntil: optionalIso(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={price.priceIncludesTax}
                    onChange={(event) =>
                      updatePrice(price.id, (current) => ({
                        ...current,
                        priceIncludesTax: event.target.checked,
                      }))
                    }
                  />
                  Prix TTC
                </label>
              </div>
            ))}
          </div>
        </section>

        <section
          className="space-y-3"
          aria-labelledby="plan-entitlements-heading"
        >
          <div>
            <h3 id="plan-entitlements-heading" className="text-sm font-black">
              Quotas et fonctionnalités
            </h3>
            <p className="mt-1 text-micro text-text-muted">
              Ces valeurs alimentent la comparaison, l’usage et les contrôles
              serveur.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {draft.entitlements.map((entitlement) => (
              <div
                key={entitlement.key}
                className="rounded-control border border-border-base p-3"
              >
                <div className="text-micro font-bold text-text-muted">
                  {entitlement.key}
                </div>
                <FormField label={entitlement.label} className="mt-2">
                  {typeof entitlement.value === "boolean" ? (
                    <select
                      value={entitlement.value ? "true" : "false"}
                      onChange={(event) =>
                        updateEntitlement(entitlement.key, (current) => ({
                          ...current,
                          value: event.target.value === "true",
                        }))
                      }
                      className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm"
                    >
                      <option value="true">Inclus</option>
                      <option value="false">Non inclus</option>
                    </select>
                  ) : (
                    <Input
                      type={
                        typeof entitlement.value === "number"
                          ? "number"
                          : "text"
                      }
                      min={
                        typeof entitlement.value === "number" ? 0 : undefined
                      }
                      value={
                        Array.isArray(entitlement.value)
                          ? csv(entitlement.value)
                          : entitlement.value
                      }
                      onChange={(event) =>
                        updateEntitlement(entitlement.key, (current) => ({
                          ...current,
                          value: Array.isArray(current.value)
                            ? parseCsv(event.target.value)
                            : typeof current.value === "number"
                              ? Math.max(0, Number(event.target.value))
                              : event.target.value,
                        }))
                      }
                    />
                  )}
                </FormField>
              </div>
            ))}
          </div>
        </section>

        {draft.kind === "subscription" ? (
          <section className="space-y-3" aria-labelledby="plan-trial-heading">
            <h3 id="plan-trial-heading" className="text-sm font-black">
              Essai et transitions
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={draft.commercialProfile.trialPolicy.enabled}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          enabled: event.target.checked,
                          durationDays: event.target.checked
                            ? current.commercialProfile.trialPolicy
                                .durationDays || 30
                            : undefined,
                        },
                      },
                    }))
                  }
                />
                Essai activé
              </label>
              <FormField label="Durée (jours)">
                <Input
                  type="number"
                  min={1}
                  disabled={!draft.commercialProfile.trialPolicy.enabled}
                  value={draft.commercialProfile.trialPolicy.durationDays || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          durationDays: Math.max(1, Number(event.target.value)),
                        },
                      },
                    }))
                  }
                />
              </FormField>
              <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={
                    draft.commercialProfile.trialPolicy.requiresPaymentMethod
                  }
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          requiresPaymentMethod: event.target.checked,
                        },
                      },
                    }))
                  }
                />
                Moyen de paiement requis
              </label>
              <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={draft.commercialProfile.trialPolicy.autoConverts}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          autoConverts: event.target.checked,
                        },
                      },
                    }))
                  }
                />
                Conversion automatique
              </label>
              <label className="flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-3 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={
                    draft.commercialProfile.trialPolicy.firstTimeCustomersOnly
                  }
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          firstTimeCustomersOnly: event.target.checked,
                        },
                      },
                    }))
                  }
                />
                Nouveaux clients uniquement
              </label>
              <FormField label="Marchés éligibles">
                <Input
                  value={csv(
                    draft.commercialProfile.trialPolicy.eligibleMarketCodes,
                  )}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          eligibleMarketCodes: parseCsv(
                            event.target.value.toUpperCase(),
                          ) as MonetizationProduct["commercialProfile"]["trialPolicy"]["eligibleMarketCodes"],
                        },
                      },
                    }))
                  }
                />
              </FormField>
              <FormField label="Audiences éligibles">
                <Input
                  value={csv(
                    draft.commercialProfile.trialPolicy.eligibleAudiences,
                  )}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          eligibleAudiences: parseCsv(
                            event.target.value.toLowerCase(),
                          ) as MonetizationProduct["commercialProfile"]["trialPolicy"]["eligibleAudiences"],
                        },
                      },
                    }))
                  }
                />
              </FormField>
              <FormField label="Début de campagne d’essai">
                <Input
                  type="datetime-local"
                  value={localDateTime(
                    draft.commercialProfile.trialPolicy.campaignStartsAt,
                  )}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          campaignStartsAt: optionalIso(event.target.value),
                        },
                      },
                    }))
                  }
                />
              </FormField>
              <FormField label="Fin de campagne d’essai">
                <Input
                  type="datetime-local"
                  value={localDateTime(
                    draft.commercialProfile.trialPolicy.campaignEndsAt,
                  )}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        trialPolicy: {
                          ...current.commercialProfile.trialPolicy,
                          campaignEndsAt: optionalIso(event.target.value),
                        },
                      },
                    }))
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Montées autorisées"
                hint="Identifiants séparés par des virgules."
              >
                <Input
                  value={csv(draft.commercialProfile.upgradeProductIds)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        upgradeProductIds: parseCsv(event.target.value),
                      },
                    }))
                  }
                />
              </FormField>
              <FormField
                label="Baisses autorisées"
                hint="Identifiants séparés par des virgules."
              >
                <Input
                  value={csv(draft.commercialProfile.downgradeProductIds)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      commercialProfile: {
                        ...current.commercialProfile,
                        downgradeProductIds: parseCsv(event.target.value),
                      },
                    }))
                  }
                />
              </FormField>
            </div>
          </section>
        ) : null}

        <section className="space-y-3 border-t border-border-subtle pt-4">
          <FormField
            label="Motif du changement"
            required
            hint="Visible dans l’audit et par l’approbateur."
          >
            <Textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </FormField>
          <FormField
            label="Activation planifiée"
            hint="Laissez vide pour une activation à la publication."
          >
            <Input
              type="datetime-local"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </FormField>
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving || reason.trim().length < 8}>
            {saving ? "Création…" : "Créer le brouillon"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
