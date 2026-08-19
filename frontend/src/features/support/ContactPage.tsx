import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  User,
  Tag,
  ShoppingBag,
  DollarSign,
  CreditCard,
  Truck,
  Briefcase,
  ShieldAlert,
  ChevronRight,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  X,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { Button } from '../../design-system/primitives/Button';
import { FormField, Input, Textarea } from '../../design-system/primitives/FormField';
import {
  SupportCategory,
  SupportContext,
  SupportAttachment,
} from '../../domains/support/support.types';
import {
  SUPPORT_CATEGORIES,
  SupportCategoryDefinition,
  supportCategoriesService,
} from '../../domains/support/support.categories';
import { supportCapabilitiesService } from '../../domains/support/support.capabilities';
import { supportService } from '../../domains/support/support.service';
import { supportRepository } from '../../repositories/support.repository';
import { storageService } from '../../services/storage.service';
import { SupportContextCard } from './components/SupportContextCard';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTranslation } from '../../i18n/I18nProvider';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  User: <User className="w-5 h-5" />,
  Tag: <Tag className="w-5 h-5" />,
  ShoppingBag: <ShoppingBag className="w-5 h-5" />,
  DollarSign: <DollarSign className="w-5 h-5" />,
  CreditCard: <CreditCard className="w-5 h-5" />,
  Truck: <Truck className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  ShieldAlert: <ShieldAlert className="w-5 h-5" />,
  HelpCircle: <HelpCircle className="w-5 h-5" />,
};

