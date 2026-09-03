import React, { useState, useEffect } from "react";
import { Select } from "../../../../design-system";
import {
  TaxonomyNode,
  TaxonomyCapabilities,
  FulfillmentMode,
  TaxonomyPrimaryCta,
} from "../../../../domains/taxonomy/taxonomy.types";
import { taxonomyAdminRepository } from "../../../../repositories/taxonomy.repository";
import { taxonomyService } from "../../../../domains/taxonomy/taxonomy.service";
import { Button } from "../../../../design-system/primitives/Button";
import {
  Input,
  FormField,
  Textarea,
  Checkbox,
} from "../../../../design-system/primitives/FormField";
import { Badge } from "../../../../design-system/primitives/Badge";
import { CategoryIcon } from "../../../../design-system/primitives/CategoryIcon";
import { useToast } from "../../../../app/providers/ToastProvider";
import { useAuth } from "../../../../app/providers/AuthProvider";
import {
  Save,
  Copy,
  FolderTree,
  Archive,
  Trash2,
  AlertTriangle,
  Layers,
  Settings2,
  FileCheck,
  Truck,
  Globe,
  Search,
  Eye,
  Plus,
  X,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { IconPickerModal } from "./modals/IconPickerModal";
import { MoveNodeModal } from "./modals/MoveNodeModal";
import { DeprecateNodeModal } from "./modals/DeprecateNodeModal";
import { DeleteNodeModal } from "./modals/DeleteNodeModal";
import { plural } from "../../../../utilities/formatters";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { themeColors } from "@shongre/design-tokens";
import { useMarketLocation } from "../../../../app/providers/MarketLocationProvider";
import { TAXONOMY_PUBLICATION_CONSTRAINTS } from "@shongre/contracts/taxonomy";
import { publicRouteUrl } from "../../../../domains/market/market-routing";

export interface TaxonomyNodeEditorProps {
  nodeId: string;
  allNodes: TaxonomyNode[];
  onNodeUpdated: () => void;
  onSelectNode: (node: TaxonomyNode) => void;
}

type EditorTab =
  | "general"
  | "attributes"
  | "publication_filters"
  | "capabilities"
  | "markets"
  | "seo"
  | "previews"
  | "impact";

export const TaxonomyNodeEditor: React.FC<TaxonomyNodeEditorProps> = ({
  nodeId,
  allNodes,
  onNodeUpdated,
  onSelectNode,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { activeMarket, availableMarkets } = useMarketLocation();
  const defaultMarket =
    availableMarkets.find((market) => market.isDefault) || activeMarket;
  const nonDefaultMarkets = availableMarkets.filter(
    (market) => market.code !== defaultMarket.code,
  );
  const node = taxonomyAdminRepository.getNode(nodeId);

  const [activeTab, setActiveTab] = useState<EditorTab>("general");

  // General Form States
  const [name, setName] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [iconName, setIconName] = useState("Folder");
  const [accentColor, setAccentColor] = useState<string>(themeColors.black);
  const [publishable, setPublishable] = useState(true);
  const [status, setStatus] = useState<TaxonomyNode["status"]>("active");
  const [conditionScheme, setConditionScheme] =
    useState<TaxonomyNode["conditionScheme"]>("consumer_product");
  const [aliases, setAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState("");

  // Attributes State
  const [localAttributeIds, setLocalAttributeIds] = useState<string[]>([]);
  const [selectedRegistryAttrId, setSelectedRegistryAttrId] = useState("");

  // Capabilities State
  const [capabilities, setCapabilities] = useState<TaxonomyCapabilities>({
    canSell: true,
    canGive: true,
    canExchange: true,
    canRent: false,
    reservationAllowed: true,
    securePaymentAllowed: true,
    negotiablePrice: true,
    fulfillmentModes: ["hand_delivery", "parcel_shipping"],
  });

  // SEO States
  const [metaTitleTemplate, setMetaTitleTemplate] = useState("");
  const [metaDescriptionTemplate, setMetaDescriptionTemplate] = useState("");
  const [indexable, setIndexable] = useState(true);
  const [primaryCta, setPrimaryCta] =
    useState<TaxonomyPrimaryCta>("contact_seller");
  const [standardDurationDays, setStandardDurationDays] = useState(60);
  const [standardMediaAllowance, setStandardMediaAllowance] = useState(12);
  const [moderationReviewMode, setModerationReviewMode] = useState<
    "standard" | "enhanced" | "manual"
  >("standard");

  // Market Overrides State
  const [selectedMarketCode, setSelectedMarketCode] = useState(
    nonDefaultMarkets[0]?.code || activeMarket.code,
  );
  const [marketOverrideEnabled, setMarketOverrideEnabled] = useState(false);
  const [marketDirectPurchase, setMarketDirectPurchase] = useState(true);

  // Preview States
  const [previewUserType, setPreviewUserType] = useState<"individual" | "pro">(
    "individual",
  );
  const [previewMarket, setPreviewMarket] = useState(activeMarket.code);

  // Modals
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeprecateModalOpen, setIsDeprecateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when nodeId or node changes
  useEffect(() => {
    if (node) {
      setName(node.name || "");
      setShortLabel(node.shortLabel || "");
      setSlug(node.slug || "");
      setDescription(node.description || "");
      setIconName(node.iconName || "Folder");
      setAccentColor(node.accentColor || themeColors["stone-500"]);
      setPublishable(
        node.publishable ?? (node.level === "type" || node.level === "subtype"),
      );
      setStatus(node.status || "active");
      setConditionScheme(node.conditionScheme || "consumer_product");
      setAliases(node.aliases ? [...node.aliases] : []);
      setLocalAttributeIds(node.attributeIds ? [...node.attributeIds] : []);

      if (node.capabilities) {
        setCapabilities({
          canSell: node.capabilities.canSell ?? true,
          canGive: node.capabilities.canGive ?? true,
          canExchange: node.capabilities.canExchange ?? true,
          canRent: node.capabilities.canRent ?? false,
          reservationAllowed: node.capabilities.reservationAllowed ?? true,
          securePaymentAllowed: node.capabilities.securePaymentAllowed ?? true,
          negotiablePrice: node.capabilities.negotiablePrice ?? true,
          fulfillmentModes: node.capabilities.fulfillmentModes || [
            "hand_delivery",
            "parcel_shipping",
          ],
        });
      }

      setMetaTitleTemplate(node.seo?.metaTitleTemplate || "");
      setMetaDescriptionTemplate(node.seo?.metaDescriptionTemplate || "");
      setIndexable(node.seo?.indexable ?? true);
      setPrimaryCta(node.publication?.primaryCta || "contact_seller");
      setStandardDurationDays(
        node.publication?.standardPolicy.durationDays ||
          TAXONOMY_PUBLICATION_CONSTRAINTS.durationDays.default,
      );
      setStandardMediaAllowance(
        node.publication?.standardPolicy.mediaAllowance ||
          TAXONOMY_PUBLICATION_CONSTRAINTS.mediaAllowance.default,
      );
      setModerationReviewMode(node.moderation?.reviewMode || "standard");

      // Market override sync for selected market
      const override = node.marketOverrides?.[selectedMarketCode];
      setMarketOverrideEnabled(Boolean(override));
      if (override?.capabilities?.securePaymentAllowed !== undefined) {
        setMarketDirectPurchase(override.capabilities.securePaymentAllowed);
      } else {
        setMarketDirectPurchase(
          node.capabilities?.securePaymentAllowed ?? true,
        );
      }
    }
  }, [node, nodeId, selectedMarketCode]);

  if (!node) {
    return (
      <div className="bg-bg-surface rounded-2xl border border-border-base p-8 text-center text-xs text-stone-500">
        <Layers className="w-8 h-8 mx-auto text-stone-300 mb-2" />
        <p className="font-semibold text-text-secondary">
          {t("admin.taxonomyNodeEditor.selectionnezUneCategorieDansL")}
        </p>
      </div>
    );
  }

  // Resolved schema & hierarchy data
  const resolvedSchema = taxonomyService.resolvePublicationSchema(
    node.id,
    previewMarket,
  );
  const ancestors = taxonomyService.getAncestors(node.id);
  const impact = taxonomyAdminRepository.analyzeNodeImpact(node.id);
  const allAttributes = taxonomyAdminRepository.getAllAttributes();

  // Inherited attribute IDs from ancestors
  const inheritedAttributeIds = new Set<string>();
  ancestors.forEach((a) => {
    if (a.attributeIds) {
      a.attributeIds.forEach((id) => inheritedAttributeIds.add(id));
    }
  });

  const availableRegistryAttributes = allAttributes.filter(
    (a) =>
      !localAttributeIds.includes(a.id) && !inheritedAttributeIds.has(a.id),
  );

  const handleCopyId = () => {
    navigator.clipboard.writeText(node.id);
    toast.success(`ID "${node.id}" copié dans le presse-papier.`);
  };

  const handleAddAlias = () => {
    if (newAlias.trim() && !aliases.includes(newAlias.trim())) {
      setAliases([...aliases, newAlias.trim()]);
      setNewAlias("");
    }
  };

  const handleRemoveAlias = (aliasToRemove: string) => {
    setAliases(aliases.filter((a) => a !== aliasToRemove));
  };

  const handleAddAttribute = () => {
    if (
      selectedRegistryAttrId &&
      !localAttributeIds.includes(selectedRegistryAttrId)
    ) {
      setLocalAttributeIds([...localAttributeIds, selectedRegistryAttrId]);
      setSelectedRegistryAttrId("");
    }
  };

  const handleRemoveLocalAttribute = (attrId: string) => {
    setLocalAttributeIds(localAttributeIds.filter((id) => id !== attrId));
  };

  const toggleFulfillmentMode = (mode: FulfillmentMode) => {
    setCapabilities((prev) => {
      const current = prev.fulfillmentModes || [];
      const next = current.includes(mode)
        ? current.filter((m) => m !== mode)
        : [...current, mode];
      return { ...prev, fulfillmentModes: next };
    });
  };

  const handleDuplicate = async () => {
    try {
      const actor = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || "Admin",
            role: currentUser.staffRole || currentUser.role,
          }
        : undefined;
      const copy = await taxonomyAdminRepository.duplicateNode(node.id, actor);
      toast.success(`Catégorie dupliquée : "${copy.name}".`);
      onNodeUpdated();
      onSelectNode(copy);
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la duplication.");
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setIsSubmitting(true);
      const actor = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || "Admin",
            role: currentUser.staffRole || currentUser.role,
          }
        : undefined;

      await taxonomyAdminRepository.updateNode(
        node.id,
        {
          name: name.trim(),
          label: name.trim(),
          shortLabel: shortLabel.trim() || undefined,
          slug: slug.trim().toLowerCase(),
          description: description.trim() || undefined,
          iconName,
          accentColor,
          publishable,
          status,
          conditionScheme,
          aliases,
          attributeIds: localAttributeIds,
          capabilities,
          seo: {
            metaTitleTemplate: metaTitleTemplate.trim() || undefined,
            metaDescriptionTemplate:
              metaDescriptionTemplate.trim() || undefined,
            indexable,
          },
          publication: {
            steps: node.publication?.steps || [
              "intent",
              "taxonomy",
              "essential",
              "condition_history",
              "price_compensation",
              "fulfillment_location",
              "media_documents",
              "contact_preferences",
              "preview",
              "standard_or_upgrades",
              "confirmation",
            ],
            primaryCta,
            standardPolicy: {
              enabled: true,
              label: "Publication standard gratuite",
              eligibleSellerTypes: node.publication?.standardPolicy
                .eligibleSellerTypes || ["individual", "professional"],
              durationDays: standardDurationDays,
              mediaAllowance: standardMediaAllowance,
              includesMessaging: true,
              includesListingManagement: true,
              includesStandardStatistics: true,
              paidUpgradesOptional: true,
            },
          },
          moderation: {
            policyId: node.moderation?.policyId || `moderation.${node.id}.v1`,
            reviewMode: moderationReviewMode,
            prohibitedItemRuleIds: node.moderation?.prohibitedItemRuleIds || [
              "prohibited.illegal",
            ],
            safetyNoticeKeys: node.moderation?.safetyNoticeKeys || [
              "safety.general",
            ],
            sensitiveAttributeIds: node.moderation?.sensitiveAttributeIds || [],
          },
        },
        actor,
      );

      toast.success(
        "Modifications enregistrées avec succès dans le brouillon.",
      );
      onNodeUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMarketOverride = async () => {
    try {
      const actor = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || "Admin",
            role: currentUser.staffRole || currentUser.role,
          }
        : undefined;
      if (marketOverrideEnabled) {
        await taxonomyAdminRepository.setMarketOverride(
          node.id,
          selectedMarketCode,
          {
            capabilities: {
              securePaymentAllowed: marketDirectPurchase,
            },
          },
          actor,
        );
        toast.success(
          `Surcharge enregistrée pour le marché ${selectedMarketCode}.`,
        );
      } else {
        await taxonomyAdminRepository.resetMarketOverride(
          node.id,
          selectedMarketCode,
          actor,
        );
        toast.success(
          `Surcharge supprimée pour ${selectedMarketCode} (héritage ${defaultMarket.name} restauré).`,
        );
      }
      onNodeUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Erreur surcharge marché.");
    }
  };

  return (
    <div className="bg-bg-surface rounded-2xl border border-border-base shadow-xs overflow-hidden">
      {/* Node Header Banner */}
      <div className="p-5 border-b border-border-subtle bg-gradient-to-r from-bg-subtle via-white to-bg-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CategoryIcon
            category={{ ...node, iconName, accentColor }}
            size="lg"
            withBackground
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-micro bg-stone-200 text-stone-800 px-2 py-0.5 rounded font-mono uppercase font-bold">
                {node.level}
              </span>
              <h2 className="text-lg font-bold text-text-main">{node.name}</h2>
              {node.shortLabel && (
                <span className="text-xs bg-warning-surface text-warning border border-warning-border px-2 py-0.5 rounded-pill font-bold">
                  Alias : {node.shortLabel}
                </span>
              )}
              {status === "active" ? (
                <Badge variant="success">Actif</Badge>
              ) : status === "draft" ? (
                <Badge variant="neutral">Brouillon</Badge>
              ) : (
                <Badge variant="urgent">
                  {t("admin.taxonomyNodeEditor.deprecie")}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500 font-mono mt-1">
              <span className="flex items-center gap-1">
                ID : <strong>{node.id}</strong>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 hover:text-text-main rounded min-w-6 min-h-6 inline-flex items-center justify-center"
                  aria-label={t("admin.taxonomyNodeEditor.copierLIdStable", {
                    id: node.id,
                  })}
                >
                  <Copy className="w-icon-xs h-icon-xs" />
                </button>
              </span>
              <span>•</span>
              <span>Slug : /{node.slug}</span>
            </div>
          </div>
        </div>

        {/* Global Node Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMoveModalOpen(true)}
            leftIcon={<FolderTree className="w-icon-sm h-icon-sm" />}
          >
            {t("admin.taxonomyNodeEditor.deplacer")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            leftIcon={<Copy className="w-icon-sm h-icon-sm" />}
          >
            Dupliquer
          </Button>

          {node.status !== "deprecated" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeprecateModalOpen(true)}
              leftIcon={
                <Archive className="w-icon-sm h-icon-sm text-warning" />
              }
            >
              {t("admin.taxonomyNodeEditor.deprecier2")}
            </Button>
          )}

          {/* Delete lives in the danger zone at the foot of the editor, not here.
              It previously sat 8px from "Déprécier" and 8px above "Enregistrer" —
              an irreversible action wedged between the two most-used controls. */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveGeneral}
            disabled={isSubmitting}
            leftIcon={<Save className="w-icon-sm h-icon-sm" />}
          >
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Breadcrumb Path Context */}
      <div className="px-5 py-2.5 bg-bg-base border-b border-border-subtle flex items-center gap-1.5 text-xs text-stone-500 font-medium overflow-x-auto no-scrollbar">
        <span className="text-stone-500 uppercase tracking-wider text-micro mr-1 shrink-0">
          {t("admin.taxonomyNodeEditor.hierarchie")}
        </span>
        {ancestors.map((a, i) => (
          <React.Fragment key={a.id}>
            <button
              type="button"
              onClick={() => onSelectNode(a)}
              className="hover:text-primary hover:underline shrink-0"
            >
              {a.name}
            </button>
            <span className="text-stone-300">/</span>
          </React.Fragment>
        ))}
        <span className="font-bold text-text-main shrink-0">{node.name}</span>
      </div>

      {/* Editor Tabs Navigation */}
      <div className="flex items-center gap-1 px-5 border-b border-border-base bg-bg-surface overflow-x-auto no-scrollbar text-xs font-semibold">
        {[
          {
            id: "general",
            label: t("admin.attributeEditModal.general"),
            icon: Settings2,
          },
          {
            id: "attributes",
            label: `Attributs (${(node.attributeIds?.length || 0) + inheritedAttributeIds.size})`,
            icon: Layers,
          },
          {
            id: "publication_filters",
            label: "Publication & Filtres",
            icon: FileCheck,
          },
          {
            id: "capabilities",
            label: t("admin.taxonomyNodeEditor.transactionsLivraison"),
            icon: Truck,
          },
          {
            id: "markets",
            label: t("admin.taxonomyNodeEditor.marchesHeritage"),
            icon: Globe,
          },
          { id: "seo", label: "SEO", icon: Search },
          {
            id: "previews",
            label: t("admin.taxonomyNodeEditor.apercusDirects"),
            icon: Eye,
          },
          {
            id: "impact",
            label: t("admin.taxonomyNodeEditor.impactSecurite"),
            icon: ShieldCheck,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as EditorTab)}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-stone-500 hover:text-text-main hover:border-stone-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {/* ========================================================================= */}
        {/* 1. GENERAL TAB */}
        {/* ========================================================================= */}
        {activeTab === "general" && (
          <div className="space-y-5 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label={t("admin.taxonomyNodeEditor.nomCompletDeLaCategorie")}
                required
                hint="Libellé complet faisant autorité (titres de pages, H1, SEO)"
              >
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>

              <FormField
                label="Nom court / Alias compact (optionnel)"
                hint="Alias compact pour mobile, grilles réduites et filtres compacts"
              >
                <Input
                  value={shortLabel}
                  onChange={(e) => setShortLabel(e.target.value)}
                  placeholder={t(
                    "admin.taxonomyNodeEditor.exVoituresMaterielPro",
                  )}
                />
              </FormField>
            </div>

            {/* Live UI Rendering Preview */}
            <div className="p-3.5 bg-bg-base rounded-control border border-border-base text-xs space-y-1.5">
              <div className="text-stone-500 font-bold uppercase tracking-wider text-micro">
                {t("admin.taxonomyNodeEditor.apercuDuRenduVisuel")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">
                  {t("admin.taxonomyNodeEditor.renduStandardPageAnnonceH1")}
                </span>
                <span className="font-bold text-text-main">
                  {name || node.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">
                  Rendu compact (Mobile, Tuiles, Filtres) :
                </span>
                <span className="font-bold text-primary">
                  {shortLabel.trim() || name || node.name}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Slug URL"
                required
                hint="Attention : modifier le slug altère l'URL publique de cette catégorie."
              >
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              </FormField>

              <FormField label={t("admin.taxonomyNodeEditor.schemaDEtat")}>
                <Select
                  size="compact"
                  className="w-full"
                  labelledByAncestor
                  value={conditionScheme}
                  onChange={(e) => setConditionScheme(e.target.value as any)}
                >
                  <option value="consumer_product">
                    {t("admin.taxonomyNodeEditor.produitStandardNeufTresBon")}
                  </option>
                  <option value="vehicle">
                    {t("admin.taxonomyNodeEditor.vehicule0KmExcellentControle")}
                  </option>
                  <option value="real_estate">
                    {t("admin.taxonomyNodeEditor.immobilierNeufVefaRenoveA")}
                  </option>
                  <option value="professional">
                    {t(
                      "admin.taxonomyNodeEditor.professionnelNeufGarantiReconditionne",
                    )}
                  </option>
                  <option value="job">
                    Emploi (Temps plein, Partiel, Freelance...)
                  </option>
                  <option value="service">
                    {t("admin.taxonomyNodeEditor.serviceADomicileEnAtelier")}
                  </option>
                </Select>
              </FormField>
            </div>

            <FormField label="Description">
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "admin.taxonomyNodeEditor.descriptionCanoniqueEtEditorialeDe",
                )}
              />
            </FormField>

            {/* Icon & Color Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-bg-subtle rounded-control border border-border-subtle">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  {t("admin.taxonomyNodeEditor.iconeVectorielle")}
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-control bg-bg-surface border border-border-base flex items-center justify-center">
                    <CategoryIcon
                      category={{ ...node, iconName, accentColor }}
                      size="md"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsIconModalOpen(true)}
                  >
                    {t("admin.taxonomyNodeEditor.changerLIcone")}
                    {iconName})
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  Couleur d'accentuation :
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label={t(
                      "admin.taxonomyNodeEditor.couleurDAccentuationDeLa",
                    )}
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-control-md rounded-control cursor-pointer border border-border-base"
                  />
                  <span className="text-xs font-mono font-bold text-stone-700">
                    {accentColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Aliases & Synonyms */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                <span>
                  {t("admin.taxonomyNodeEditor.aliasSynonymesDeRecherche")}
                  {aliases.length})
                </span>
                <span className="text-micro text-stone-500 font-normal">
                  {t("admin.taxonomyNodeEditor.amelioreLesResultatsDuMoteur")}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleAddAlias())
                  }
                  placeholder={t(
                    "admin.taxonomyNodeEditor.ajouterUnSynonymeExSmartphone",
                  )}
                  aria-label={t("admin.taxonomyNodeEditor.ajouterUnSynonyme")}
                />
                <Button variant="outline" size="sm" onClick={handleAddAlias}>
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {aliases.map((alias) => (
                  <span
                    key={alias}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-800 text-xs font-medium rounded-pill border border-stone-200"
                  >
                    <span>{alias}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(alias)}
                      aria-label={t(
                        "admin.taxonomyNodeEditor.retirerCetElement",
                      )}
                      className="text-stone-500 hover:text-stone-700"
                    >
                      <X className="w-icon-xs h-icon-xs" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Lifecycle & Status */}
            <div className="p-4 bg-bg-base rounded-control border border-border-base space-y-3">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                {t("admin.taxonomyNodeEditor.cycleDeViePublication")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label={t("admin.taxonomyNodeEditor.statutOperationnel")}
                >
                  <Select
                    size="compact"
                    className="w-full"
                    labelledByAncestor
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="active">
                      {t("admin.taxonomyNodeEditor.actifEnLigneEtIndexable")}
                    </option>
                    <option value="draft">
                      {t(
                        "admin.taxonomyNodeEditor.brouillonInvisibleAuxUtilisateurs",
                      )}
                    </option>
                    <option value="disabled">
                      {t("admin.taxonomyNodeEditor.desactive")}
                    </option>
                    <option value="deprecated">
                      {t(
                        "admin.taxonomyNodeEditor.deprecieArchivageProgressif",
                      )}
                    </option>
                  </Select>
                </FormField>

                <div className="pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                    <Checkbox
                      checked={publishable}
                      onChange={(e) => setPublishable(e.target.checked)}
                    />
                    <span>
                      {t(
                        "admin.taxonomyNodeEditor.nUdPubliableSelectionnableComme",
                      )}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Danger zone.
                Deleting a taxonomy node is irreversible and cascades into every
                listing filed under it, so it is separated from the routine
                actions, styled as a hazard, and still gated by ConfirmModal. */}
            <div className="rounded-control border border-danger-border bg-danger-surface p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-danger flex items-center gap-2">
                    <AlertTriangle className="w-icon-md h-icon-md shrink-0" />
                    {t("admin.taxonomyNodeEditor.zoneDeDanger")}
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 max-w-prose">
                    {t("admin.taxonomyNodeEditor.laSuppressionEstDefinitiveEt")}
                    <strong>
                      {t("admin.taxonomyNodeEditor.deprecier")}
                    </strong>{" "}
                    {t(
                      "admin.taxonomyNodeEditor.pourLaRetirerDesNouvellesPublicationsSansToucherAL",
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  leftIcon={<Trash2 className="w-icon-sm h-icon-sm" />}
                  className="border-danger-border text-danger hover:bg-danger hover:text-text-inverse shrink-0"
                >
                  {t("admin.taxonomyNodeEditor.supprimerCeNUd")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ATTRIBUTES TAB */}
        {/* ========================================================================= */}
        {activeTab === "attributes" && (
          <div className="space-y-6">
            {/* Inherited Attributes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                  <span>
                    {t("admin.taxonomyNodeEditor.attributsHeritesDesParents")}
                    {inheritedAttributeIds.size})
                  </span>
                  <span className="text-micro font-normal text-stone-500 lowercase">
                    {t(
                      "admin.taxonomyNodeEditor.reglesAutomatiquesDeLaTaxonomie",
                    )}
                  </span>
                </h3>
              </div>

              {inheritedAttributeIds.size === 0 ? (
                <div className="p-3.5 text-xs text-stone-500 bg-bg-subtle rounded-control border border-border-subtle">
                  {t(
                    "admin.taxonomyNodeEditor.aucunAttributHeriteDesCategories",
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from(inheritedAttributeIds).map((attrId) => {
                    const attr = allAttributes.find((a) => a.id === attrId);
                    if (!attr) return null;
                    return (
                      <div
                        key={attr.id}
                        className="p-3 bg-stone-50 border border-stone-200 rounded-control text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-800">
                            {attr.label}
                          </span>
                          <span className="text-micro bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-mono font-bold">
                            {t("admin.taxonomyNodeEditor.herite")}
                          </span>
                        </div>
                        <p className="text-micro text-stone-500 font-mono">
                          ID : {attr.id} • Type : {attr.dataType}{" "}
                          {attr.unit ? `(${attr.unit})` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Local Attributes Assigned to this node */}
            <div className="space-y-3 pt-4 border-t border-border-subtle">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                    {t("admin.taxonomyNodeEditor.attributsSpecifiquesAssignes")}
                    {localAttributeIds.length})
                  </h3>
                  <p className="text-xs text-stone-500">
                    {t(
                      "admin.taxonomyNodeEditor.cesAttributsEnrichissentLeFormulaire",
                    )}
                  </p>
                </div>

                {/* Add Attribute Dropdown */}
                <div className="flex items-center gap-2">
                  <Select
                    size="compact"
                    className="max-w-xs w-auto"
                    aria-label={t(
                      "admin.taxonomyNodeEditor.ajouterUnAttributDuRegistre",
                    )}
                    value={selectedRegistryAttrId}
                    onChange={(e) => setSelectedRegistryAttrId(e.target.value)}
                  >
                    <option value="">
                      {t("admin.taxonomyNodeEditor.choisirDansLeRegistre")}
                    </option>
                    {availableRegistryAttributes.map((attr) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.label} ({attr.dataType})
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddAttribute}
                    disabled={!selectedRegistryAttrId}
                    leftIcon={<Plus className="w-icon-sm h-icon-sm" />}
                  >
                    Assigner
                  </Button>
                </div>
              </div>

              {localAttributeIds.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 border border-dashed rounded-control">
                  {t(
                    "admin.taxonomyNodeEditor.aucunAttributLocalAssigneChoisissez",
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {localAttributeIds.map((attrId) => {
                    const attr = allAttributes.find((a) => a.id === attrId);
                    if (!attr) return null;
                    return (
                      <div
                        key={attr.id}
                        className="p-3.5 bg-bg-surface border border-border-base rounded-control flex items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-main">
                              {attr.label}
                            </span>
                            <span className="text-micro bg-primary-light text-primary px-1.5 py-0.5 rounded font-mono font-bold">
                              {attr.dataType}
                            </span>
                            {attr.unit && (
                              <span className="text-micro bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                {attr.unit}
                              </span>
                            )}
                            {attr.required && (
                              <span className="text-micro bg-danger-surface text-danger px-1.5 py-0.5 rounded font-bold">
                                Requis
                              </span>
                            )}
                            {attr.filterable && (
                              <span className="text-micro bg-info-surface text-info px-1.5 py-0.5 rounded font-bold">
                                Filtre
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 font-mono">
                            ID : {attr.id} • Code : {attr.code}
                          </p>
                        </div>

                        <Button
                          aria-label="Retirer cet attribut"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLocalAttribute(attr.id)}
                          className="text-stone-500 hover:text-danger"
                        >
                          <Trash2 className="w-icon-sm h-icon-sm" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. PUBLICATION & FILTERS TAB */}
        {/* ========================================================================= */}
        {activeTab === "publication_filters" && resolvedSchema && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 rounded-control border border-border-base bg-bg-surface p-4 sm:grid-cols-2">
              <FormField label={t("admin.taxonomyNodeEditor.primaryCta")}>
                <Select
                  size="compact"
                  className="w-full"
                  labelledByAncestor
                  value={primaryCta}
                  onChange={(event) =>
                    setPrimaryCta(event.target.value as TaxonomyPrimaryCta)
                  }
                >
                  <option value="contact_seller">
                    {t("admin.taxonomyNodeEditor.cta.contactSeller")}
                  </option>
                  <option value="apply">
                    {t("admin.taxonomyNodeEditor.cta.apply")}
                  </option>
                  <option value="request_quote">
                    {t("admin.taxonomyNodeEditor.cta.requestQuote")}
                  </option>
                  <option value="request_visit">
                    {t("admin.taxonomyNodeEditor.cta.requestVisit")}
                  </option>
                  <option value="request_test_drive">
                    {t("admin.taxonomyNodeEditor.cta.requestTestDrive")}
                  </option>
                  <option value="request_lesson">
                    {t("admin.taxonomyNodeEditor.cta.requestLesson")}
                  </option>
                  <option value="check_availability">
                    {t("admin.taxonomyNodeEditor.cta.checkAvailability")}
                  </option>
                  <option value="propose_exchange">
                    {t("admin.taxonomyNodeEditor.cta.proposeExchange")}
                  </option>
                </Select>
              </FormField>
              <FormField
                label={t("admin.taxonomyNodeEditor.moderationReviewMode")}
              >
                <Select
                  size="compact"
                  className="w-full"
                  labelledByAncestor
                  value={moderationReviewMode}
                  onChange={(event) =>
                    setModerationReviewMode(
                      event.target.value as "standard" | "enhanced" | "manual",
                    )
                  }
                >
                  <option value="standard">
                    {t("admin.taxonomyNodeEditor.review.standard")}
                  </option>
                  <option value="enhanced">
                    {t("admin.taxonomyNodeEditor.review.enhanced")}
                  </option>
                  <option value="manual">
                    {t("admin.taxonomyNodeEditor.review.manual")}
                  </option>
                </Select>
              </FormField>
              <FormField
                label={t("admin.taxonomyNodeEditor.standardDurationDays")}
              >
                <Input
                  type="number"
                  min={TAXONOMY_PUBLICATION_CONSTRAINTS.durationDays.min}
                  max={TAXONOMY_PUBLICATION_CONSTRAINTS.durationDays.max}
                  step={TAXONOMY_PUBLICATION_CONSTRAINTS.durationDays.step}
                  value={standardDurationDays}
                  onChange={(event) =>
                    setStandardDurationDays(Number(event.target.value))
                  }
                />
              </FormField>
              <FormField
                label={t("admin.taxonomyNodeEditor.standardMediaAllowance")}
              >
                <Input
                  type="number"
                  min={TAXONOMY_PUBLICATION_CONSTRAINTS.mediaAllowance.min}
                  max={TAXONOMY_PUBLICATION_CONSTRAINTS.mediaAllowance.max}
                  step={TAXONOMY_PUBLICATION_CONSTRAINTS.mediaAllowance.step}
                  value={standardMediaAllowance}
                  onChange={(event) =>
                    setStandardMediaAllowance(Number(event.target.value))
                  }
                />
              </FormField>
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveGeneral}
                  disabled={isSubmitting}
                >
                  {t("admin.taxonomyNodeEditor.savePublicationConfiguration")}
                </Button>
              </div>
            </div>

            {/* Resolved publication schema summary */}
            <div className="p-4 bg-bg-subtle rounded-control border border-border-subtle space-y-3">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-icon-md h-icon-md text-primary" />
                <span>
                  {t(
                    "admin.taxonomyNodeEditor.schemaDePublicationResoluEffectif",
                  )}
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-stone-500">
                    Total champs attributs :
                  </span>
                  <p className="font-bold text-text-main">
                    {resolvedSchema.attributes.length}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">
                    {t("admin.taxonomyNodeEditor.optionsDEtat")}
                  </span>
                  <p className="font-bold text-text-main">
                    {plural(resolvedSchema.conditionScheme.length, "palier")}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">
                    {t("admin.taxonomyNodeEditor.venteAutorisee")}
                  </span>
                  <p className="font-bold text-success">
                    {resolvedSchema.capabilities.canSell ? "Oui" : "Non"}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">
                    {t("admin.taxonomyNodeEditor.sequestreCbActif")}
                  </span>
                  <p className="font-bold text-primary">
                    {resolvedSchema.capabilities.securePaymentAllowed
                      ? "Actif"
                      : "Désactivé"}
                  </p>
                </div>
              </div>
            </div>

            {/* Search filter facets */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                {t("admin.taxonomyNodeEditor.facettesDeFiltresDeriveesPour")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resolvedSchema.attributes
                  .filter((a) => a.filterable)
                  .map((attr, idx) => (
                    <div
                      key={attr.id}
                      className="p-3 bg-bg-surface border border-border-base rounded-control text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-text-main">
                          {attr.label}
                        </span>
                        <p className="text-micro text-stone-500 font-mono">
                          Filtre type : {attr.dataType}
                        </p>
                      </div>
                      <span className="text-micro bg-stone-100 text-text-secondary px-2 py-0.5 rounded font-mono">
                        Rang #{idx + 1}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. CAPABILITIES TAB */}
        {/* ========================================================================= */}
        {activeTab === "capabilities" && (
          <div className="space-y-6 max-w-3xl">
            <div className="p-3.5 bg-info-surface border border-info-border rounded-control text-xs text-info space-y-1">
              <div className="font-bold text-info flex items-center gap-1.5">
                <HelpCircle className="w-icon-md h-icon-md text-info" />
                <span>
                  {t("admin.taxonomyNodeEditor.frontiereDArchitecture")}
                </span>
              </div>
              <p>
                {t("admin.taxonomyNodeEditor.laTaxonomieDefinitL")}
                <strong>
                  {t("admin.taxonomyNodeEditor.eligibiliteIntrinseque")}
                </strong>{" "}
                {t(
                  "admin.taxonomyNodeEditor.deLaCategorieExPeutOnVendreEnLigneEnvoyer",
                )}{" "}
                <strong>
                  {t("admin.taxonomyNodeEditor.gestionnaireDePrestataires")}
                </strong>
                .
              </p>
            </div>

            {/* Transactions Capabilities */}
            <div className="p-4 bg-bg-base rounded-control border border-border-base space-y-3">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                {t("admin.taxonomyNodeEditor.modesDeTransactionAutorises")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.canSell}
                    onChange={(e) =>
                      setCapabilities({
                        ...capabilities,
                        canSell: e.target.checked,
                      })
                    }
                  />
                  <span>Vente standard (Prix d'achat direct)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.securePaymentAllowed}
                    onChange={(e) =>
                      setCapabilities({
                        ...capabilities,
                        securePaymentAllowed: e.target.checked,
                      })
                    }
                  />
                  <span>
                    {t(
                      "admin.taxonomyNodeEditor.paiementSecuriseEnLigneSequestre",
                    )}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.reservationAllowed}
                    onChange={(e) =>
                      setCapabilities({
                        ...capabilities,
                        reservationAllowed: e.target.checked,
                      })
                    }
                  />
                  <span>
                    {t(
                      "admin.taxonomyNodeEditor.reservationAvecAcompteDeSequestre",
                    )}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.canGive}
                    onChange={(e) =>
                      setCapabilities({
                        ...capabilities,
                        canGive: e.target.checked,
                      })
                    }
                  />
                  <span>
                    {t("admin.taxonomyNodeEditor.donGratuitAutorise")}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.canExchange}
                    onChange={(e) =>
                      setCapabilities({
                        ...capabilities,
                        canExchange: e.target.checked,
                      })
                    }
                  />
                  <span>
                    {t("admin.taxonomyNodeEditor.trocEchangeAutorise")}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.canRent}
                    onChange={(e) =>
                      setCapabilities({
                        ...capabilities,
                        canRent: e.target.checked,
                      })
                    }
                  />
                  <span>{t("admin.taxonomyNodeEditor.locationAutorisee")}</span>
                </label>
              </div>
            </div>

            {/* Fulfillment Modes */}
            <div className="p-4 bg-bg-base rounded-control border border-border-base space-y-3">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                {t("admin.taxonomyNodeEditor.modesDeLivraisonRemiseEligibles")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  {
                    id: "hand_delivery",
                    label: "Remise en main propre (Validation code PIN)",
                  },
                  {
                    id: "parcel_shipping",
                    label: t(
                      "admin.taxonomyNodeEditor.expeditionParColisStandardRelaisDomicile",
                    ),
                  },
                  {
                    id: "heavy_delivery",
                    label: "Transporteur volumineux / Palette / Engins",
                  },
                  {
                    id: "digital_download",
                    label: t(
                      "admin.taxonomyNodeEditor.telechargementNumeriqueAccesDirect",
                    ),
                  },
                  {
                    id: "on_site_service",
                    label: t(
                      "admin.taxonomyNodeEditor.prestationSurPlaceInterventionADomicile",
                    ),
                  },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className="flex items-center gap-2 cursor-pointer font-medium text-stone-800"
                  >
                    <Checkbox
                      checked={capabilities.fulfillmentModes.includes(
                        mode.id as FulfillmentMode,
                      )}
                      onChange={() =>
                        toggleFulfillmentMode(mode.id as FulfillmentMode)
                      }
                    />
                    <span>{mode.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. MARKETS TAB */}
        {/* ========================================================================= */}
        {activeTab === "markets" && (
          <div className="space-y-6 max-w-3xl">
            <div className="p-3.5 bg-bg-subtle rounded-control border border-border-subtle text-xs space-y-1">
              <div className="font-bold text-text-main flex items-center gap-1.5">
                <Globe className="w-icon-md h-icon-md text-primary" />
                <span>
                  {t(
                    "admin.taxonomyNodeEditor.architectureMultiMarchesEtHeritageCanonique",
                  )}
                </span>
              </div>
              <p className="text-text-secondary">
                <strong>
                  {defaultMarket.name} ({defaultMarket.code})
                </strong>{" "}
                {t(
                  "admin.taxonomyNodeEditor.constitueLaReferenceCanoniqueLesAutresMarchesHeritentAutomatiquementDe",
                )}
              </p>
            </div>

            {/* Country Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              {nonDefaultMarkets.map(({ code }) => {
                const isSelected = selectedMarketCode === code;
                const hasOverride = Boolean(node.marketOverrides?.[code]);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedMarketCode(code)}
                    className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-stone-900 text-text-inverse shadow-xs"
                        : "bg-bg-base text-text-secondary hover:bg-bg-subtle border border-border-base"
                    }`}
                  >
                    <span>{code}</span>
                    {hasOverride && (
                      <span
                        className="w-1.5 h-1.5 rounded-pill bg-amber-400"
                        title="Surcharge active"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Market Override Controls */}
            <div className="p-5 bg-bg-surface border border-border-base rounded-control space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                    {t("admin.taxonomyNodeEditor.marche")} {selectedMarketCode}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {marketOverrideEnabled
                      ? "Ce marché possède une configuration personnalisée."
                      : `Hérite automatiquement de tous les paramètres de ${defaultMarket.name}.`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={marketOverrideEnabled ? "outline" : "primary"}
                    size="sm"
                    onClick={() =>
                      setMarketOverrideEnabled(!marketOverrideEnabled)
                    }
                  >
                    {marketOverrideEnabled
                      ? "Supprimer la surcharge"
                      : "Personnaliser ce marché"}
                  </Button>
                </div>
              </div>

              {marketOverrideEnabled && (
                <div className="space-y-4 pt-3 border-t border-border-subtle text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
                    <Checkbox
                      checked={marketDirectPurchase}
                      onChange={(e) =>
                        setMarketDirectPurchase(e.target.checked)
                      }
                    />
                    <span>
                      {t(
                        "admin.taxonomyNodeEditor.autoriserLePaiementSecuriseDirectPourLeMarche",
                      )}{" "}
                      {selectedMarketCode}
                    </span>
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveMarketOverride}
                    >
                      {t("admin.taxonomyNodeEditor.enregistrerLaSurcharge")}{" "}
                      {selectedMarketCode}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. SEO TAB */}
        {/* ========================================================================= */}
        {activeTab === "seo" && (
          <div className="space-y-5 max-w-2xl">
            <FormField
              label={t("admin.taxonomyNodeEditor.modeleDeTitreSeoMeta")}
              hint="Variables disponibles : {category}, {location}, {count}"
            >
              <Input
                value={metaTitleTemplate}
                onChange={(e) => setMetaTitleTemplate(e.target.value)}
                placeholder={t("admin.taxonomyNodeEditor.exempleTitreSeo")}
              />
            </FormField>

            <FormField
              label={t("admin.taxonomyNodeEditor.modeleDeMetaDescription")}
              hint="Description affichée dans les résultats Google"
            >
              <Textarea
                rows={2}
                value={metaDescriptionTemplate}
                onChange={(e) => setMetaDescriptionTemplate(e.target.value)}
                placeholder={t(
                  "admin.taxonomyNodeEditor.exempleDescriptionSeo",
                )}
              />
            </FormField>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
              <Checkbox
                checked={indexable}
                onChange={(e) => setIndexable(e.target.checked)}
              />
              <span>
                {t("admin.taxonomyNodeEditor.autoriserLIndexationParLes")}
              </span>
            </label>

            {/* Google SERP Preview */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-control space-y-1">
              <div className="text-micro text-stone-500 font-bold uppercase tracking-wider">
                {t("admin.taxonomyNodeEditor.apercuGoogleSearch")}
              </div>
              <div className="text-xs text-info font-medium">
                {metaTitleTemplate.replace("{category}", node.name) ||
                  `${node.name} d'occasion - Shongre`}
              </div>
              <div className="text-micro text-success font-mono">
                {publicRouteUrl({
                  countryCode: selectedMarketCode,
                  route: `/categorie/${node.slug}`,
                })}
              </div>
              <div className="text-xs text-text-secondary line-clamp-2">
                {metaDescriptionTemplate.replace("{category}", node.name) ||
                  `Découvrez toutes les annonces pour ${node.name} sur Shongre. Paiement sécurisé et livraison garantie.`}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. PREVIEWS TAB */}
        {/* ========================================================================= */}
        {activeTab === "previews" && resolvedSchema && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700">
                  Profil :
                </span>
                <Select
                  className="w-auto"
                  size="sm"
                  aria-label={t(
                    "admin.taxonomyNodeEditor.profilDePrevisualisation",
                  )}
                  value={previewUserType}
                  onChange={(e) => setPreviewUserType(e.target.value as any)}
                >
                  <option value="individual">
                    {t("admin.taxonomyNodeEditor.vendeurParticulier")}
                  </option>
                  <option value="pro">
                    {t("admin.taxonomyNodeEditor.vendeurProfessionnel")}
                  </option>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700">
                  {t("admin.taxonomyNodeEditor.marche")}
                </span>
                <Select
                  className="w-auto"
                  size="sm"
                  aria-label={t("admin.taxonomyNodeEditor.marche")}
                  value={previewMarket}
                  onChange={(e) => setPreviewMarket(e.target.value)}
                >
                  {availableMarkets.map((market) => (
                    <option key={market.code} value={market.code}>
                      {market.name} ({market.code})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Form Fields Simulation */}
            <div className="p-5 bg-bg-subtle rounded-2xl border border-border-subtle space-y-4">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-icon-md h-icon-md text-primary" />
                <span>
                  {t(
                    "admin.taxonomyNodeEditor.simulationDuFormulaireDePublication",
                  )}
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resolvedSchema.attributes.map((attr) => (
                  <div
                    key={attr.id}
                    className="p-3 bg-bg-surface border border-border-base rounded-control space-y-1"
                  >
                    <label className="text-xs font-semibold text-stone-800 flex items-center justify-between">
                      <span>
                        {attr.label}
                        {attr.required && (
                          <span className="text-primary ml-1">*</span>
                        )}
                      </span>
                      {attr.unit && (
                        <span className="text-micro text-stone-500 font-mono">
                          ({attr.unit})
                        </span>
                      )}
                    </label>
                    <p className="text-micro text-stone-500 font-mono">
                      Champ : {attr.dataType}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. IMPACT & SAFETY TAB */}
        {/* ========================================================================= */}
        {activeTab === "impact" && (
          <div className="space-y-5 max-w-2xl">
            <div className="p-4 bg-bg-subtle rounded-control border border-border-subtle space-y-3">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                {t("admin.taxonomyNodeEditor.rapportDImpactRetrocompatibilite")}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-bg-surface rounded-lg border border-border-base">
                  <span className="text-stone-500">
                    {t("admin.taxonomyNodeEditor.annoncesActivesAssociees")}
                  </span>
                  <p className="text-lg font-bold text-text-main">
                    {impact.activeListingsCount}
                  </p>
                </div>
                <div className="p-3 bg-bg-surface rounded-lg border border-border-base">
                  <span className="text-stone-500">
                    {t("admin.taxonomyNodeEditor.sousCategoriesDependantes")}
                  </span>
                  <p className="text-lg font-bold text-text-main">
                    {impact.descendantsCount}
                  </p>
                </div>
                <div className="p-3 bg-bg-surface rounded-lg border border-border-base">
                  <span className="text-stone-500">Feuilles publiables :</span>
                  <p className="text-lg font-bold text-text-main">
                    {impact.publishableLeavesCount}
                  </p>
                </div>
                <div className="p-3 bg-bg-surface rounded-lg border border-border-base">
                  <span className="text-stone-500">
                    {t("admin.taxonomyNodeEditor.surchargesMarchesActives")}
                  </span>
                  <p className="text-lg font-bold text-text-main">
                    {impact.marketOverridesCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-control space-y-2 text-xs text-stone-700">
              <div className="font-bold text-text-main flex items-center gap-1.5">
                <ShieldCheck className="w-icon-md h-icon-md text-success" />
                <span>
                  {t("admin.taxonomyNodeEditor.politiqueDIntegriteCanonique")}
                </span>
              </div>
              <p>
                L'identifiant <code>{node.id}</code>{" "}
                {t(
                  "admin.taxonomyNodeEditor.estPermanentTouteModificationDeNomOuDePositionPreserve",
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Modals */}
      <IconPickerModal
        isOpen={isIconModalOpen}
        onClose={() => setIsIconModalOpen(false)}
        selectedIcon={iconName}
        onSelectIcon={(name) => setIconName(name)}
      />

      <MoveNodeModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        node={node}
        allNodes={allNodes}
        onSuccess={() => {
          onNodeUpdated();
        }}
      />

      <DeprecateNodeModal
        isOpen={isDeprecateModalOpen}
        onClose={() => setIsDeprecateModalOpen(false)}
        node={node}
        allNodes={allNodes}
        onSuccess={() => {
          onNodeUpdated();
        }}
      />

      <DeleteNodeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        node={node}
        onSuccess={() => {
          onNodeUpdated();
          onSelectNode(allNodes[0]);
        }}
        onSwitchToDeprecate={() => setIsDeprecateModalOpen(true)}
      />
    </div>
  );
};
