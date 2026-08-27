import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  GitBranch,
  LockKeyhole,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  CRM_FIELD_CONSTRAINTS,
  type CrmPipeline,
  type CrmPipelineInput,
} from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { useToast } from "../../../app/providers/ToastProvider";
import { Skeleton } from "../../../design-system";
import { Button } from "../../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { Modal } from "../../../design-system/primitives/Modal";
import { usePageMeta } from "../../../hooks/usePageMeta";

type DraftStage = CrmPipelineInput["stages"][number];
type StageKind = "open" | "won" | "lost";

const initialDraft = (): CrmPipelineInput => ({
  name: "",
  description: "",
  isDefault: false,
  stages: [
    {
      name: "Nouveau",
      position: 0,
      defaultProbability: 10,
      colorToken: "blue",
      isOpen: true,
      isWon: false,
      isLost: false,
      requiredFields: [],
    },
    {
      name: "Gagné",
      position: 1,
      defaultProbability: 100,
      colorToken: "green",
      isOpen: false,
      isWon: true,
      isLost: false,
      requiredFields: [],
    },
    {
      name: "Perdu",
      position: 2,
      defaultProbability: 0,
      colorToken: "neutral",
      isOpen: false,
      isWon: false,
      isLost: true,
      requiredFields: ["lossReason"],
    },
  ],
});

function kindOf(stage: DraftStage): StageKind {
  return stage.isWon ? "won" : stage.isLost ? "lost" : "open";
}

function normalizePositions(stages: DraftStage[]) {
  return stages.map((stage, position) => ({ ...stage, position }));
}

function toDraft(pipeline: CrmPipeline): CrmPipelineInput {
  return {
    name: pipeline.name,
    description: pipeline.description,
    isDefault: pipeline.isDefault,
    stages: pipeline.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
      defaultProbability: stage.defaultProbability,
      colorToken: stage.colorToken,
      isOpen: stage.isOpen,
      isWon: stage.isWon,
      isLost: stage.isLost,
      requiredFields: stage.requiredFields,
      slaHours: stage.slaHours,
    })),
  };
}