export const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Contacter Shongre",
    description:
      "Une question, un problème sur une annonce ou une transaction ? Contactez l'équipe Shongre et suivez votre demande.",
    canonicalPath: "/contact",
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const toast = useToast();

  const [selectedCategory, setSelectedCategory] = useState<SupportCategory | null>(null);
  const [selectedReasonId, setSelectedReasonId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [requesterName, setRequesterName] = useState(currentUser?.name || '');
  const [requesterEmail, setRequesterEmail] = useState(currentUser?.email || '');
  const [context, setContext] = useState<SupportContext | undefined>(undefined);
  const [attachments, setAttachments] = useState<SupportAttachment[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);

  // Initialize capabilities
  const capabilities = supportCapabilitiesService.resolve({ viewer: currentUser });

  // Read URL query params for deep linking context
  useEffect(() => {
    const catParam = searchParams.get('category') as SupportCategory | null;
    const txId = searchParams.get('txId');
    const listingId = searchParams.get('listingId');

    if (catParam && SUPPORT_CATEGORIES.some((c) => c.id === catParam)) {
      setSelectedCategory(catParam);
    }

    if (txId) {
      const txList = storageService.getTransactions();
      const foundTx = txList.find((t) => t.id === txId);
      if (foundTx) {
        setContext({
          type: 'transaction',
          transactionId: foundTx.id,
          listingTitle: foundTx.listingTitle,
          amount: foundTx.amount,
        });
        setSelectedCategory('purchase');
      }
    } else if (listingId) {
      const listingList = storageService.getListings();
      const foundListing = listingList.find((l) => l.id === listingId);
      if (foundListing) {
        setContext({
          type: 'listing',
          listingId: foundListing.id,
          listingTitle: foundListing.title,
          listingPhotoUrl: foundListing.photos?.[0]?.url,
          price: foundListing.price,
          sellerId: foundListing.sellerId,
        });
        setSelectedCategory('listing');
      }
    }
  }, [searchParams]);

  // Sync user info if auth changes
  useEffect(() => {
    if (currentUser) {
      setRequesterName(currentUser.name);
      setRequesterEmail(currentUser.email);
    }
  }, [currentUser]);

  // Auto-generate subject when category & reason change
  const currentCategoryDef = selectedCategory
    ? supportCategoriesService.getCategory(selectedCategory)
    : undefined;
  const currentReasonDef =
    selectedCategory && selectedReasonId
      ? supportCategoriesService.getReason(selectedCategory, selectedReasonId)
      : undefined;

  useEffect(() => {
    if (currentReasonDef) {
      setSubject(currentReasonDef.label);
    }
  }, [currentReasonDef]);

  const handleSimulateAttachment = () => {
    const sampleFiles = [
      { name: 'capture_ecran_erreur.png', type: 'image' as const, size: 245000 },
      { name: 'recu_virement_bancaire.pdf', type: 'document' as const, size: 580000 },
      { name: 'photo_colis_endommage.jpg', type: 'image' as const, size: 1200000 },
    ];
    const picked = sampleFiles[attachments.length % sampleFiles.length];
    const newAtt: SupportAttachment = {
      id: `att-${Date.now()}`,
      type: picked.type,
      fileName: picked.name,
      fileSize: picked.size,
      url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80',
    };
    setAttachments((prev) => [...prev, newAtt]);
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      setErrors({ category: 'Veuillez sélectionner un sujet principal.' });
      return;
    }

    const validation = supportService.validateSupportInput({
      category: selectedCategory,
      reason: selectedReasonId,
      requesterName,
      requesterEmail,
      subject,
      description,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const created = await supportRepository.createRequest({
        requesterId: currentUser?.id,
        requesterName: requesterName.trim(),
        requesterEmail: requesterEmail.trim(),
        category: selectedCategory,
        reason: selectedReasonId,
        subject: subject.trim(),
        description: description.trim(),
        context,
        attachments,
        priority: currentReasonDef?.defaultPriority || 'normal',
      });

      setSubmittedReference(created.reference);
      toast.success(`Votre dossier porte la référence ${created.reference}.`, 'Demande envoyée');
    } catch (err: any) {
      setErrors({ submit: err.message || 'Impossible d\'envoyer votre demande. Réessayez.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedReference) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-border-base rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-full bg-success-surface text-success flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-stone-900">Demande d'assistance transmise</h1>
            <p className="text-xs sm:text-sm text-stone-600">
              Votre demande a bien été enregistrée par notre équipe de support client Shongre.
            </p>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl max-w-sm mx-auto">
            <span className="text-micro font-bold uppercase tracking-wider text-stone-500 block mb-0.5">
              Numéro de dossier
            </span>
            <span className="text-xl font-black text-stone-900 font-mono tracking-wider">
              {submittedReference}
            </span>
          </div>

          <div className="text-xs text-stone-500 space-y-1 max-w-md mx-auto">
            <p>
              Un conseiller Shongre étudie votre dossier et vous répondra directement{' '}
              {isAuthenticated ? 'dans votre espace client et par email' : `à l'adresse ${requesterEmail}`}.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            {isAuthenticated ? (
              <Button
                variant="primary"
                onClick={() => navigate('/compte/support')}
                className="font-bold"
              >
                Suivre mes demandes
              </Button>
            ) : (
              <Button variant="primary" onClick={() => navigate('/')} className="font-bold">
                Retour à l'accueil
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedReference(null);
                setSelectedCategory(null);
                setSelectedReasonId('');
                setDescription('');
                setAttachments([]);
              }}
            >
              Envoyer une autre demande
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* 1. Page Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Contacter le support Shongre
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Sélectionnez le motif de votre demande pour être orienté vers le service compétent.
        </p>
      </div>

      {/* 2. Step 1: Category Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-black uppercase tracking-wider text-stone-700">
          1. Quel est le sujet de votre demande ? <span className="text-danger">*</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {capabilities.availableCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedReasonId('');
                }}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-xs'
                    : 'border-border-base bg-white text-stone-800 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    isSelected ? 'bg-primary text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {CATEGORY_ICONS[cat.iconName] || <HelpCircle className="w-5 h-5" />}
                </div>

                <div>
                  <h2 className="font-bold text-xs sm:text-sm text-stone-900 leading-tight mb-1">
                    {cat.label}
                  </h2>
                  <p className="text-micro text-stone-500 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.category && <p className="text-xs font-bold text-danger">{errors.category}</p>}
      </div>

      {/* 3. Step 2: Reason Selector & Handoffs */}
      {currentCategoryDef && (
        <div className="space-y-4 pt-2 animate-fadeIn">
          <label className="block text-xs font-black uppercase tracking-wider text-stone-700">
            2. Précisez votre situation <span className="text-danger">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentCategoryDef.reasons.map((r) => {
              const isSelected = selectedReasonId === r.id;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReasonId(r.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-stone-900 font-bold ring-1 ring-primary/30'
                      : 'border-border-base bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xs leading-snug">{r.label}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-primary bg-primary' : 'border-stone-300'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.reason && <p className="text-xs font-bold text-danger">{errors.reason}</p>}

          {/* Handoff Banners */}
          {currentReasonDef?.isDisputeHandoff && (
            <div className="p-4 bg-warning-surface border border-warning-border rounded-2xl flex items-start gap-3 text-warning text-xs">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-warning">
                  Besoin d'ouvrir un litige sur une commande en cours ?
                </p>
                <p className="leading-relaxed">
                  Pour geler les fonds sous séquestre et être remboursé en cas de non-réception ou de colis non conforme, vous devez ouvrir un dossier de litige officiel directement depuis la transaction.
                </p>
                <Button
                  to="/compte/achats"
                  variant="primary"
                  size="sm"
                  className="font-bold mt-1"
                >
                  Accéder à mes achats pour ouvrir le litige
                </Button>
              </div>
            </div>
          )}

          {currentReasonDef?.isMessagingHandoff && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3 text-stone-800 text-xs">
              <MessageSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-stone-900">{t('support.contactPage.echangeDirectAvecLeVendeur')}</p>
                <p className="leading-relaxed">
                  Le support Shongre n'intervient pas pour les questions sur l'article (disponibilité, négociations de prix). Contactez directement le vendeur via la messagerie sécurisée.
                </p>
                <Button
                  to="/compte/messages"
                  variant="outline"
                  size="sm"
                  className="font-bold mt-1"
                >
                  Ouvrir la messagerie
                </Button>
              </div>
            </div>
          )}

          {currentReasonDef?.helpTip && !currentReasonDef.isDisputeHandoff && !currentReasonDef.isMessagingHandoff && (
            <div className="p-3.5 bg-stone-100 border border-stone-200 rounded-2xl text-xs text-stone-700 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <span>
                <strong>Conseil :</strong> {currentReasonDef.helpTip}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. Step 3: Adaptive Contact Form */}
      {selectedCategory && selectedReasonId && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-border-base rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn"
        >
          <h2 className="text-base font-black text-stone-900">{t('support.contactPage.3RedigezVotreMessage')}</h2>

          {/* Context Card Preview if linked */}
          {context && (
            <SupportContextCard context={context} onRemove={() => setContext(undefined)} />
          )}

          {/* Guest Identity Fields (only when unauthenticated) */}
          {!isAuthenticated && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t('support.contactPage.votreNomComplet')} required error={errors.requesterName}>
                <Input
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="ex: Jean Dupont"
                />
              </FormField>

              <FormField label={t('support.contactPage.votreAdresseEmail')} required error={errors.requesterEmail}>
                <Input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="ex: jean@exemple.fr"
                />
              </FormField>
            </div>
          )}

          {/* Subject Field */}
          <FormField label={t('support.contactPage.objetDeLaDemande')} required error={errors.subject}>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('support.contactPage.objetDeVotreDemande')}
            />
          </FormField>

          {/* Description Textarea */}
          <FormField
            label={t('support.contactPage.detaillezVotreSituation')}
            required
            hint="Expliquez ce qui s'est passé avec un maximum de précision."
            error={errors.description}
          >
            <Textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('support.contactPage.decrivezVotreProblemeLesDemarches')}
            />
          </FormField>

          {/* Attachment Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              Pièces jointes ou captures d'écran (facultatif)
            </label>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-800"
                  >
                    <span className="font-medium truncate max-w-[200px]">{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-stone-500 hover:text-stone-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleSimulateAttachment}
              className="w-full p-4 border border-dashed border-border-base rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors flex flex-col items-center justify-center text-center cursor-pointer"
            >
              <UploadCloud className="w-5 h-5 text-stone-400 mb-1" />
              <span className="text-xs font-bold text-stone-800">
                Ajouter une capture ou un justificatif (Simulation démo)
              </span>
              <span className="text-micro text-stone-500">{t('support.contactPage.jpgPngOuPdfMax')}</span>
            </button>
          </div>

          {errors.submit && (
            <div className="p-3 bg-danger-surface border border-danger-border text-danger rounded-xl text-xs font-medium">
              {errors.submit}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="font-black"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
