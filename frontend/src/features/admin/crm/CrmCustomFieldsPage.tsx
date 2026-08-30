import React, { useEffect, useState } from "react";
import { Braces, Plus, SlidersHorizontal } from "lucide-react";
import type { CrmCustomField } from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { EmptyState, Skeleton } from "../../../design-system";
import { useToast } from "../../../app/providers/ToastProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useTranslation } from "../../../i18n/I18nProvider";

const entityLabels = {
  account: "Entreprise",
  contact: "Contact",
  opportunity: "Opportunité",
  task: "Tâche",
} as const;
const fieldLabels: Record<CrmCustomField["fieldType"], string> = {
  text: "Texte",
  textarea: "Texte long",
  integer: "Entier",
  decimal: "Décimal",
  money: "Montant",
  percentage: "Pourcentage",
  boolean: "Oui / Non",
  date: "Date",
  datetime: "Date et heure",
  email: "Email",
  phone: "Téléphone",
  url: "URL",
  single_select: "Choix unique",
  multi_select: "Choix multiples",
  user: "Utilisateur",
  account: "Entreprise",
  contact: "Contact",
};

export const CrmCustomFieldsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("admin.crmCustomFieldsPage.champsPersonnalisesCrmShongre"),
    description: t("admin.crmCustomFieldsPage.configurationDuModeleDeDonneesCrm"),
    canonicalPath: "/admin/crm/configuration/champs",
    noIndex: true,
  });
  const toast = useToast();
  const [fields, setFields] = useState<CrmCustomField[]>([]);
  const [entityType, setEntityType] =
    useState<CrmCustomField["entityType"]>("account");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [fieldType, setFieldType] =
    useState<CrmCustomField["fieldType"]>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");

  const load = async (type: CrmCustomField["entityType"]) => {
    setLoading(true);
    try {
      setFields(await services.crm.listCustomFields(type));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Champs indisponibles.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load(entityType);
  }, [entityType]);
  const changeName = (value: string) => {
    setName(value);
    if (!key)
      setKey(
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 63),
      );
  };
  const createField = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const field = await services.crm.createCustomField({
        entityType,
        name: name.trim(),
        key: key.trim(),
        description: description.trim() || undefined,
        fieldType,
        required,
        validation: {},
        options: ["single_select", "multi_select"].includes(fieldType)
          ? options
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      });
      setFields((items) => [...items, field]);
      setModalOpen(false);
      setName("");
      setKey("");
      setDescription("");
      setOptions("");
      setRequired(false);
      toast.success("Champ personnalisé créé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Champ non créé.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-text-inverse sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-micro font-bold uppercase tracking-wider text-violet-300">
              CRM · Configuration
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {t("admin.crmCustomFieldsPage.champsPersonnalises")}
            </h1>
            <p className="mt-1 text-xs text-text-disabled">
              {t("admin.crmCustomFieldsPage.etendezLeModeleSansModifierLesTablesOuLesComposants")}
            </p>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-icon-md w-icon-md" /> Nouveau champ
          </Button>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-3">
          <div className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-stone-500">
            <SlidersHorizontal className="h-icon-sm w-icon-sm" /> {t("admin.crmCustomFieldsPage.entite")}
          </div>
          <div
            className="flex flex-wrap rounded-lg bg-stone-100 p-1"
            role="tablist"
          >
            {Object.entries(entityLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={entityType === value}
                onClick={() =>
                  setEntityType(value as CrmCustomField["entityType"])
                }
                className={`rounded-md px-3 py-1.5 text-micro font-black ${entityType === value ? "bg-bg-surface text-stone-950 shadow-xs" : "text-stone-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-16 rounded-control" />
            <Skeleton className="h-16 rounded-control" />
          </div>
        ) : fields.length === 0 ? (
          <EmptyState
            icon={<Braces className="h-8 w-8" />}
            title={t("admin.crmCustomFieldsPage.aucunChampPersonnalise")}
            description={`Le modèle ${entityLabels[entityType].toLowerCase()} utilise seulement les champs standards.`}
            className="border-0 shadow-none"
            action={
              <Button size="sm" onClick={() => setModalOpen(true)}>
                {t("admin.crmCustomFieldsPage.creerUnChamp")}
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {fields.map((field) => (
              <article
                key={field.id}
                className="grid gap-2 px-4 py-4 sm:grid-cols-3 sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-black">{field.name}</strong>
                    {field.required && (
                      <span className="rounded-pill bg-danger-surface px-2 py-0.5 text-micro font-bold text-danger">
                        Obligatoire
                      </span>
                    )}
                  </div>
                  <code className="mt-1 block text-micro text-stone-500">
                    {field.key}
                  </code>
                  {field.description && (
                    <p className="mt-1 text-micro text-stone-500">
                      {field.description}
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold text-stone-700">
                  {fieldLabels[field.fieldType]}
                </span>
                <span className="rounded-pill bg-success-surface px-2 py-1 text-center text-micro font-bold text-success">
                  {field.status}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Nouveau champ · ${entityLabels[entityType]}`}
        description={t("admin.crmCustomFieldsPage.laCleDevientStableApresCreationEtSertAuxImports")}
      >
        <form onSubmit={createField} className="space-y-3.5 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nom" required>
              <Input
                value={name}
                onChange={(event) => changeName(event.target.value)}
                required
              />
            </FormField>
            <FormField label={t("admin.crmCustomFieldsPage.cleApi")} required>
              <Input
                value={key}
                onChange={(event) => setKey(event.target.value)}
                pattern="[a-z][a-z0-9_]{1,62}"
                required
              />
            </FormField>
          </div>
          <FormField label="Description">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
          <FormField label="Type">
            <Select
              aria-label={t("admin.crmCustomFieldsPage.typeDeChamp")}
              value={fieldType}
              onChange={(event) =>
                setFieldType(event.target.value as CrmCustomField["fieldType"])
              }
              options={Object.entries(fieldLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </FormField>
          {["single_select", "multi_select"].includes(fieldType) && (
            <FormField label={t("admin.crmCustomFieldsPage.optionsUneParLigne")} required>
              <Textarea
                rows={4}
                value={options}
                onChange={(event) => setOptions(event.target.value)}
                required
              />
            </FormField>
          )}
          <label className="flex items-center gap-2 rounded-control bg-stone-50 p-3 font-bold">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
            />{" "}
            Valeur obligatoire
          </label>
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
              {submitting ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
