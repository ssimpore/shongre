import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Flag, Plus, Save, ShieldCheck } from "lucide-react";
import type {
  FeatureFlagDefinition,
  FeatureFlagRule,
} from "@shongre/contracts/feature-flags";
import { FEATURE_FLAG_CONSTRAINTS } from "@shongre/contracts/feature-flags";
import type { FeatureFlagAdminEntry } from "../../api/contracts/feature-flags.contract";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import { Badge, Button, Select, Skeleton } from "../../design-system";
import {
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";
import { usePageMeta } from "../../hooks/usePageMeta";

interface DefinitionDraft {
  description: string;
  owner: string;
  defaultEnabled: boolean;
  exposure: FeatureFlagDefinition["exposure"];
  lifecycle: FeatureFlagDefinition["lifecycle"];
  expiresAt: string;
  reason: string;
}

const toDraft = (value: FeatureFlagDefinition): DefinitionDraft => ({
  description: value.description,
  owner: value.owner,
  defaultEnabled: value.defaultEnabled,
  exposure: value.exposure,
  lifecycle: value.lifecycle,
  expiresAt: value.expiresAt?.slice(0, 16) ?? "",
  reason: "",
});

export const AdminFeatureFlagsPage: React.FC = () => {
  usePageMeta({
    title: "Fonctionnalités — Console Shongre",
    description: "Pilotage audité des activations progressives Shongre.",
    canonicalPath: "/admin/fonctionnalites",
    noIndex: true,
  });
  const toast = useToast();
  const [entries, setEntries] = useState<FeatureFlagAdminEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<DefinitionDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState({
    marketCode: "FR",
    enabled: true,
    rolloutPercentage: 100,
    priority: 100,
    reason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await services.featureFlags.getAdminSnapshot();
      setEntries(result);
      setSelectedKey((current) => current || result[0]?.definition.key || "");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Les fonctionnalités n’ont pas pu être chargées.",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => entries.find((entry) => entry.definition.key === selectedKey) ?? null,
    [entries, selectedKey],
  );

  useEffect(() => {
    if (selected) setDraft(toDraft(selected.definition));
  }, [selected]);

  const saveDefinition = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !draft || draft.reason.trim().length < 10) {
      toast.error("Indiquez un motif d’au moins 10 caractères.");
      return;
    }
    setSaving(true);
    try {
      await services.featureFlags.upsertDefinition(selected.definition.key, {
        description: draft.description,
        owner: draft.owner,
        defaultEnabled: draft.defaultEnabled,
        exposure: draft.exposure,
        lifecycle: draft.lifecycle,
        expiresAt: draft.expiresAt
          ? new Date(draft.expiresAt).toISOString()
          : undefined,
        reason: draft.reason.trim(),
      });
      toast.success("Définition enregistrée avec son motif d’audit.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const addRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || newRule.reason.trim().length < 10) {
      toast.error("Indiquez le motif opérationnel de cette règle.");
      return;
    }
    setSaving(true);
    try {
      await services.featureFlags.upsertRule(
        selected.definition.key,
        undefined,
        {
          marketCode: newRule.marketCode.trim().toUpperCase() || undefined,
          enabled: newRule.enabled,
          rolloutPercentage: newRule.rolloutPercentage,
          priority: newRule.priority,
          reason: newRule.reason.trim(),
        },
      );
      setNewRule((current) => ({ ...current, reason: "" }));
      toast.success("Règle de déploiement ajoutée.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Création de règle impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 text-primary">
          <Flag className="h-icon-md w-icon-md" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Gouvernance produit
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-stone-900">
          Fonctionnalités et déploiements progressifs
        </h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-stone-600">
          Les valeurs absentes, expirées ou indisponibles restent désactivées.
          Chaque modification exige un propriétaire et un motif d’audit.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-sidebar-wide">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-sidebar-wide">
          <nav
            aria-label="Fonctionnalités"
            className="overflow-hidden rounded-2xl border border-border-base bg-white shadow-xs"
          >
            <ul className="divide-y divide-border-subtle">
              {entries.map((entry) => (
                <li key={entry.definition.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(entry.definition.key)}
                    aria-current={
                      selectedKey === entry.definition.key ? "page" : undefined
                    }
                    className={`w-full p-4 text-left ${selectedKey === entry.definition.key ? "bg-primary/5" : "hover:bg-stone-50"}`}
                  >
                    <span className="block break-all font-mono text-xs font-bold text-stone-900">
                      {entry.definition.key}
                    </span>
                    <span className="mt-2 flex items-center gap-2">
                      <Badge
                        variant={
                          entry.definition.defaultEnabled
                            ? "success"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {entry.definition.defaultEnabled
                          ? "Active par défaut"
                          : "Désactivée"}
                      </Badge>
                      <span className="text-micro text-stone-500">
                        {entry.rules.length} règle(s)
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {selected && draft ? (
            <div className="space-y-4">
              <form
                onSubmit={saveDefinition}
                className="space-y-4 rounded-2xl border border-border-base bg-white p-5 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
                  <div>
                    <p className="font-mono text-sm font-black text-stone-900">
                      {selected.definition.key}
                    </p>
                    <p className="mt-1 text-micro text-stone-500">
                      Mise à jour{" "}
                      {new Date(selected.definition.updatedAt).toLocaleString(
                        "fr-FR",
                      )}
                    </p>
                  </div>
                  <ShieldCheck
                    className="h-icon-lg w-icon-lg text-success"
                    aria-label="Modifications auditées"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Équipe propriétaire" required>
                    <Input
                      value={draft.owner}
                      onChange={(event) =>
                        setDraft({ ...draft, owner: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField label="Expiration facultative">
                    <Input
                      type="datetime-local"
                      value={draft.expiresAt}
                      onChange={(event) =>
                        setDraft({ ...draft, expiresAt: event.target.value })
                      }
                    />
                  </FormField>
                </div>

                <FormField label="Description" required>
                  <Textarea
                    rows={3}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                  />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-stone-700">
                    Exposition
                    <Select
                      className="mt-1 block w-full"
                      labelledByAncestor
                      value={draft.exposure}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          exposure: event.target
                            .value as DefinitionDraft["exposure"],
                        })
                      }
                    >
                      <option value="public">Client public</option>
                      <option value="server">Serveur uniquement</option>
                    </Select>
                  </label>
                  <label className="text-xs font-semibold text-stone-700">
                    Cycle de vie
                    <Select
                      className="mt-1 block w-full"
                      labelledByAncestor
                      value={draft.lifecycle}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          lifecycle: event.target
                            .value as DefinitionDraft["lifecycle"],
                        })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archivée</option>
                    </Select>
                  </label>
                  <label className="flex items-center gap-2 self-end rounded-lg border border-border-base px-3 py-2.5 text-xs font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={draft.defaultEnabled}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          defaultEnabled: event.target.checked,
                        })
                      }
                    />
                    Active par défaut
                  </label>
                </div>

                <FormField label="Motif de la modification" required>
                  <Input
                    value={draft.reason}
                    onChange={(event) =>
                      setDraft({ ...draft, reason: event.target.value })
                    }
                    placeholder="Pourquoi ce changement est-il nécessaire ?"
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving || draft.reason.trim().length < 10}
                  >
                    <Save className="h-icon-md w-icon-md" /> Enregistrer
                  </Button>
                </div>
              </form>

              <section
                className="rounded-2xl border border-border-base bg-white p-5 shadow-xs"
                aria-labelledby="flag-rules-title"
              >
                <h2
                  id="flag-rules-title"
                  className="text-base font-black text-stone-900"
                >
                  Règles ciblées
                </h2>
                <div className="mt-3 space-y-2">
                  {selected.rules.length === 0 ? (
                    <p className="rounded-xl bg-stone-50 p-4 text-xs text-stone-600">
                      Aucune règle : la valeur par défaut s’applique.
                    </p>
                  ) : (
                    selected.rules.map((rule: FeatureFlagRule) => (
                      <div
                        key={rule.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-base p-3"
                      >
                        <div>
                          <p className="text-xs font-bold text-stone-900">
                            {rule.marketCode || "Tous les marchés"} ·{" "}
                            {rule.rolloutPercentage}% · priorité {rule.priority}
                          </p>
                          <p className="mt-1 text-micro text-stone-500">
                            {rule.reason}
                          </p>
                        </div>
                        <Badge
                          variant={rule.enabled ? "success" : "neutral"}
                          size="sm"
                        >
                          {rule.enabled ? "Active" : "Désactivée"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={addRule}
                  className="mt-5 space-y-3 border-t border-border-subtle pt-4"
                >
                  <h3 className="flex items-center gap-2 text-sm font-black text-stone-900">
                    <Plus className="h-icon-md w-icon-md" /> Nouvelle règle
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField label="Marché">
                      <Input
                        maxLength={FEATURE_FLAG_CONSTRAINTS.marketCodeLength}
                        value={newRule.marketCode}
                        onChange={(event) =>
                          setNewRule({
                            ...newRule,
                            marketCode: event.target.value.toUpperCase(),
                          })
                        }
                      />
                    </FormField>
                    <FormField label="Déploiement (%)">
                      <Input
                        type="number"
                        min={FEATURE_FLAG_CONSTRAINTS.rolloutPercentageMin}
                        max={FEATURE_FLAG_CONSTRAINTS.rolloutPercentageMax}
                        value={newRule.rolloutPercentage}
                        onChange={(event) =>
                          setNewRule({
                            ...newRule,
                            rolloutPercentage: Number(event.target.value),
                          })
                        }
                      />
                    </FormField>
                    <FormField label="Priorité">
                      <Input
                        type="number"
                        min={FEATURE_FLAG_CONSTRAINTS.priorityMin}
                        max={FEATURE_FLAG_CONSTRAINTS.priorityMax}
                        value={newRule.priority}
                        onChange={(event) =>
                          setNewRule({
                            ...newRule,
                            priority: Number(event.target.value),
                          })
                        }
                      />
                    </FormField>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700">
                    <input
                      type="checkbox"
                      checked={newRule.enabled}
                      onChange={(event) =>
                        setNewRule({
                          ...newRule,
                          enabled: event.target.checked,
                        })
                      }
                    />{" "}
                    Valeur activée pour la cohorte
                  </label>
                  <FormField label="Motif de la règle" required>
                    <Input
                      value={newRule.reason}
                      onChange={(event) =>
                        setNewRule({ ...newRule, reason: event.target.value })
                      }
                      placeholder="Objectif et validation attendue du déploiement"
                    />
                  </FormField>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={saving || newRule.reason.trim().length < 10}
                    >
                      Ajouter la règle
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          ) : (
            <div className="rounded-2xl border border-border-base bg-white p-8 text-center text-sm text-stone-500">
              Aucune fonctionnalité sélectionnée.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
