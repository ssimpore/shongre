import React, { useState, useEffect } from "react";
import { Select } from "../../../../../design-system";
import {
  TaxonomyNode,
  TaxonomyLevel,
  ConditionSchemeId,
} from "../../../../../domains/taxonomy/taxonomy.types";
import { taxonomyAdminRepository } from "../../../../../repositories/taxonomy.repository";
import { Modal } from "../../../../../design-system/primitives/Modal";
import { Button } from "../../../../../design-system/primitives/Button";
import {
  Input,
  FormField,
  Textarea,
  Checkbox,
} from "../../../../../design-system/primitives/FormField";
import { CategoryIcon } from "../../../../../design-system/primitives/CategoryIcon";
import { useToast } from "../../../../../app/providers/ToastProvider";
import { useAuth } from "../../../../../app/providers/AuthProvider";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentNode?: TaxonomyNode | null;
  onSuccess: (newNode: TaxonomyNode) => void;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  isOpen,
  onClose,
  parentNode,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();

  // Infer target level based on parent
  const targetLevel: TaxonomyLevel = !parentNode
    ? "category"
    : parentNode.level === "category"
      ? "subcategory"
      : parentNode.level === "subcategory"
        ? "type"
        : "subtype";

  const [name, setName] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [publishable, setPublishable] = useState(
    targetLevel === "type" || targetLevel === "subtype",
  );
  const [conditionScheme, setConditionScheme] = useState<ConditionSchemeId>(
    parentNode?.conditionScheme || "consumer_product",
  );
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setShortLabel("");
      setSlug("");
      setDescription("");
      setPublishable(targetLevel === "type" || targetLevel === "subtype");
      setConditionScheme(parentNode?.conditionScheme || "consumer_product");
      setStatus("draft");
    }
  }, [isOpen, parentNode, targetLevel]);

  // Auto-generate slug from name if not manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom complet est obligatoire.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Le slug URL est obligatoire.");
      return;
    }

    try {
      setIsSubmitting(true);
      const actor = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || "Admin",
            role: currentUser.staffRole || currentUser.role,
          }
        : undefined;

      const created = await taxonomyAdminRepository.createNode(
        {
          parentId: parentNode?.id,
          level: targetLevel,
          name: name.trim(),
          label: name.trim(),
          shortLabel: shortLabel.trim() || undefined,
          slug: slug.trim().toLowerCase(),
          description: description.trim() || undefined,
          publishable,
          status,
          conditionScheme,
        },
        actor,
      );

      toast.success(
        `Catégorie "${created.name}" créée avec succès (Brouillon).`,
      );
      onSuccess(created);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création du nœud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        parentNode
          ? `Ajouter une sous-rubrique sous "${parentNode.name}"`
          : "Créer une nouvelle catégorie racine"
      }
      description={t("admin.addNodeModal.cetteOperationAjouteUnNouveau")}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Parent & Level Context */}
        <div className="p-3 bg-bg-subtle rounded-control border border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-semibold">Niveau cible :</span>
            <span className="px-2 py-0.5 rounded-pill bg-primary-light text-primary font-bold uppercase text-micro">
              {targetLevel}
            </span>
          </div>
          {parentNode && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <CategoryIcon category={parentNode} size="xs" />
              <span className="font-semibold">{parentNode.name}</span>
            </div>
          )}
        </div>

        <FormField
          label={t("admin.addNodeModal.nomCompletCanoniqueFrancais")}
          required
          hint="Nom complet faisant autorité (ex: Voitures d'occasion, Matériel Professionnel & BTP)"
        >
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t(
              "admin.addNodeModal.exEquipementsDeProtectionIndividuelle",
            )}
            autoFocus
          />
        </FormField>

        <FormField
          label="Nom court / Alias compact (optionnel)"
          hint="Alias compact pour mobile, grilles réduites et sélecteurs (ex: Équipements Pro)"
        >
          <Input
            value={shortLabel}
            onChange={(e) => setShortLabel(e.target.value)}
            placeholder={t("admin.addNodeModal.exEquipementsPro")}
          />
        </FormField>

        {/* Live UI Rendering Preview */}
        <div className="p-3 bg-bg-base rounded-control border border-border-base text-xs space-y-1">
          <div className="text-stone-500 font-bold uppercase tracking-wider text-micro">
            {t("admin.addNodeModal.apercuDuRenduUi")}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">
              {t("admin.addNodeModal.renduStandardDetailleSeo")}
            </span>
            <span className="font-bold text-text-main">
              {name || "Nom complet"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">
              Rendu compact (mobile/filtres) :
            </span>
            <span className="font-bold text-primary">
              {shortLabel.trim() || name || "Nom compact"}
            </span>
          </div>
        </div>

        <FormField
          label="Slug URL"
          required
          hint="Identifiant d'URL unique parmi les catégories soeurs (ex: equipements-pro)"
        >
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug-url"
          />
        </FormField>

        <FormField label="Description (optionnelle)">
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("admin.addNodeModal.descriptionInterneOuSeoPour")}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <FormField label="Statut initial">
            <Select
              size="compact"
              className="w-full"
              labelledByAncestor
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="draft">
                Brouillon (non visible publiquement)
              </option>
              <option value="active">Actif</option>
            </Select>
          </FormField>

          <FormField label={t("admin.addNodeModal.schemaDEtat")}>
            <Select
              size="compact"
              className="w-full"
              labelledByAncestor
              value={conditionScheme}
              onChange={(e) => setConditionScheme(e.target.value as any)}
            >
              <option value="consumer_product">Produit standard</option>
              <option value="vehicle">
                {t("admin.addNodeModal.vehicule")}
              </option>
              <option value="real_estate">Immobilier</option>
              <option value="professional">Professionnel</option>
              <option value="job">Emploi</option>
              <option value="service">Service</option>
            </Select>
          </FormField>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
            <Checkbox
              checked={publishable}
              onChange={(e) => setPublishable(e.target.checked)}
            />
            <span>{t("admin.addNodeModal.nUdPubliableAutoriseLa")}</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Création en cours..." : "Créer la catégorie"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
