import React, { useState, useEffect } from 'react';
import {
  TaxonomyNode,
  TaxonomyAttribute,
  TaxonomyMarketOverride,
  TaxonomyCapabilities,
  FulfillmentMode,
} from '../../../../domains/taxonomy/taxonomy.types';
import { taxonomyAdminRepository } from '../../../../repositories/taxonomy.repository';
import { taxonomyService, getTaxonomyLabel } from '../../../../domains/taxonomy/taxonomy.service';
import { Button } from '../../../../design-system/primitives/Button';
import { Input, FormField, Textarea, Checkbox } from '../../../../design-system/primitives/FormField';
import { Badge } from '../../../../design-system/primitives/Badge';
import { CategoryIcon } from '../../../../design-system/primitives/CategoryIcon';
import { useToast } from '../../../../app/providers/ToastProvider';
import { useAuth } from '../../../../app/providers/AuthProvider';
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
  ExternalLink,
} from 'lucide-react';
import { IconPickerModal } from './modals/IconPickerModal';
import { MoveNodeModal } from './modals/MoveNodeModal';
import { DeprecateNodeModal } from './modals/DeprecateNodeModal';
import { DeleteNodeModal } from './modals/DeleteNodeModal';
import { plural } from '../../../../utilities/formatters';
import { useTranslation } from '../../../../i18n/I18nProvider';

export interface TaxonomyNodeEditorProps {
  nodeId: string;
  allNodes: TaxonomyNode[];
  onNodeUpdated: () => void;
  onSelectNode: (node: TaxonomyNode) => void;
}

type EditorTab =
  | 'general'
  | 'attributes'
  | 'publication_filters'
  | 'capabilities'
  | 'markets'
  | 'seo'
  | 'previews'
  | 'impact';