export const CrmPipelineSettingsPage: React.FC = () => {
  usePageMeta({
    title: "Pipelines CRM | Shongre",
    description: "Configuration des étapes CRM.",
    canonicalPath: "/admin/crm/configuration/pipelines",
    noIndex: true,
  });
  const toast = useToast();
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CrmPipeline>();
  const [draft, setDraft] = useState<CrmPipelineInput>(initialDraft);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void services.crm
      .listPipelines()
      .then(setPipelines)
      .catch((reason) =>
        toast.error(
          reason instanceof Error ? reason.message : "Pipelines indisponibles.",
        ),
      )
      .finally(() => setLoading(false));
  }, [toast]);

  const openCreate = () => {
    setEditing(undefined);
    setDraft({ ...initialDraft(), isDefault: pipelines.length === 0 });
    setModalOpen(true);
  };

  const openEdit = (pipeline: CrmPipeline) => {
    setEditing(pipeline);
    setDraft(toDraft(pipeline));
    setModalOpen(true);
  };

  const updateStage = (index: number, changes: Partial<DraftStage>) => {
    setDraft((current) => ({
      ...current,
      stages: current.stages.map((stage, position) =>
        position === index ? { ...stage, ...changes } : stage,
      ),
    }));
  };

  const setStageKind = (index: number, kind: StageKind) => {
    updateStage(index, {
      isOpen: kind === "open",
      isWon: kind === "won",
      isLost: kind === "lost",
      defaultProbability:
        kind === "won"
          ? 100
          : kind === "lost"
            ? 0
            : draft.stages[index].defaultProbability,
      requiredFields: kind === "lost" ? ["lossReason"] : [],
      colorToken:
        kind === "won"
          ? "green"
          : kind === "lost"
            ? "neutral"
            : draft.stages[index].colorToken,
    });
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.stages.length)
        return current;
      const stages = [...current.stages];
      [stages[index], stages[destination]] = [
        stages[destination],
        stages[index],
      ];
      return { ...current, stages: normalizePositions(stages) };
    });
  };

  const addStage = () => {
    setDraft((current) => {
      const stages = [...current.stages];
      const terminalIndex = stages.findIndex((stage) => !stage.isOpen);
      const insertAt = terminalIndex < 0 ? stages.length : terminalIndex;
      stages.splice(insertAt, 0, {
        name: "Nouvelle étape",
        position: insertAt,
        defaultProbability: 50,
        colorToken: "violet",
        isOpen: true,
        isWon: false,
        isLost: false,
        requiredFields: [],
      });
      return { ...current, stages: normalizePositions(stages) };
    });
  };

  const removeStage = (index: number) => {
    setDraft((current) => ({
      ...current,
      stages: normalizePositions(
        current.stages.filter((_, position) => position !== index),
      ),
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const input: CrmPipelineInput = {
        ...draft,
        name: draft.name.trim(),
        description: draft.description?.trim() || undefined,
        stages: normalizePositions(draft.stages),
      };
      const saved = editing
        ? await services.crm.updatePipeline(editing.id, editing.version, input)
        : await services.crm.createPipeline(input);
      setPipelines((current) => {
        const normalized = saved.isDefault
          ? current.map((pipeline) => ({ ...pipeline, isDefault: false }))
          : current;
        const index = normalized.findIndex(
          (pipeline) => pipeline.id === saved.id,
        );
        if (index < 0) return [...normalized, saved];
        return normalized.map((pipeline) =>
          pipeline.id === saved.id ? saved : pipeline,
        );
      });
      setModalOpen(false);
      toast.success(editing ? "Pipeline mis à jour." : "Pipeline créé.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Pipeline non enregistré.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900">
              <GitBranch className="h-icon-lg w-icon-lg text-violet-300" />
            </span>
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-violet-300">
                CRM · Configuration
              </p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Pipelines & étapes
              </h1>
            </div>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-icon-md w-icon-md" /> Nouveau pipeline
          </Button>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          Les étapes, probabilités et états terminaux sont configurés par
          tenant, puis validés atomiquement côté backend.
        </p>
      </section>

      {loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        pipelines.map((pipeline) => (
          <section
            key={pipeline.id}
            className="overflow-hidden rounded-2xl border border-border-base bg-white shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black">{pipeline.name}</h2>
                  {pipeline.isDefault && (
                    <span className="rounded-full bg-primary-light px-2 py-1 text-micro font-bold text-primary">
                      Par défaut
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {pipeline.description ?? "Pipeline commercial"} · version{" "}
                  {pipeline.version}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-success-surface px-2 py-1 text-micro font-bold text-success">
                  <CheckCircle2 className="h-icon-sm w-icon-sm" /> Actif
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(pipeline)}
                >
                  <Pencil className="h-icon-sm w-icon-sm" /> Modifier
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border-subtle">
              {pipeline.stages.map((stage, index) => (
                <article
                  key={stage.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-4 sm:items-center"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 text-micro font-black text-white">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-black">
                        {stage.name}
                      </strong>
                      {stage.isWon && (
                        <span className="inline-flex items-center gap-1 text-micro font-bold text-success">
                          <CheckCircle2 className="h-icon-xs w-icon-xs" /> Gagné
                        </span>
                      )}
                      {stage.isLost && (
                        <span className="inline-flex items-center gap-1 text-micro font-bold text-danger">
                          <XCircle className="h-icon-xs w-icon-xs" /> Perdu
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-micro text-stone-500">
                      {stage.requiredFields.length
                        ? `Champs requis : ${stage.requiredFields.join(", ")}`
                        : "Aucun champ additionnel requis"}
                    </p>
                  </div>
                  <div>
                    <span className="text-micro text-stone-500">
                      Probabilité
                    </span>
                    <strong className="block text-sm">
                      {stage.defaultProbability}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-micro text-stone-500">Type</span>
                    <strong className="block text-xs">
                      {stage.isOpen ? "Ouverte" : "Terminale"}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
            <div className="flex items-start gap-2 border-t border-border-subtle bg-stone-50 p-4 text-micro text-stone-500">
              <LockKeyhole className="mt-0.5 h-icon-sm w-icon-sm shrink-0" />
              Les mises à jour utilisent un contrôle de version. Une étape déjà
              utilisée ne peut pas être supprimée.
            </div>
          </section>
        ))
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Modifier ${editing.name}` : "Nouveau pipeline"}
        description="Définissez un parcours ordonné avec une issue gagnée et une issue perdue."
        maxWidth="2xl"
      >
        <form onSubmit={save} className="space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nom" required>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </FormField>
            <label className="flex items-center gap-2 self-end rounded-xl bg-stone-50 px-3 py-2.5 font-bold">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isDefault: event.target.checked,
                  }))
                }
              />
              Pipeline par défaut
            </label>
          </div>
          <FormField label="Description">
            <Textarea
              rows={2}
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </FormField>

          <fieldset className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <legend className="font-black">Étapes ordonnées</legend>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addStage}
              >
                <Plus className="h-icon-sm w-icon-sm" /> Ajouter une étape
              </Button>
            </div>
            {draft.stages.map((stage, index) => (
              <div
                key={stage.id ?? `new-${index}`}
                className="grid gap-2 rounded-xl border border-border-subtle p-3 sm:grid-cols-5 sm:items-end"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-stone-950 text-micro font-black text-white">
                  {index + 1}
                </span>
                <FormField label={`Nom de l’étape ${index + 1}`} required>
                  <Input
                    value={stage.name}
                    onChange={(event) =>
                      updateStage(index, { name: event.target.value })
                    }
                    required
                  />
                </FormField>
                <FormField label="Probabilité" required>
                  <Input
                    type="number"
                    min={CRM_FIELD_CONSTRAINTS.stageProbabilityMin}
                    max={CRM_FIELD_CONSTRAINTS.stageProbabilityMax}
                    value={stage.defaultProbability}
                    disabled={!stage.isOpen}
                    onChange={(event) =>
                      updateStage(index, {
                        defaultProbability: Number(event.target.value),
                      })
                    }
                    required
                  />
                </FormField>
                <FormField label="Type">
                  <Select
                    aria-label={`Type de l’étape ${stage.name}`}
                    value={kindOf(stage)}
                    onChange={(event) =>
                      setStageKind(index, event.target.value as StageKind)
                    }
                    options={[
                      { value: "open", label: "Ouverte" },
                      { value: "won", label: "Gagnée" },
                      { value: "lost", label: "Perdue" },
                    ]}
                  />
                </FormField>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStage(index, -1)}
                    disabled={index === 0}
                    aria-label={`Remonter l’étape ${stage.name}`}
                    className="inline-flex h-control-md w-9 items-center justify-center rounded-control border border-stone-200 text-stone-600 enabled:hover:bg-stone-50 disabled:opacity-30"
                  >
                    <ArrowUp className="h-icon-sm w-icon-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(index, 1)}
                    disabled={index === draft.stages.length - 1}
                    aria-label={`Descendre l’étape ${stage.name}`}
                    className="inline-flex h-control-md w-9 items-center justify-center rounded-control border border-stone-200 text-stone-600 enabled:hover:bg-stone-50 disabled:opacity-30"
                  >
                    <ArrowDown className="h-icon-sm w-icon-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStage(index)}
                    disabled={draft.stages.length <= 3}
                    aria-label={`Supprimer l’étape ${stage.name}`}
                    className="inline-flex h-control-md w-9 items-center justify-center rounded-control border border-danger-border text-danger enabled:hover:bg-danger-surface disabled:opacity-30"
                  >
                    <Trash2 className="h-icon-sm w-icon-sm" />
                  </button>
                </div>
              </div>
            ))}
          </fieldset>

          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
