import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Camera,
  Trash2,
  Plus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Truck,
  MapPin,
  ShieldCheck,
  Tag,
  Zap,
  Info,
  UploadCloud,
  Bot,
  Lightbulb,
  Layers,
  Search,
  Check,
  ChevronRight,
  Clock,
  ShoppingBag,
  CreditCard,
  Store,
  DollarSign,
  Package,
  AlertTriangle,
  Eye,
  Edit3,
  Globe,
} from 'lucide-react';
import { taxonomyService, getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { publicationResolver } from '../../domains/publication/publication.resolver';
import { transactionCapabilitiesService } from '../../domains/transaction/transaction.capabilities';
import { fulfillmentResolver } from '../../domains/fulfillment/fulfillment.resolver';
import { publicationService } from '../../domains/publication/publication.service';
import { marketResolver } from '../../domains/market/market.resolver';
import { marketService } from '../../domains/market/market.service';
import {
  PublicationDraftState,
  ListingIntent,
  PriceModel,
  PackageSizeTier,
} from '../../domains/publication/publication.types';
import { TaxonomyNode } from '../../domains/taxonomy/taxonomy.types';
import { Button } from '../../design-system/primitives/Button';
import { Input, Textarea, Checkbox, FormField } from '../../design-system/primitives/FormField';
import { Badge } from '../../design-system/primitives/Badge';
import { Notice } from '../../design-system/primitives/UIComponents';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { geminiService, ListingAIGenerationResult } from '../../services/gemini.service';
import { formatPrice } from '../../utilities/formatters';
import { CategoryIcon } from '../../design-system/primitives/CategoryIcon';
import { Image } from '../../design-system/primitives/Image';

const samplePhotoUrls = [
  'https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
];

const STEPS = [
  { id: 1, label: 'Catégorie' },
  { id: 2, label: 'Caractéristiques' },
  { id: 3, label: 'Photos' },
  { id: 4, label: 'Description' },
  { id: 5, label: 'Prix & Stock' },
  { id: 6, label: 'Transactions' },
  { id: 7, label: 'Livraison' },
  { id: 8, label: 'Localisation' },
  { id: 9, label: 'Marchés & Visibilité' },
  { id: 10, label: 'Vérification' },
];

export const PublishWizard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [aiPromptKeyword, setAiPromptKeyword] = useState('');
  const [aiGeneratedTips, setAiGeneratedTips] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Draft State initialized with default or restored values
  const [draft, setDraft] = useState<PublicationDraftState>(() => {
    const saved = publicationService.getDraft(currentUser?.id);
    if (saved) return saved;

    const initialMarkets = currentUser?.defaultPublicationMarkets && currentUser.defaultPublicationMarkets.length > 0
      ? currentUser.defaultPublicationMarkets
      : ['FR'];

    return {
      marketCode: initialMarkets[0] || 'FR',
      selectedMarkets: initialMarkets,
      marketPublications: {
        FR: { status: 'active', isPrimary: true, currency: 'EUR' },
      },
      taxonomyNodeId: 'home.furniture.sofas',
      listingIntent: 'SELL',
      title: '',
      description: '',
      condition: 'very_good',
      attributes: {},
      photos: [
        {
          id: 'p-initial',
          url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
          isCover: true,
          alt: 'Photo de couverture',
        },
      ],
      pricing: {
        priceModel: 'fixed',
        amount: 150,
        currency: 'EUR',
        isNegotiable: true,
        isFreeDonation: false,
      },
      transaction: {
        allowContact: true,
        allowDirectPurchase: true,
        allowReservation: true,
      },
      fulfillment: {
        allowHandDelivery: true,
        allowParcelShipping: false,
        allowBulkyDelivery: true,
        allowSellerDelivery: false,
        allowStorePickup: false,
        packageSpecs: { sizeTier: 'medium' },
      },
      proInventory: {
        stock: 1,
        sku: '',
      },
      location: {
        city: 'Paris 11e',
        postalCode: '75011',
        countryCode: 'FR',
        hideExactAddress: true,
      },
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    };
  });

  // Autosave Draft
  useEffect(() => {
    publicationService.saveDraft(draft, currentUser?.id);
  }, [draft, currentUser]);

  const updateDraft = (updates: Partial<PublicationDraftState>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const updateAttribute = (attrCode: string, value: any) => {
    setDraft((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [attrCode]: value,
      },
    }));
  };

  // Compile Schema dynamically
  const schema = useMemo(() => {
    return publicationResolver.resolve({
      taxonomyNodeId: draft.taxonomyNodeId,
      marketCode: draft.marketCode,
      sellerRole: currentUser?.role,
      listingIntent: draft.listingIntent,
      currentValues: draft.attributes,
    });
  }, [draft.taxonomyNodeId, draft.marketCode, currentUser?.role, draft.listingIntent, draft.attributes]);

  // Resolve Transaction & Fulfillment capabilities
  const transactionCaps = useMemo(() => {
    return transactionCapabilitiesService.resolve({
      taxonomyNodeId: draft.taxonomyNodeId,
      marketCode: draft.marketCode,
      sellerType: currentUser?.role === 'pro_seller' ? 'pro' : 'individual',
      listingIntent: draft.listingIntent,
      price: draft.pricing.amount,
      stock: draft.proInventory?.stock,
    });
  }, [draft.taxonomyNodeId, draft.marketCode, currentUser?.role, draft.listingIntent, draft.pricing.amount, draft.proInventory?.stock]);

  const fulfillmentCaps = useMemo(() => {
    return fulfillmentResolver.resolveCapabilities({
      taxonomyNodeId: draft.taxonomyNodeId,
      marketCode: draft.marketCode,
      sellerType: currentUser?.role === 'pro_seller' ? 'pro' : 'individual',
      price: draft.pricing.amount,
    });
  }, [draft.taxonomyNodeId, draft.marketCode, currentUser?.role, draft.pricing.amount]);

  // Category Search Results
  const categorySearchResults = useMemo(() => {
    if (!categorySearchQuery.trim()) return null;
    return taxonomyService.searchTaxonomy(categorySearchQuery, 8);
  }, [categorySearchQuery]);

  // Media Handlers
  const handleAddSamplePhoto = () => {
    const nextUrl = samplePhotoUrls[draft.photos.length % samplePhotoUrls.length];
    const newPhotos = [
      ...draft.photos,
      {
        id: `p-${Date.now()}`,
        url: nextUrl,
        isCover: draft.photos.length === 0,
        alt: `Photo ${draft.photos.length + 1}`,
      },
    ];
    updateDraft({ photos: newPhotos });
    toast.success('Photo exemple ajoutée avec succès.');
  };

  const handleRemovePhoto = (photoId: string) => {
    const remaining = draft.photos.filter((p) => p.id !== photoId);
    if (remaining.length > 0 && !remaining.some((p) => p.isCover)) {
      remaining[0].isCover = true;
    }
    updateDraft({ photos: remaining });
  };

  const handleSetCoverPhoto = (photoId: string) => {
    const updated = draft.photos.map((p) => ({
      ...p,
      isCover: p.id === photoId,
    }));
    updateDraft({ photos: updated });
    toast.success('Photo de couverture mise à jour.');
  };

  // AI Assistant
  const handleGenerateWithAI = async () => {
    const promptToUse = aiPromptKeyword.trim() || draft.title.trim();
    if (!promptToUse) {
      toast.error('Veuillez renseigner un mot-clé ou titre d\'article pour lancer l\'assistant IA.');
      return;
    }

    setIsGeneratingWithAI(true);
    try {
      const result: ListingAIGenerationResult = await geminiService.generateListingAssistance({
        rawInput: promptToUse,
        condition: draft.condition as any,
        categoryHint: schema?.node.name,
        existingTitle: draft.title,
        existingPrice: draft.pricing.amount,
      });

      updateDraft({
        title: result.title,
        description: result.description,
        pricing: {
          ...draft.pricing,
          amount: draft.pricing.amount > 0 ? draft.pricing.amount : result.estimatedPrice.recommended,
        },
      });

      if (result.tips) {
        setAiGeneratedTips(result.tips);
      }

      toast.success('Annonce optimisée avec succès grâce à Gemini !', 'Rédaction IA');
    } catch {
      toast.error('Une erreur est survenue lors de la génération IA.');
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  // Step Validation & Navigation
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!draft.taxonomyNodeId) {
        toast.error('Veuillez sélectionner une catégorie finale pour continuer.');
        return;
      }
    } else if (currentStep === 4) {
      if (!draft.title.trim()) {
        toast.error('Veuillez renseigner un titre pour votre annonce.');
        return;
      }
      if (!draft.description.trim()) {
        toast.error('Veuillez renseigner une description détaillée.');
        return;
      }
    } else if (currentStep === 3) {
      if (draft.photos.length === 0) {
        toast.error('Veuillez ajouter au moins une photo pour illustrer votre annonce.');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 10));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Publish Handler
  const handleFinalPublish = async () => {
    const validation = publicationService.validateDraft(draft, currentUser);
    if (!validation.isValid) {
      toast.error(validation.errors[0]?.message || 'Veuillez corriger les erreurs avant de publier.');
      return;
    }

    setIsPublishing(true);
    try {
      const userToUse = currentUser || {
        id: 'buyer_thomas',
        name: 'Thomas Laurent',
        email: 'thomas@example.com',
        role: 'individual_seller',
        type: 'individual',
        status: 'active',
        isVerified: true,
      };

      const published = await publicationService.publishListing(draft, userToUse as any);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success('Votre annonce est en ligne et visible par tous les acheteurs !', 'Annonce publiée');
      navigate(`/annonce/${published.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la publication.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">
            Publication Marketplace Canonique
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Déposer une annonce sur Shongre
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            Étape {currentStep} / {STEPS.length}
          </Badge>
          <span className="text-xs text-stone-500 font-mono hidden sm:inline">Brouillon auto-sauvegardé</span>
        </div>
      </div>

      {/* Progress.
          Phones get a compact "where am I / what's next" summary with a progress
          bar; the full 10-step rail only appears once there is room for it, so a
          small screen is not asked to scroll a header sideways. */}
      <div className="bg-white p-3 rounded-2xl border border-border-base shadow-xs">
        {/* Compact mobile progress */}
        <div className="md:hidden space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-bold text-stone-900 truncate">
              {STEPS[currentStep - 1]?.label}
            </span>
            <span className="text-xs font-semibold text-stone-500 shrink-0">
              Étape {currentStep} / {STEPS.length}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full bg-bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label={`Progression de la publication : étape ${currentStep} sur ${STEPS.length}`}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-normal"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
          {currentStep < STEPS.length && (
            <p className="text-xs text-stone-500">
              Ensuite : {STEPS[currentStep]?.label}
            </p>
          )}
        </div>

        {/* Full step rail from md up */}
        <ol className="hidden md:flex items-center justify-between text-xs">
          {STEPS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setCurrentStep(s.id)}
                aria-current={currentStep === s.id ? 'step' : undefined}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  currentStep === s.id
                    ? 'bg-primary-light text-primary ring-1 ring-primary'
                    : currentStep > s.id
                    ? 'text-success hover:bg-stone-50'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-micro font-black shrink-0 ${
                    currentStep === s.id
                      ? 'bg-primary text-white'
                      : currentStep > s.id
                      ? 'bg-success text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {currentStep > s.id ? '✓' : s.id}
                </span>
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CATEGORY & INTENT SELECTION */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Que souhaitez-vous publier ?
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Sélectionnez l'intention et la catégorie exacte dans la taxonomie Shongre.
            </p>
          </div>

          {/* Listing Intent Selector */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              Type d'annonce (Intention)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { value: 'SELL', label: 'Vendre un bien', desc: 'Vente standard' },
                { value: 'GIVE', label: 'Faire un don', desc: 'Gratuit (0 €)' },
                { value: 'EXCHANGE', label: 'Échange de biens', desc: 'Troc / Échange' },
                { value: 'RENT', label: 'Location', desc: 'Louer un bien' },
                { value: 'OFFER_SERVICE', label: 'Proposer un service', desc: 'Artisan, cours, presta' },
                { value: 'JOB_OFFER', label: 'Offre d\'emploi', desc: 'Recrutement' },
              ].map((it) => (
                <button
                  key={it.value}
                  type="button"
                  onClick={() => updateDraft({ listingIntent: it.value as ListingIntent })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    draft.listingIntent === it.value
                      ? 'border-primary bg-primary-light text-primary font-bold'
                      : 'border-border-base bg-white hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  <div className="text-xs font-bold">{it.label}</div>
                  <div className="text-micro text-stone-500 mt-0.5">{it.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Taxonomy Search */}
          <div className="pt-4 border-t border-border-subtle space-y-3">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Rechercher une catégorie ou un type de bien
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="ex: Canapé d'angle, iPhone 15, Voitures, Vélos..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-bg-base text-xs text-stone-900 rounded-xl border border-border-base focus:outline-none focus:border-primary font-medium"
              />
            </div>

            {categorySearchResults && (
              <div className="p-2 border border-border-base rounded-xl divide-y divide-border-subtle bg-bg-base/40 text-xs">
                {categorySearchResults.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      updateDraft({ taxonomyNodeId: n.id });
                      setCategorySearchQuery('');
                    }}
                    className="w-full p-2.5 text-left hover:bg-white flex items-center justify-between transition-colors rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon category={n} size="sm" />
                      <div>
                        <div className="font-bold text-stone-900">{n.name}</div>
                        <div className="text-micro text-stone-500">
                          {taxonomyService.getBreadcrumbs(n.id).map((b) => b.label).join(' › ')}
                        </div>
                      </div>
                    </div>
                    {draft.taxonomyNodeId === n.id && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Root Categories Grid */}
          <div className="pt-4 border-t border-border-subtle space-y-3">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Ou parcourez les univers
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1">
              {taxonomyService.getRootCategories().map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    const children = taxonomyService.getChildren(cat.id);
                    updateDraft({ taxonomyNodeId: children[0]?.id || cat.id });
                  }}
                  title={cat.name}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    schema?.ancestors[0]?.id === cat.id || draft.taxonomyNodeId === cat.id
                      ? 'border-primary bg-primary-light text-primary font-bold shadow-xs'
                      : 'border-border-base bg-white hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  <CategoryIcon category={cat} size="md" />
                  <span className="text-xs font-bold line-clamp-1">{getTaxonomyLabel(cat, 'compact')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Current Selected Breadcrumb Path */}
          {schema && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold block mb-0.5">Catégorie active validée :</span>
                <span className="font-mono text-emerald-900">
                  {taxonomyService.getBreadcrumbs(schema.node.id).map((b) => b.label).join(' › ')}
                </span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: CHARACTERISTICS & DYNAMIC ATTRIBUTES */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Caractéristiques techniques ({schema?.node.name})
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Renseignez l'état du produit et les critères spécifiques pour optimiser la recherche.
            </p>
          </div>

          {/* Condition Scheme Selector */}
          <div>
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
              État du bien / produit
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(schema?.conditionScheme || []).map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateDraft({ condition: c.value })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    draft.condition === c.value
                      ? 'border-primary bg-primary-light text-primary font-bold ring-1 ring-primary'
                      : 'border-border-base bg-white hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  <div className="text-xs font-bold">{c.label}</div>
                  <div className="text-micro text-stone-500 mt-0.5">{c.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Attributes Grid */}
          {schema && schema.fields.length > 0 && (
            <div className="pt-4 border-t border-border-subtle space-y-4">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>Critères détaillés</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {schema.fields.map((field) => {
                  if (!field.isVisiblyMet) return null;
                  const attr = field.attribute;
                  const value = draft.attributes?.[attr.code] ?? '';

                  if (attr.dataType === 'select') {
                    return (
                      <FormField key={attr.id} label={attr.label} required={field.isRequired} hint={attr.helpText}>
                        <select
                          value={value}
                          onChange={(e) => updateAttribute(attr.code, e.target.value)}
                          className="w-full h-10 px-3 bg-bg-base border border-border-base rounded-xl text-xs font-semibold text-stone-900 focus:border-primary focus:outline-none"
                        >
                          <option value="">Sélectionner une option...</option>
                          {attr.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    );
                  }

                  if (attr.dataType === 'number' || attr.dataType === 'year') {
                    return (
                      <FormField
                        key={attr.id}
                        label={`${attr.label} ${attr.unit ? `(${attr.unit})` : ''}`}
                        required={field.isRequired}
                        hint={attr.helpText}
                      >
                        <Input
                          type="number"
                          placeholder={attr.validation?.placeholder || (attr.unit ? `ex: 50 ${attr.unit}` : '')}
                          value={value}
                          min={attr.validation?.min}
                          max={attr.validation?.max}
                          onChange={(e) => updateAttribute(attr.code, e.target.value ? Number(e.target.value) : '')}
                          className="h-10 text-xs"
                        />
                      </FormField>
                    );
                  }

                  if (attr.dataType === 'boolean') {
                    return (
                      <div key={attr.id} className="flex items-center pt-6">
                        <Checkbox
                          label={attr.label}
                          description={attr.helpText}
                          checked={!!value}
                          onChange={(e) => updateAttribute(attr.code, e.target.checked)}
                        />
                      </div>
                    );
                  }

                  return (
                    <FormField key={attr.id} label={attr.label} required={field.isRequired} hint={attr.helpText}>
                      <Input
                        type="text"
                        placeholder={attr.validation?.placeholder || ''}
                        value={value}
                        onChange={(e) => updateAttribute(attr.code, e.target.value)}
                        className="h-10 text-xs"
                      />
                    </FormField>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PHOTOS & MEDIA */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Photos de votre annonce
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Les annonces avec au moins 3 photos génèrent 5x plus de contacts. La première photo sert de couverture.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {draft.photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-xl overflow-hidden border-2 border-border-base bg-bg-base"
              >
                <Image src={photo.url} alt={photo.alt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    {!photo.isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetCoverPhoto(photo.id)}
                        className="w-full py-1 bg-white/90 text-stone-900 text-micro font-bold rounded hover:bg-white cursor-pointer"
                      >
                        Mettre en couverture
                      </button>
                    )}
                  </div>
                </div>
                {photo.isCover && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-micro font-bold px-1.5 py-0.5 rounded shadow-xs">
                    Couverture
                  </div>
                )}
              </div>
            ))}

            {draft.photos.length < 8 && (
              <button
                type="button"
                onClick={handleAddSamplePhoto}
                className="aspect-square rounded-xl border-2 border-dashed border-border-base hover:border-primary bg-bg-base flex flex-col items-center justify-center gap-1.5 text-stone-500 hover:text-primary transition-colors cursor-pointer p-4"
              >
                <Camera className="w-6 h-6 text-stone-400" />
                <span className="text-xs font-bold">+ Ajouter photo</span>
                <span className="text-micro text-stone-500">Exemple démo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: TITLE, DESCRIPTION & AI */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Titre & Description détaillée
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Rédigez un titre clair ou utilisez l'assistant IA Gemini.
            </p>
          </div>

          {/* AI GEMINI ASSISTANT */}
          <div className="p-4 bg-gradient-to-r from-primary-light via-orange-50/70 to-amber-50/80 rounded-2xl border border-primary-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                    Assistant IA Rédaction Gemini
                  </h3>
                  <p className="text-micro text-stone-500">
                    Générez une description optimisée pour le SEO et le taux de conversion
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateWithAI}
                isLoading={isGeneratingWithAI}
                leftIcon={<Bot className="w-3.5 h-3.5" />}
              >
                Générer avec l'IA
              </Button>
            </div>
          </div>

          <FormField label="Titre de l'annonce" required hint="Indiquez le produit, la marque et le modèle précis">
            <Input
              placeholder="ex: Canapé scandinave 3 places tissu bouclette beige"
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
            />
          </FormField>

          <FormField label="Description détaillée" required hint="Précisez l'état, l'historique d'achat, les accessoires inclus">
            <Textarea
              rows={6}
              placeholder="Vends canapé en excellent état, très confortable. Facture d'achat fournie..."
              value={draft.description}
              onChange={(e) => updateDraft({ description: e.target.value })}
            />
          </FormField>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: PRICING & STOCK */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Prix de vente & Stock
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Définissez votre tarification en {schema?.currency.symbol || '€'}.
            </p>
          </div>

          <div className="space-y-4">
            <Checkbox
              label="Faire un don gratuit (0 €)"
              description="Idéal pour désencombrer et donner une seconde vie à vos objets"
              checked={draft.pricing.isFreeDonation}
              onChange={(e) =>
                updateDraft({
                  pricing: {
                    ...draft.pricing,
                    isFreeDonation: e.target.checked,
                    amount: e.target.checked ? 0 : 50,
                  },
                })
              }
            />

            {!draft.pricing.isFreeDonation && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={`Prix de vente (${schema?.currency.symbol || '€'})`} required>
                  <Input
                    type="number"
                    placeholder="ex: 150"
                    value={draft.pricing.amount || ''}
                    onChange={(e) =>
                      updateDraft({
                        pricing: {
                          ...draft.pricing,
                          amount: Number(e.target.value),
                        },
                      })
                    }
                  />
                </FormField>

                <div className="flex items-center pt-6">
                  <Checkbox
                    label="Prix négociable"
                    description="Permet aux acheteurs de faire des offres de prix"
                    checked={draft.pricing.isNegotiable}
                    onChange={(e) =>
                      updateDraft({
                        pricing: {
                          ...draft.pricing,
                          isNegotiable: e.target.checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* Pro Inventory section if Pro Seller */}
            {currentUser?.role === 'pro_seller' && (
              <div className="pt-4 border-t border-border-subtle space-y-3">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-primary" />
                  <span>Gestion des stocks & Référence Professionnelle</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Quantité en stock">
                    <Input
                      type="number"
                      min={1}
                      value={draft.proInventory?.stock ?? 1}
                      onChange={(e) =>
                        updateDraft({
                          proInventory: {
                            ...draft.proInventory,
                            stock: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </FormField>
                  <FormField label="Référence interne / SKU (facultatif)">
                    <Input
                      placeholder="ex: CAN-BOUC-BEIGE-01"
                      value={draft.proInventory?.sku || ''}
                      onChange={(e) =>
                        updateDraft({
                          proInventory: {
                            ...draft.proInventory,
                            sku: e.target.value,
                          },
                        })
                      }
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: TRANSACTIONS & MODES */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Comment souhaitez-vous vendre ?
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Activez les options de transaction autorisées pour cette catégorie.
            </p>
          </div>

          <div className="space-y-3">
            {/* Contact Direct */}
            <div className="p-4 rounded-xl border border-border-base bg-bg-base/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Contact direct & Messagerie</div>
                  <div className="text-micro text-stone-500">
                    Les acheteurs peuvent vous poser des questions via la messagerie Shongre.
                  </div>
                </div>
              </div>
              <Checkbox
                checked={draft.transaction.allowContact}
                onChange={(e) =>
                  updateDraft({
                    transaction: { ...draft.transaction, allowContact: e.target.checked },
                  })
                }
              />
            </div>

            {/* Direct Online Purchase */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                transactionCaps.canDirectPurchase
                  ? 'border-border-base bg-bg-base/40'
                  : 'border-stone-200 bg-stone-50 opacity-60'
              } flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
                    <span>Achat en ligne direct (Sans réservation)</span>
                    <span className="text-micro bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      Séquestre Garanti
                    </span>
                  </div>
                  <div className="text-micro text-stone-500">
                    L'acheteur peut payer immédiatement par carte bancaire. Vos fonds sont sécurisés.
                  </div>
                </div>
              </div>
              <Checkbox
                disabled={!transactionCaps.canDirectPurchase}
                checked={draft.transaction.allowDirectPurchase && transactionCaps.canDirectPurchase}
                onChange={(e) =>
                  updateDraft({
                    transaction: { ...draft.transaction, allowDirectPurchase: e.target.checked },
                  })
                }
              />
            </div>

            {/* Reservation */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                transactionCaps.canReserve
                  ? 'border-border-base bg-bg-base/40'
                  : 'border-stone-200 bg-stone-50 opacity-60'
              } flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Réservation avec acompte</div>
                  <div className="text-micro text-stone-500">
                    Permet à l'acheteur de bloquer l'article pendant le temps de convenir d'un rendez-vous.
                  </div>
                </div>
              </div>
              <Checkbox
                disabled={!transactionCaps.canReserve}
                checked={draft.transaction.allowReservation && transactionCaps.canReserve}
                onChange={(e) =>
                  updateDraft({
                    transaction: { ...draft.transaction, allowReservation: e.target.checked },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: FULFILLMENT & SHIPPING */}
      {/* ========================================================================= */}
      {currentStep === 7 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Modes de remise & Expédition
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Déterminez comment les acheteurs peuvent récupérer l'article.
            </p>
          </div>

          <div className="space-y-3">
            {/* Hand Delivery */}
            <div className="p-4 rounded-xl border border-border-base bg-bg-base/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Remise en main propre</div>
                  <div className="text-micro text-stone-500">
                    Gratuit, avec validation par code secret PIN à 6 chiffres lors du rendez-vous.
                  </div>
                </div>
              </div>
              <Checkbox
                checked={draft.fulfillment.allowHandDelivery}
                onChange={(e) =>
                  updateDraft({
                    fulfillment: { ...draft.fulfillment, allowHandDelivery: e.target.checked },
                  })
                }
              />
            </div>

            {/* Parcel Shipping */}
            {fulfillmentCaps.allowParcelShipping && (
              <div className="p-4 rounded-xl border border-border-base bg-bg-base/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">Livraison en colis (Mondial Relay, Colissimo)</div>
                      <div className="text-micro text-stone-500">
                        Étiquette prépayée générée automatiquement. L'acheteur règle les frais de port.
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={draft.fulfillment.allowParcelShipping}
                    onChange={(e) =>
                      updateDraft({
                        fulfillment: { ...draft.fulfillment, allowParcelShipping: e.target.checked },
                      })
                    }
                  />
                </div>

                {draft.fulfillment.allowParcelShipping && (
                  <div className="pt-3 border-t border-border-subtle">
                    <label className="text-xs font-bold text-stone-700 block mb-1.5">
                      Gabarit du colis (Poids estimé)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { id: 'small', label: 'Petit (< 500g)', desc: 'T-shirt, smartphone' },
                        { id: 'medium', label: 'Moyen (< 2kg)', desc: 'Chaussures, tablette' },
                        { id: 'large', label: 'Grand (< 5kg)', desc: 'Manteau, cafetière' },
                        { id: 'xlarge', label: 'Très grand (< 30kg)', desc: 'Ampli, petit meuble' },
                      ].map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() =>
                            updateDraft({
                              fulfillment: {
                                ...draft.fulfillment,
                                packageSpecs: { sizeTier: pkg.id as PackageSizeTier },
                              },
                            })
                          }
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                            draft.fulfillment.packageSpecs?.sizeTier === pkg.id
                              ? 'bg-stone-900 text-white font-bold'
                              : 'bg-white text-stone-800 border-border-base hover:bg-stone-50'
                          }`}
                        >
                          <div className="text-xs font-bold">{pkg.label}</div>
                          <div className="text-micro opacity-70 mt-0.5">{pkg.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bulky Delivery */}
            {fulfillmentCaps.allowBulkyDelivery && (
              <div className="p-4 rounded-xl border border-border-base bg-bg-base/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">Transport de meubles & Gros colis (Cocolis)</div>
                    <div className="text-micro text-stone-500">
                      Idéal pour canapés, tables, électroménager lourd avec transporteur spécialisé.
                    </div>
                  </div>
                </div>
                <Checkbox
                  checked={draft.fulfillment.allowBulkyDelivery}
                  onChange={(e) =>
                    updateDraft({
                      fulfillment: { ...draft.fulfillment, allowBulkyDelivery: e.target.checked },
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 8: LOCATION & PRIVACY */}
      {/* ========================================================================= */}
      {currentStep === 8 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Localisation du bien
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Par respect pour votre vie privée, seule la ville et le code postal sont affichés publiquement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Ville" required>
              <Input
                placeholder="ex: Paris, Lyon, Bordeaux"
                value={draft.location.city}
                onChange={(e) =>
                  updateDraft({
                    location: { ...draft.location, city: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="Code postal" required>
              <Input
                placeholder="ex: 75011, 69002, 33000"
                value={draft.location.postalCode}
                onChange={(e) =>
                  updateDraft({
                    location: { ...draft.location, postalCode: e.target.value },
                  })
                }
              />
            </FormField>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 9: MARKETS & VISIBILITY BOOST OPTIONS */}
      {/* ========================================================================= */}
      {currentStep === 9 && (
        <div className="space-y-6">
          {/* MULTI-MARKET SELECTION CARD */}
          <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                    Marchés et pays de diffusion
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Diffusez votre annonce simultanément sur plusieurs marchés Shongre pour maximiser sa visibilité.
                </p>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allEligible = marketService
                      .getActiveMarkets()
                      .filter((m) =>
                        marketService.isCategoryEnabledInMarket(
                          m.code,
                          schema?.node?.slug || schema?.ancestors[0]?.slug || ''
                        )
                      )
                      .map((m) => m.code);
                    updateDraft({ selectedMarkets: allEligible.length > 0 ? allEligible : ['FR'] });
                    toast.success('Tous les marchés éligibles ont été sélectionnés.');
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:bg-primary-light/50 font-bold transition-colors cursor-pointer"
                >
                  Tous les marchés
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateDraft({ selectedMarkets: ['FR'] });
                    toast.info('Diffusion restreinte à la France uniquement.');
                  }}
                  className="text-xs px-3 py-1.5 rounded-xl border border-border-base text-stone-600 hover:bg-stone-50 font-bold transition-colors cursor-pointer"
                >
                  France seule
                </button>
              </div>
            </div>

            {/* Markets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {marketService.getMarkets().map((m) => {
                const categorySlug = schema?.node?.slug || schema?.ancestors[0]?.slug || '';
                const isCatEnabled = marketService.isCategoryEnabledInMarket(m.code, categorySlug);
                const isSelected = (draft.selectedMarkets || ['FR']).includes(m.code);
                const isPrimary = m.isDefault || m.code === 'FR';
                const effectiveCfg = marketService.getEffectiveConfig(m.code);

                return (
                  <div
                    key={m.code}
                    onClick={() => {
                      if (!isCatEnabled && !isSelected) {
                        toast.error(
                          `La catégorie "${schema?.node?.name || 'actuelle'}" n'est pas encore ouverte sur le marché ${m.name}.`
                        );
                        return;
                      }
                      if (isPrimary && isSelected) {
                        toast.info('Le marché France est le marché de référence obligatoire pour cette annonce.');
                        return;
                      }

                      const currentSelected = draft.selectedMarkets || ['FR'];
                      const next = isSelected
                        ? currentSelected.filter((c) => c !== m.code)
                        : [...currentSelected, m.code];

                      // Ensure at least France remains
                      const finalMarkets = next.length === 0 ? ['FR'] : next;
                      updateDraft({ selectedMarkets: finalMarkets });
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary-light/40 ring-1 ring-primary shadow-xs'
                        : isCatEnabled
                        ? 'border-border-base bg-white hover:bg-stone-50'
                        : 'border-stone-200 bg-stone-50/70 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{m.flag}</span>
                          <div>
                            <div className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                              {m.name}
                              <span className="text-micro text-stone-500 font-semibold">({m.code})</span>
                            </div>
                            <div className="text-micro text-stone-500">
                              Devise : {effectiveCfg.localization.defaultCurrency} ({effectiveCfg.localization.currencySymbol})
                            </div>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!isCatEnabled || isPrimary}
                          onChange={() => {}} // Handled by container click
                          className="h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>

                      {/* Market Badges & Rules */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {isPrimary && (
                          <span className="text-micro bg-primary text-white font-bold px-2 py-0.5 rounded-full">
                            Marché d'origine (Principal)
                          </span>
                        )}
                        {isCatEnabled ? (
                          <span className="text-micro bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            ✓ Catégorie éligible
                          </span>
                        ) : (
                          <span className="text-micro bg-stone-200 text-stone-600 font-semibold px-2 py-0.5 rounded-full">
                            ✕ Catégorie restreinte
                          </span>
                        )}
                        {effectiveCfg.delivery?.enabled && (
                          <span className="text-micro bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                            Livraison
                          </span>
                        )}
                        {effectiveCfg.payments?.enabled && (
                          <span className="text-micro bg-purple-50 text-purple-700 font-medium px-2 py-0.5 rounded-full">
                            Séquestre
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transborder Note for Special Currencies */}
                    {effectiveCfg.localization.defaultCurrency !== 'EUR' && (
                      <div className="text-micro text-amber-800 bg-amber-50 rounded-lg p-1.5 mt-3 font-medium">
                        Conversion automatique en {effectiveCfg.localization.defaultCurrency} pour les acheteurs locaux.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cross-border Protection Notice */}
            <div className="p-4 bg-bg-base rounded-xl border border-border-base flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-stone-700 space-y-1">
                <span className="font-bold text-stone-900">Garantie & Sécurité Transfrontalière :</span>
                <p>
                  Toutes les transactions multi-marchés sont automatiquement couvertes par le séquestre Shongre. Les prix sont convertis en toute transparence et la TVA locale est appliquée en conformité avec la réglementation européenne et suisse.
                </p>
              </div>
            </div>
          </div>

          {/* VISIBILITY BOOST OPTIONS */}
          <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                Options de visibilité & Boost (Facultatif)
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Multipliez vos vues en positionnant votre annonce en tête des résultats sur tous vos marchés sélectionnés.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'standard', name: 'Publication Standard', price: 0, desc: 'Visible dans les résultats de recherche classiques.' },
                { id: 'highlight', name: 'Encadré Jaune Urgent', price: 4.90, desc: 'Bordure dorée et badge Urgent pour attirer l\'attention.' },
                { id: 'top_of_list', name: 'Remontée en tête 7 jours', price: 9.90, desc: 'Repositionne l\'annonce en 1ère position chaque matin.' },
              ].map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => updateDraft({ boostPackage: pack.id === 'standard' ? undefined : pack.id })}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    (pack.id === 'standard' && !draft.boostPackage) || draft.boostPackage === pack.id
                      ? 'border-primary bg-primary-light/60 ring-1 ring-primary'
                      : 'border-border-base bg-white hover:bg-stone-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black text-stone-900">{pack.name}</div>
                    <div className="text-micro text-stone-500 mt-1">{pack.desc}</div>
                  </div>
                  <div className="text-sm font-black text-primary mt-3">
                    {pack.price === 0 ? 'Gratuit' : formatPrice(pack.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 10: REVIEW & INSTANT PUBLISH */}
      {/* ========================================================================= */}
      {currentStep === 10 && (
        <div className="bg-white rounded-2xl border border-border-base p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              Vérification avant publication
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Relisez votre annonce. Vous pourrez la modifier à tout moment après publication.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Summary Details */}
            <div className="lg:col-span-7 space-y-4 text-xs">
              <div className="p-4 bg-bg-base rounded-xl border border-border-base space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">Catégorie</span>
                  <span className="font-bold text-stone-900">{schema?.node.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">Titre</span>
                  <span className="font-bold text-stone-900 truncate max-w-[200px]">{draft.title}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">Prix</span>
                  <span className="font-black text-primary text-sm">
                    {draft.pricing.isFreeDonation ? 'Don gratuit' : formatPrice(draft.pricing.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">Marchés de diffusion</span>
                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {(draft.selectedMarkets || ['FR']).map((mCode) => {
                      const m = marketService.getMarketByCode(mCode);
                      return (
                        <span
                          key={mCode}
                          className="text-micro font-bold bg-white border border-border-base px-2 py-0.5 rounded-full text-stone-800"
                        >
                          {m?.flag || '🌐'} {m?.name || mCode} {mCode === 'FR' ? '(Principal)' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
                  <span className="text-stone-500">Modes de transaction</span>
                  <span className="font-semibold text-stone-800">
                    {[
                      draft.transaction.allowDirectPurchase && 'Achat en ligne',
                      draft.transaction.allowReservation && 'Réservation',
                      draft.transaction.allowContact && 'Contact',
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Localisation</span>
                  <span className="font-bold text-stone-900">{draft.location.city} ({draft.location.postalCode})</span>
                </div>
              </div>

              {/* Multi-market compliance badge */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-xs font-bold text-emerald-900">
                  Prête à être publiée sur {(draft.selectedMarkets || ['FR']).length} marché{(draft.selectedMarkets || ['FR']).length > 1 ? 's' : ''} Shongre.
                </span>
              </div>
            </div>

            {/* Right Live Card Preview */}
            <div className="lg:col-span-5 space-y-2">
              <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Aperçu dans les résultats de recherche
              </div>
              <ListingCard
                listing={{
                  id: 'preview',
                  title: draft.title || 'Titre de l\'annonce',
                  description: draft.description,
                  price: draft.pricing.isFreeDonation ? 0 : draft.pricing.amount,
                  originalPrice: draft.pricing.originalPrice,
                  isNegotiable: draft.pricing.isNegotiable,
                  isFreeDonation: draft.pricing.isFreeDonation,
                  categorySlug: schema?.ancestors[0]?.slug || 'maison-deco',
                  subCategorySlug: schema?.node.slug || 'mobilier',
                  categoryLabel: schema?.ancestors[0]?.name || 'Maison',
                  subCategoryLabel: schema?.node.name || 'Mobilier',
                  condition: draft.condition as any,
                  sellerId: currentUser?.id || 'demo',
                  sellerName: currentUser?.name || 'Vendeur Shongre',
                  sellerType: currentUser?.role === 'pro_seller' ? 'pro' : 'individual',
                  sellerRating: 5.0,
                  sellerReviewCount: 12,
                  sellerIsVerified: true,
                  sellerCity: draft.location.city,
                  sellerPostalCode: draft.location.postalCode,
                  city: draft.location.city,
                  postalCode: draft.location.postalCode,
                  department: '75',
                  region: 'Île-de-France',
                  photos: draft.photos as any,
                  coverImageUrl: draft.photos[0]?.url || samplePhotoUrls[0],
                  deliveryOptions: [
                    { type: 'hand_delivery', available: draft.fulfillment.allowHandDelivery },
                    { type: 'home_delivery', available: draft.fulfillment.allowParcelShipping },
                  ],
                  isOnlinePaymentAvailable: draft.transaction.allowDirectPurchase,
                  isReservable: draft.transaction.allowReservation,
                  attributes: draft.attributes,
                  status: 'active',
                  marketCodes: draft.selectedMarkets || ['FR'],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  expiresAt: new Date().toISOString(),
                  viewsCount: 0,
                  favoritesCount: 0,
                  contactCount: 0,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border-base shadow-xs flex items-center justify-between">
        <Button
          variant="outline"
          size="md"
          onClick={handlePrevStep}
          disabled={currentStep === 1 || isPublishing}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Précédent
        </Button>

        <div className="flex items-center gap-2">
          {currentStep < 10 ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNextStep}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Étape suivante ({STEPS[currentStep]?.label || ''})</span>
              <span className="sm:hidden">Suivant</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleFinalPublish}
              isLoading={isPublishing}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
            >
              Publier mon annonce maintenant
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