export const TaxonomyNodeEditor: React.FC<TaxonomyNodeEditorProps> = ({
  nodeId,
  allNodes,
  onNodeUpdated,
  onSelectNode,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const node = taxonomyAdminRepository.getNode(nodeId);

  const [activeTab, setActiveTab] = useState<EditorTab>('general');

  // General Form States
  const [name, setName] = useState('');
  const [shortLabel, setShortLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('Folder');
  const [accentColor, setAccentColor] = useState('#000000');
  const [publishable, setPublishable] = useState(true);
  const [status, setStatus] = useState<TaxonomyNode['status']>('active');
  const [conditionScheme, setConditionScheme] = useState<TaxonomyNode['conditionScheme']>('consumer_product');
  const [aliases, setAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState('');

  // Attributes State
  const [localAttributeIds, setLocalAttributeIds] = useState<string[]>([]);
  const [selectedRegistryAttrId, setSelectedRegistryAttrId] = useState('');

  // Capabilities State
  const [capabilities, setCapabilities] = useState<TaxonomyCapabilities>({
    canSell: true,
    canGive: true,
    canExchange: true,
    canRent: false,
    reservationAllowed: true,
    securePaymentAllowed: true,
    negotiablePrice: true,
    fulfillmentModes: ['hand_delivery', 'parcel_shipping'],
  });

  // SEO States
  const [metaTitleTemplate, setMetaTitleTemplate] = useState('');
  const [metaDescriptionTemplate, setMetaDescriptionTemplate] = useState('');
  const [indexable, setIndexable] = useState(true);

  // Market Overrides State
  const [selectedMarketCode, setSelectedMarketCode] = useState('BE');
  const [marketOverrideEnabled, setMarketOverrideEnabled] = useState(false);
  const [marketDirectPurchase, setMarketDirectPurchase] = useState(true);

  // Preview States
  const [previewUserType, setPreviewUserType] = useState<'individual' | 'pro'>('individual');
  const [previewMarket, setPreviewMarket] = useState('FR');

  // Modals
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeprecateModalOpen, setIsDeprecateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when nodeId or node changes
  useEffect(() => {
    if (node) {
      setName(node.name || '');
      setShortLabel(node.shortLabel || '');
      setSlug(node.slug || '');
      setDescription(node.description || '');
      setIconName(node.iconName || 'Folder');
      setAccentColor(node.accentColor || '#64748B');
      setPublishable(node.publishable ?? (node.level === 'type' || node.level === 'subtype'));
      setStatus(node.status || 'active');
      setConditionScheme(node.conditionScheme || 'consumer_product');
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
          fulfillmentModes: node.capabilities.fulfillmentModes || ['hand_delivery', 'parcel_shipping'],
        });
      }

      setMetaTitleTemplate(node.seo?.metaTitleTemplate || '');
      setMetaDescriptionTemplate(node.seo?.metaDescriptionTemplate || '');
      setIndexable(node.seo?.indexable ?? true);

      // Market override sync for selected market
      const override = node.marketOverrides?.[selectedMarketCode];
      setMarketOverrideEnabled(Boolean(override));
      if (override?.capabilities?.securePaymentAllowed !== undefined) {
        setMarketDirectPurchase(override.capabilities.securePaymentAllowed);
      } else {
        setMarketDirectPurchase(node.capabilities?.securePaymentAllowed ?? true);
      }
    }
  }, [node, nodeId, selectedMarketCode]);

  if (!node) {
    return (
      <div className="bg-white rounded-2xl border border-border-base p-8 text-center text-xs text-stone-500">
        <Layers className="w-8 h-8 mx-auto text-stone-300 mb-2" />
        <p className="font-semibold text-stone-600">{t('admin.taxonomyNodeEditor.selectionnezUneCategorieDansL')}</p>
      </div>
    );
  }

  // Resolved schema & hierarchy data
  const resolvedSchema = taxonomyService.resolvePublicationSchema(node.id, previewMarket);
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
    (a) => !localAttributeIds.includes(a.id) && !inheritedAttributeIds.has(a.id)
  );

  const handleCopyId = () => {
    navigator.clipboard.writeText(node.id);
    toast.success(`ID "${node.id}" copié dans le presse-papier.`);
  };

  const handleAddAlias = () => {
    if (newAlias.trim() && !aliases.includes(newAlias.trim())) {
      setAliases([...aliases, newAlias.trim()]);
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (aliasToRemove: string) => {
    setAliases(aliases.filter((a) => a !== aliasToRemove));
  };

  const handleAddAttribute = () => {
    if (selectedRegistryAttrId && !localAttributeIds.includes(selectedRegistryAttrId)) {
      setLocalAttributeIds([...localAttributeIds, selectedRegistryAttrId]);
      setSelectedRegistryAttrId('');
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
        ? { id: currentUser.id, name: currentUser.name || 'Admin', role: currentUser.role }
        : undefined;
      const copy = await taxonomyAdminRepository.duplicateNode(node.id, actor);
      toast.success(`Catégorie dupliquée : "${copy.name}".`);
      onNodeUpdated();
      onSelectNode(copy);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la duplication.');
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setIsSubmitting(true);
      const actor = currentUser
        ? { id: currentUser.id, name: currentUser.name || 'Admin', role: currentUser.role }
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
            metaDescriptionTemplate: metaDescriptionTemplate.trim() || undefined,
            indexable,
          },
        },
        actor
      );

      toast.success('Modifications enregistrées avec succès dans le brouillon.');
      onNodeUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMarketOverride = async () => {
    try {
      const actor = currentUser
        ? { id: currentUser.id, name: currentUser.name || 'Admin', role: currentUser.role }
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
          actor
        );
        toast.success(`Surcharge enregistrée pour le marché ${selectedMarketCode}.`);
      } else {
        await taxonomyAdminRepository.resetMarketOverride(node.id, selectedMarketCode, actor);
        toast.success(`Surcharge supprimée pour ${selectedMarketCode} (Héritage France restauré).`);
      }
      onNodeUpdated();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur surcharge marché.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border-base shadow-xs overflow-hidden">
      {/* Node Header Banner */}
      <div className="p-5 border-b border-border-subtle bg-gradient-to-r from-bg-subtle via-white to-bg-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CategoryIcon category={{ ...node, iconName, accentColor }} size="lg" withBackground />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-micro bg-stone-200 text-stone-800 px-2 py-0.5 rounded font-mono uppercase font-bold">
                {node.level}
              </span>
              <h2 className="text-lg font-black text-stone-900">{node.name}</h2>
              {node.shortLabel && (
                <span className="text-xs bg-warning-surface text-warning border border-warning-border px-2 py-0.5 rounded-full font-bold">
                  Alias : {node.shortLabel}
                </span>
              )}
              {status === 'active' ? (
                <Badge variant="success">Actif</Badge>
              ) : status === 'draft' ? (
                <Badge variant="neutral">Brouillon</Badge>
              ) : (
                <Badge variant="urgent">{t('admin.taxonomyNodeEditor.deprecie')}</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500 font-mono mt-1">
              <span className="flex items-center gap-1">
                ID : <strong>{node.id}</strong>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 hover:text-stone-900 rounded min-w-6 min-h-6 inline-flex items-center justify-center"
                  title="Copier l'ID stable"
                >
                  <Copy className="w-3 h-3" />
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
            leftIcon={<FolderTree className="w-3.5 h-3.5" />}
          >
            Déplacer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            leftIcon={<Copy className="w-3.5 h-3.5" />}
          >
            Dupliquer
          </Button>

          {node.status !== 'deprecated' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeprecateModalOpen(true)}
              leftIcon={<Archive className="w-3.5 h-3.5 text-warning" />}
            >
              Déprécier
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
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* Breadcrumb Path Context */}
      <div className="px-5 py-2.5 bg-bg-base border-b border-border-subtle flex items-center gap-1.5 text-xs text-stone-500 font-medium overflow-x-auto no-scrollbar">
        <span className="text-stone-500 uppercase tracking-wider text-micro mr-1 shrink-0">
          Hiérarchie :
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
        <span className="font-bold text-stone-900 shrink-0">{node.name}</span>
      </div>

      {/* Editor Tabs Navigation */}
      <div className="flex items-center gap-1 px-5 border-b border-border-base bg-white overflow-x-auto no-scrollbar text-xs font-semibold">
        {[
          { id: 'general', label: 'Général', icon: Settings2 },
          { id: 'attributes', label: `Attributs (${(node.attributeIds?.length || 0) + inheritedAttributeIds.size})`, icon: Layers },
          { id: 'publication_filters', label: 'Publication & Filtres', icon: FileCheck },
          { id: 'capabilities', label: 'Transactions & Livraison', icon: Truck },
          { id: 'markets', label: 'Marchés & Héritage', icon: Globe },
          { id: 'seo', label: 'SEO', icon: Search },
          { id: 'previews', label: 'Aperçus Directs', icon: Eye },
          { id: 'impact', label: 'Impact & Sécurité', icon: ShieldCheck },
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
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
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
        {activeTab === 'general' && (
          <div className="space-y-5 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label={t('admin.taxonomyNodeEditor.nomCompletDeLaCategorie')}
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
                  placeholder={t('admin.taxonomyNodeEditor.exVoituresMaterielPro')}
                />
              </FormField>
            </div>

            {/* Live UI Rendering Preview */}
            <div className="p-3.5 bg-bg-base rounded-xl border border-border-base text-xs space-y-1.5">
              <div className="text-stone-500 font-bold uppercase tracking-wider text-micro">
                Aperçu du rendu visuel :
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">{t('admin.taxonomyNodeEditor.renduStandardPageAnnonceH1')}</span>
                <span className="font-bold text-stone-900">{name || node.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Rendu compact (Mobile, Tuiles, Filtres) :</span>
                <span className="font-bold text-primary">{shortLabel.trim() || name || node.name}</span>
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

              <FormField label={t('admin.taxonomyNodeEditor.schemaDEtat')}>
                <select
                  value={conditionScheme}
                  onChange={(e) => setConditionScheme(e.target.value as any)}
                  className="w-full h-10 px-3 bg-bg-base border border-border-base rounded-xl text-xs font-semibold"
                >
                  <option value="consumer_product">{t('admin.taxonomyNodeEditor.produitStandardNeufTresBon')}</option>
                  <option value="vehicle">{t('admin.taxonomyNodeEditor.vehicule0KmExcellentControle')}</option>
                  <option value="real_estate">{t('admin.taxonomyNodeEditor.immobilierNeufVefaRenoveA')}</option>
                  <option value="professional">{t('admin.taxonomyNodeEditor.professionnelNeufGarantiReconditionne')}</option>
                  <option value="job">Emploi (Temps plein, Partiel, Freelance...)</option>
                  <option value="service">{t('admin.taxonomyNodeEditor.serviceADomicileEnAtelier')}</option>
                </select>
              </FormField>
            </div>

            <FormField label="Description">
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('admin.taxonomyNodeEditor.descriptionCanoniqueEtEditorialeDe')}
              />
            </FormField>

            {/* Icon & Color Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-bg-subtle rounded-xl border border-border-subtle">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  Icône vectorielle :
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-border-base flex items-center justify-center">
                    <CategoryIcon category={{ ...node, iconName, accentColor }} size="md" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsIconModalOpen(true)}
                  >
                    Changer l'icône ({iconName})
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
                    aria-label={t('admin.taxonomyNodeEditor.couleurDAccentuationDeLa')}
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-border-base"
                  />
                  <span className="text-xs font-mono font-bold text-stone-700">{accentColor}</span>
                </div>
              </div>
            </div>

            {/* Aliases & Synonyms */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
                <span>Alias & Synonymes de recherche ({aliases.length})</span>
                <span className="text-micro text-stone-500 font-normal">
                  Améliore les résultats du moteur de recherche
                </span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAlias())}
                  placeholder={t('admin.taxonomyNodeEditor.ajouterUnSynonymeExSmartphone')}
                  aria-label={t('admin.taxonomyNodeEditor.ajouterUnSynonyme')}
                />
                <Button variant="outline" size="sm" onClick={handleAddAlias}>
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {aliases.map((alias) => (
                  <span
                    key={alias}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-800 text-xs font-medium rounded-full border border-stone-200"
                  >
                    <span>{alias}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(alias)}
                      aria-label={t('admin.taxonomyNodeEditor.retirerCetElement')}
                      className="text-stone-500 hover:text-stone-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Lifecycle & Status */}
            <div className="p-4 bg-bg-base rounded-xl border border-border-base space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Cycle de vie & Publication
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={t('admin.taxonomyNodeEditor.statutOperationnel')}>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-10 px-3 bg-white border border-border-base rounded-xl text-xs font-semibold"
                  >
                    <option value="active">{t('admin.taxonomyNodeEditor.actifEnLigneEtIndexable')}</option>
                    <option value="draft">{t('admin.taxonomyNodeEditor.brouillonInvisibleAuxUtilisateurs')}</option>
                    <option value="disabled">{t('admin.taxonomyNodeEditor.desactive')}</option>
                    <option value="deprecated">{t('admin.taxonomyNodeEditor.deprecieArchivageProgressif')}</option>
                  </select>
                </FormField>

                <div className="pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                    <Checkbox
                      checked={publishable}
                      onChange={(e) => setPublishable(e.target.checked)}
                    />
                    <span>{t('admin.taxonomyNodeEditor.nUdPubliableSelectionnableComme')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Danger zone.
                Deleting a taxonomy node is irreversible and cascades into every
                listing filed under it, so it is separated from the routine
                actions, styled as a hazard, and still gated by ConfirmModal. */}
            <div className="rounded-xl border border-danger-border bg-danger-surface p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-danger flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Zone de danger
                  </h4>
                  <p className="text-xs text-stone-600 mt-1 max-w-prose">
                    La suppression est définitive et affecte toutes les annonces rattachées à cette
                    rubrique. Préférez <strong>{t('admin.taxonomyNodeEditor.deprecier')}</strong> pour la retirer des nouvelles
                    publications sans toucher à l'existant.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  className="border-danger-border text-danger hover:bg-danger hover:text-white shrink-0"
                >
                  Supprimer ce nœud
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ATTRIBUTES TAB */}
        {/* ========================================================================= */}
        {activeTab === 'attributes' && (
          <div className="space-y-6">
            {/* Inherited Attributes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Attributs hérités des parents ({inheritedAttributeIds.size})</span>
                  <span className="text-micro font-normal text-stone-500 lowercase">
                    (règles automatiques de la taxonomie)
                  </span>
                </h3>
              </div>

              {inheritedAttributeIds.size === 0 ? (
                <div className="p-3.5 text-xs text-stone-500 bg-bg-subtle rounded-xl border border-border-subtle">
                  Aucun attribut hérité des catégories parentes.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from(inheritedAttributeIds).map((attrId) => {
                    const attr = allAttributes.find((a) => a.id === attrId);
                    if (!attr) return null;
                    return (
                      <div
                        key={attr.id}
                        className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-800">{attr.label}</span>
                          <span className="text-micro bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-mono font-bold">
                            Hérité
                          </span>
                        </div>
                        <p className="text-micro text-stone-500 font-mono">
                          ID : {attr.id} • Type : {attr.dataType} {attr.unit ? `(${attr.unit})` : ''}
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
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Attributs spécifiques assignés ({localAttributeIds.length})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Ces attributs enrichissent le formulaire de publication spécifiquement pour ce nœud.
                  </p>
                </div>

                {/* Add Attribute Dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedRegistryAttrId}
                    onChange={(e) => setSelectedRegistryAttrId(e.target.value)}
                    className="h-control-md px-3 bg-bg-base border border-border-base rounded-xl text-xs font-semibold max-w-xs"
                  >
                    <option value="">{t('admin.taxonomyNodeEditor.choisirDansLeRegistre')}</option>
                    {availableRegistryAttributes.map((attr) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.label} ({attr.dataType})
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddAttribute}
                    disabled={!selectedRegistryAttrId}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Assigner
                  </Button>
                </div>
              </div>

              {localAttributeIds.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 border border-dashed rounded-xl">
                  Aucun attribut local assigné. Choisissez un attribut dans le registre central ci-dessus.
                </div>
              ) : (
                <div className="space-y-2">
                  {localAttributeIds.map((attrId) => {
                    const attr = allAttributes.find((a) => a.id === attrId);
                    if (!attr) return null;
                    return (
                      <div
                        key={attr.id}
                        className="p-3.5 bg-white border border-border-base rounded-xl flex items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">{attr.label}</span>
                            <span className="text-micro bg-primary-light text-primary px-1.5 py-0.2 rounded font-mono font-bold">
                              {attr.dataType}
                            </span>
                            {attr.unit && (
                              <span className="text-micro bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded font-mono font-bold">
                                {attr.unit}
                              </span>
                            )}
                            {attr.required && (
                              <span className="text-micro bg-danger-surface text-danger px-1.5 py-0.2 rounded font-bold">
                                Requis
                              </span>
                            )}
                            {attr.filterable && (
                              <span className="text-micro bg-info-surface text-info px-1.5 py-0.2 rounded font-bold">
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
                          <Trash2 className="w-3.5 h-3.5" />
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
        {activeTab === 'publication_filters' && resolvedSchema && (
          <div className="space-y-6">
            {/* Resolved publication schema summary */}
            <div className="p-4 bg-bg-subtle rounded-xl border border-border-subtle space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                <span>{t('admin.taxonomyNodeEditor.schemaDePublicationResoluEffectif')}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-stone-500">Total champs attributs :</span>
                  <p className="font-bold text-stone-900">{resolvedSchema.attributes.length}</p>
                </div>
                <div>
                  <span className="text-stone-500">{t('admin.taxonomyNodeEditor.optionsDEtat')}</span>
                  <p className="font-bold text-stone-900">{plural(resolvedSchema.conditionScheme.length, 'palier')}</p>
                </div>
                <div>
                  <span className="text-stone-500">{t('admin.taxonomyNodeEditor.venteAutorisee')}</span>
                  <p className="font-bold text-success">
                    {resolvedSchema.capabilities.canSell ? 'Oui' : 'Non'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">{t('admin.taxonomyNodeEditor.sequestreCbActif')}</span>
                  <p className="font-bold text-primary">
                    {resolvedSchema.capabilities.securePaymentAllowed ? 'Actif' : 'Désactivé'}
                  </p>
                </div>
              </div>
            </div>

            {/* Search filter facets */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Facettes de filtres dérivées pour la page Recherche
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resolvedSchema.attributes
                  .filter((a) => a.filterable)
                  .map((attr, idx) => (
                    <div
                      key={attr.id}
                      className="p-3 bg-white border border-border-base rounded-xl text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-stone-900">{attr.label}</span>
                        <p className="text-micro text-stone-500 font-mono">
                          Filtre type : {attr.dataType}
                        </p>
                      </div>
                      <span className="text-micro bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-mono">
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
        {activeTab === 'capabilities' && (
          <div className="space-y-6 max-w-3xl">
            <div className="p-3.5 bg-info-surface border border-info-border rounded-xl text-xs text-info space-y-1">
              <div className="font-bold text-info flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-info" />
                <span>{t('admin.taxonomyNodeEditor.frontiereDArchitecture')}</span>
              </div>
              <p>
                La taxonomie définit l'<strong>{t('admin.taxonomyNodeEditor.eligibiliteIntrinseque')}</strong> de la catégorie (ex: peut-on vendre en ligne ? envoyer par colis ?).
                Les transporteurs réels (Mondial Relay, Colissimo) sont gérés dans le <strong>{t('admin.taxonomyNodeEditor.gestionnaireDePrestataires')}</strong>.
              </p>
            </div>

            {/* Transactions Capabilities */}
            <div className="p-4 bg-bg-base rounded-xl border border-border-base space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Modes de Transaction Autorisés
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.canSell}
                    onChange={(e) => setCapabilities({ ...capabilities, canSell: e.target.checked })}
                  />
                  <span>Vente standard (Prix d'achat direct)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.securePaymentAllowed}
                    onChange={(e) =>
                      setCapabilities({ ...capabilities, securePaymentAllowed: e.target.checked })
                    }
                  />
                  <span>{t('admin.taxonomyNodeEditor.paiementSecuriseEnLigneSequestre')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.reservationAllowed}
                    onChange={(e) =>
                      setCapabilities({ ...capabilities, reservationAllowed: e.target.checked })
                    }
                  />
                  <span>{t('admin.taxonomyNodeEditor.reservationAvecAcompteDeSequestre')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.canGive}
                    onChange={(e) => setCapabilities({ ...capabilities, canGive: e.target.checked })}
                  />
                  <span>{t('admin.taxonomyNodeEditor.donGratuitAutorise')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.canExchange}
                    onChange={(e) => setCapabilities({ ...capabilities, canExchange: e.target.checked })}
                  />
                  <span>{t('admin.taxonomyNodeEditor.trocEchangeAutorise')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
                  <Checkbox
                    checked={capabilities.canRent}
                    onChange={(e) => setCapabilities({ ...capabilities, canRent: e.target.checked })}
                  />
                  <span>{t('admin.taxonomyNodeEditor.locationAutorisee')}</span>
                </label>
              </div>
            </div>

            {/* Fulfillment Modes */}
            <div className="p-4 bg-bg-base rounded-xl border border-border-base space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Modes de Livraison & Remise Éligibles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { id: 'hand_delivery', label: 'Remise en main propre (Validation code PIN)' },
                  { id: 'parcel_shipping', label: 'Expédition par colis standard (Relais / Domicile)' },
                  { id: 'heavy_delivery', label: 'Transporteur volumineux / Palette / Engins' },
                  { id: 'digital_download', label: 'Téléchargement numérique / Accès direct' },
                  { id: 'on_site_service', label: 'Prestation sur place / Intervention à domicile' },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className="flex items-center gap-2 cursor-pointer font-medium text-stone-800"
                  >
                    <Checkbox
                      checked={capabilities.fulfillmentModes.includes(mode.id as FulfillmentMode)}
                      onChange={() => toggleFulfillmentMode(mode.id as FulfillmentMode)}
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
        {activeTab === 'markets' && (
          <div className="space-y-6 max-w-3xl">
            <div className="p-3.5 bg-bg-subtle rounded-xl border border-border-subtle text-xs space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-primary" />
                <span>{t('admin.taxonomyNodeEditor.architectureMultiMarchesHeritageFrance')}</span>
              </div>
              <p className="text-stone-600">
                La France (<strong>FR</strong>) constitue la référence canonique. Les autres marchés héritent automatiquement de tous les paramètres non surchargés.
              </p>
            </div>

            {/* Country Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              {['BE', 'CH', 'LU', 'DE', 'ES'].map((code) => {
                const isSelected = selectedMarketCode === code;
                const hasOverride = Boolean(node.marketOverrides?.[code]);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedMarketCode(code)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-bg-base text-stone-600 hover:bg-bg-subtle border border-border-base'
                    }`}
                  >
                    <span>{code}</span>
                    {hasOverride && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Surcharge active" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Market Override Controls */}
            <div className="p-5 bg-white border border-border-base rounded-xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Marché : {selectedMarketCode}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {marketOverrideEnabled
                      ? 'Ce marché possède une configuration personnalisée.'
                      : 'Hérite automatiquement de tous les paramètres de France.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant={marketOverrideEnabled ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => setMarketOverrideEnabled(!marketOverrideEnabled)}
                  >
                    {marketOverrideEnabled ? 'Supprimer la surcharge' : 'Personnaliser ce marché'}
                  </Button>
                </div>
              </div>

              {marketOverrideEnabled && (
                <div className="space-y-4 pt-3 border-t border-border-subtle text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
                    <Checkbox
                      checked={marketDirectPurchase}
                      onChange={(e) => setMarketDirectPurchase(e.target.checked)}
                    />
                    <span>Autoriser le paiement sécurisé direct pour le marché {selectedMarketCode}</span>
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="primary" size="sm" onClick={handleSaveMarketOverride}>
                      Enregistrer la surcharge {selectedMarketCode}
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
        {activeTab === 'seo' && (
          <div className="space-y-5 max-w-2xl">
            <FormField
              label={t('admin.taxonomyNodeEditor.modeleDeTitreSeoMeta')}
              hint="Variables disponibles : {category}, {location}, {count}"
            >
              <Input
                value={metaTitleTemplate}
                onChange={(e) => setMetaTitleTemplate(e.target.value)}
                placeholder={t('admin.taxonomyNodeEditor.exempleTitreSeo')}
              />
            </FormField>

            <FormField
              label={t('admin.taxonomyNodeEditor.modeleDeMetaDescription')}
              hint="Description affichée dans les résultats Google"
            >
              <Textarea
                rows={2}
                value={metaDescriptionTemplate}
                onChange={(e) => setMetaDescriptionTemplate(e.target.value)}
                placeholder={t('admin.taxonomyNodeEditor.exempleDescriptionSeo')}
              />
            </FormField>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
              <Checkbox checked={indexable} onChange={(e) => setIndexable(e.target.checked)} />
              <span>{t('admin.taxonomyNodeEditor.autoriserLIndexationParLes')}</span>
            </label>

            {/* Google SERP Preview */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
              <div className="text-micro text-stone-500 font-bold uppercase tracking-wider">
                Aperçu Google Search :
              </div>
              <div className="text-xs text-info font-medium hover:underline cursor-pointer">
                {metaTitleTemplate.replace('{category}', node.name) || `${node.name} d'occasion - Shongre`}
              </div>
              <div className="text-micro text-success font-mono">
                https://shongre.com/categorie/{node.slug}
              </div>
              <div className="text-xs text-stone-600 line-clamp-2">
                {metaDescriptionTemplate.replace('{category}', node.name) ||
                  `Découvrez toutes les annonces pour ${node.name} sur Shongre. Paiement sécurisé et livraison garantie.`}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. PREVIEWS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'previews' && resolvedSchema && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700">Profil :</span>
                <select
                  value={previewUserType}
                  onChange={(e) => setPreviewUserType(e.target.value as any)}
                  className="h-8 px-2 bg-bg-base border border-border-base rounded-lg text-xs font-semibold"
                >
                  <option value="individual">{t('admin.taxonomyNodeEditor.vendeurParticulier')}</option>
                  <option value="pro">{t('admin.taxonomyNodeEditor.vendeurProfessionnel')}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700">{t('admin.taxonomyNodeEditor.marche')}</span>
                <select
                  value={previewMarket}
                  onChange={(e) => setPreviewMarket(e.target.value)}
                  className="h-8 px-2 bg-bg-base border border-border-base rounded-lg text-xs font-semibold"
                >
                  <option value="FR">France (FR)</option>
                  <option value="BE">Belgique (BE)</option>
                  <option value="CH">Suisse (CH)</option>
                  <option value="ES">Espagne (ES)</option>
                </select>
              </div>
            </div>

            {/* Form Fields Simulation */}
            <div className="p-5 bg-bg-subtle rounded-2xl border border-border-subtle space-y-4">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span>{t('admin.taxonomyNodeEditor.simulationDuFormulaireDePublication')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resolvedSchema.attributes.map((attr) => (
                  <div key={attr.id} className="p-3 bg-white border border-border-base rounded-xl space-y-1">
                    <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                      <span>
                        {attr.label}
                        {attr.required && <span className="text-primary ml-1">*</span>}
                      </span>
                      {attr.unit && <span className="text-micro text-stone-500 font-mono">({attr.unit})</span>}
                    </label>
                    <p className="text-micro text-stone-500 font-mono">Champ : {attr.dataType}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. IMPACT & SAFETY TAB */}
        {/* ========================================================================= */}
        {activeTab === 'impact' && (
          <div className="space-y-5 max-w-2xl">
            <div className="p-4 bg-bg-subtle rounded-xl border border-border-subtle space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Rapport d'Impact & Rétrocompatibilité
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-white rounded-lg border border-border-base">
                  <span className="text-stone-500">{t('admin.taxonomyNodeEditor.annoncesActivesAssociees')}</span>
                  <p className="text-lg font-black text-stone-900">{impact.activeListingsCount}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-border-base">
                  <span className="text-stone-500">{t('admin.taxonomyNodeEditor.sousCategoriesDependantes')}</span>
                  <p className="text-lg font-black text-stone-900">{impact.descendantsCount}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-border-base">
                  <span className="text-stone-500">Feuilles publiables :</span>
                  <p className="text-lg font-black text-stone-900">{impact.publishableLeavesCount}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-border-base">
                  <span className="text-stone-500">{t('admin.taxonomyNodeEditor.surchargesMarchesActives')}</span>
                  <p className="text-lg font-black text-stone-900">{impact.marketOverridesCount}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs text-stone-700">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span>{t('admin.taxonomyNodeEditor.politiqueDIntegriteCanonique')}</span>
              </div>
              <p>
                L'identifiant <code>{node.id}</code> est permanent. Toute modification de nom ou de position préserve la validité des annonces sans risque de rupture.
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
