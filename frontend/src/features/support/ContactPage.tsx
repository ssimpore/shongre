import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";
import {
  SupportCategory,
  SupportContext,
} from "../../domains/support/support.types";
import {
  SUPPORT_CATEGORIES,
  supportCategoriesService,
} from "../../domains/support/support.categories";
import { supportCapabilitiesService } from "../../domains/support/support.capabilities";
import { supportService } from "../../domains/support/support.service";
import { services } from "../../api/client/service-registry";
import type { SupportCaseCategory } from "@shongre/contracts/support";
import { SupportContextCard } from "./components/SupportContextCard";
import { routes } from "../../configuration/routes";
import { useStaticPageSeo } from "../../hooks/useStaticPageSeo";
import { useTranslation } from "../../i18n/I18nProvider";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  User: <User className="w-icon-lg h-icon-lg" />,
  Tag: <Tag className="w-icon-lg h-icon-lg" />,
  ShoppingBag: <ShoppingBag className="w-icon-lg h-icon-lg" />,
  DollarSign: <DollarSign className="w-icon-lg h-icon-lg" />,
  CreditCard: <CreditCard className="w-icon-lg h-icon-lg" />,
  Truck: <Truck className="w-icon-lg h-icon-lg" />,
  Briefcase: <Briefcase className="w-icon-lg h-icon-lg" />,
  ShieldAlert: <ShieldAlert className="w-icon-lg h-icon-lg" />,
  HelpCircle: <HelpCircle className="w-icon-lg h-icon-lg" />,
};

export const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  useStaticPageSeo("/contact");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const toast = useToast();

  const [selectedCategory, setSelectedCategory] =
    useState<SupportCategory | null>(null);
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const categoryChosen = useRef(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [requesterName, setRequesterName] = useState(currentUser?.name || "");
  const [requesterEmail, setRequesterEmail] = useState(
    currentUser?.email || "",
  );
  const [context, setContext] = useState<SupportContext | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReference, setSubmittedReference] = useState<string | null>(
    null,
  );

  // Initialize capabilities
  const capabilities = supportCapabilitiesService.resolve({
    viewer: currentUser,
  });

  // Read URL query params for deep linking context
  useEffect(() => {
    let active = true;
    const catParam = searchParams.get("category") as SupportCategory | null;
    const txId = searchParams.get("txId");
    const listingId = searchParams.get("listingId");

    if (catParam && SUPPORT_CATEGORIES.some((c) => c.id === catParam)) {
      setSelectedCategory(catParam);
      const reason = searchParams.get("reason");
      if (reason && supportCategoriesService.getReason(catParam, reason))
        setSelectedReasonId(reason);
    }

    if (txId && isAuthenticated) {
      void services.orders
        .getOrderById(txId)
        .then((foundTx) => {
          if (!active || !foundTx) return;
          setContext({
            type: "transaction",
            transactionId: foundTx.id,
            orderNumber: foundTx.code,
            listingId: foundTx.listingId,
            listingTitle: foundTx.listingTitle,
            listingPhotoUrl:
              foundTx.listingCoverImageUrl || foundTx.listingPhotoUrl,
            amount: foundTx.amount,
            currency: foundTx.currency,
          });
          if (!catParam && !categoryChosen.current)
            setSelectedCategory("purchase");
        })
        .catch(() => {
          if (active)
            setErrors({
              context: t("support.contact.contextUnavailable"),
            });
        });
    } else if (listingId) {
      void services.listings
        .getListingById(listingId)
        .then((foundListing) => {
          if (!active || !foundListing) return;
          setContext({
            type: "listing",
            listingId: foundListing.id,
            listingTitle: foundListing.title,
            listingPhotoUrl: foundListing.photos?.[0]?.url,
            price: foundListing.price,
            sellerId: foundListing.sellerId,
          });
          if (!catParam && !categoryChosen.current)
            setSelectedCategory("listing");
        })
        .catch(() => {
          if (active)
            setErrors({
              context: t("support.contact.listingUnavailable"),
            });
        });
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, searchParams, t]);

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

  const returnParams = new URLSearchParams();
  for (const key of ["listingId", "txId"]) {
    const value = searchParams.get(key);
    if (value) returnParams.set(key, value);
  }
  if (selectedCategory) returnParams.set("category", selectedCategory);
  if (selectedReasonId) returnParams.set("reason", selectedReasonId);
  const authReturnTo = `/contact?${returnParams.toString()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate(routes.auth.login(authReturnTo));
      return;
    }
    if (!selectedCategory) {
      setErrors({ category: "Veuillez sélectionner un sujet principal." });
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
      const categoryMap: Partial<Record<SupportCategory, SupportCaseCategory>> =
        {
          account: "account",
          listing: "listing",
          payment: "payment",
          subscription: "subscription",
          verification: "verification",
          safety: "safety",
          privacy: "privacy",
          technical: "technical",
        };
      const created = await services.support.createCase({
        category: categoryMap[selectedCategory] ?? "other",
        subject: subject.trim(),
        description: description.trim(),
        listingId: context?.type === "listing" ? context.listingId : undefined,
        orderId:
          context?.type === "transaction" ? context.transactionId : undefined,
      });

      setSubmittedReference(created.reference);
      toast.success(
        `Votre dossier porte la référence ${created.reference}.`,
        "Demande envoyée",
      );
    } catch (err: any) {
      setErrors({
        submit: err.message || "Impossible d'envoyer votre demande. Réessayez.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (submittedReference) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-bg-surface border border-border-base rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-full bg-success-surface text-success flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-main">
              Demande d'assistance transmise
            </h1>
            <p className="text-xs sm:text-sm text-text-supporting">
              {t("support.contactPage.votreDemandeABienEte")}
            </p>
          </div>

          <div className="p-4 bg-surface-soft border border-border-disabled rounded-2xl max-w-sm mx-auto">
            <span className="text-micro font-bold uppercase tracking-wider text-text-tertiary block mb-0.5">
              {t("support.contactPage.numeroDeDossier")}
            </span>
            <span className="text-xl font-bold text-text-main font-mono tracking-wider">
              {submittedReference}
            </span>
          </div>

          <div className="text-xs text-text-tertiary space-y-1 max-w-md mx-auto">
            <p>
              Un conseiller Shongre étudie votre dossier et vous répondra
              directement dans votre espace client et par email .
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              variant="primary"
              onClick={() => navigate("/compte/support")}
              className="font-semibold"
            >
              Suivre mes demandes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedReference(null);
                setSelectedCategory(null);
                setSelectedReasonId("");
                setDescription("");
              }}
            >
              {t("support.contactPage.envoyerUneAutreDemande")}
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
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main tracking-tight">
          {t("support.contactPage.contacterLeSupportShongre")}
        </h1>
        <p className="text-xs sm:text-sm text-text-tertiary">
          {t("support.contactPage.selectionnezLeMotifDeVotre")}
        </p>
      </div>

      {/* 2. Step 1: Category Selector */}
      <fieldset
        aria-describedby={
          errors.category ? "support-category-error" : undefined
        }
        className="space-y-3"
      >
        <legend className="block text-xs font-semibold uppercase tracking-wider text-text-emphasis">
          {t("support.contactPage.1QuelEstLeSujet")}
          <span className="text-danger">*</span>
        </legend>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {capabilities.availableCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <label
                key={cat.id}
                className={`p-4 rounded-2xl border text-left transition-all focus-within:ring-2 focus-within:ring-primary-ring flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary-surface-soft text-text-main ring-2 ring-primary-ring shadow-xs"
                    : "border-border-base bg-bg-surface text-text-strong hover:border-border-strong hover:bg-surface-soft"
                }`}
              >
                <input
                  type="radio"
                  name="support-category"
                  value={cat.id}
                  checked={isSelected}
                  aria-label={cat.label}
                  className="sr-only"
                  onChange={() => {
                    categoryChosen.current = true;
                    setSelectedCategory(cat.id);
                    setSelectedReasonId("");
                  }}
                />
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    isSelected
                      ? "bg-primary text-on-primary"
                      : "bg-surface-muted text-text-supporting"
                  }`}
                >
                  {CATEGORY_ICONS[cat.iconName] || (
                    <HelpCircle className="w-icon-lg h-icon-lg" />
                  )}
                </div>

                <div>
                  <h2 className="font-bold text-xs sm:text-sm text-text-main leading-tight mb-1">
                    {cat.label}
                  </h2>
                  <p className="text-micro text-text-tertiary line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
        {errors.category && (
          <p
            id="support-category-error"
            className="text-xs font-bold text-danger"
          >
            {errors.category}
          </p>
        )}
      </fieldset>

      {/* 3. Step 2: Reason Selector & Handoffs */}
      {currentCategoryDef && (
        <fieldset
          aria-describedby={errors.reason ? "support-reason-error" : undefined}
          className="space-y-4 pt-2 animate-fadeIn"
        >
          <legend className="block text-xs font-semibold uppercase tracking-wider text-text-emphasis">
            {t("support.contactPage.2PrecisezVotreSituation")}
            <span className="text-danger">*</span>
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentCategoryDef.reasons.map((r) => {
              const isSelected = selectedReasonId === r.id;

              return (
                <label
                  key={r.id}
                  className={`p-3.5 rounded-2xl border text-left transition-all focus-within:ring-2 focus-within:ring-primary-ring flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary-surface-soft text-text-main font-semibold ring-1 ring-primary-ring-strong"
                      : "border-border-base bg-bg-surface text-text-emphasis hover:bg-surface-soft"
                  }`}
                >
                  <input
                    type="radio"
                    name="support-reason"
                    value={r.id}
                    checked={isSelected}
                    aria-label={r.label}
                    className="sr-only"
                    onChange={() => setSelectedReasonId(r.id)}
                  />
                  <span className="text-xs leading-snug">{r.label}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-border-prominent"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-bg-surface" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          {errors.reason && (
            <p
              id="support-reason-error"
              className="text-xs font-bold text-danger"
            >
              {errors.reason}
            </p>
          )}

          {/* Handoff Banners */}
          {currentReasonDef?.isDisputeHandoff && (
            <div className="p-4 bg-warning-surface border border-warning-border rounded-2xl flex items-start gap-3 text-warning text-xs">
              <AlertTriangle className="w-icon-lg h-icon-lg text-warning shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-warning">
                  {t("support.contactPage.besoinDOuvrirUnLitige")}
                </p>
                <p className="leading-relaxed">
                  {t("support.contactPage.pourGelerLesFondsSous")}
                </p>
                <Button
                  to="/compte/achats"
                  variant="primary"
                  size="sm"
                  className="font-semibold mt-1"
                >
                  {t("support.contactPage.accederAMesAchatsPour")}
                </Button>
              </div>
            </div>
          )}

          {currentReasonDef?.isMessagingHandoff && (
            <div className="p-4 bg-primary-surface-soft border border-primary-border rounded-2xl flex items-start gap-3 text-text-strong text-xs">
              <MessageSquare className="w-icon-lg h-icon-lg text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-text-main">
                  {t("support.contactPage.echangeDirectAvecLeVendeur")}
                </p>
                <p className="leading-relaxed">
                  {t("support.contactPage.leSupportShongreNIntervient")}
                </p>
                <Button
                  to="/compte/messages"
                  variant="outline"
                  size="sm"
                  className="font-semibold mt-1"
                >
                  {t("support.contactPage.ouvrirLaMessagerie")}
                </Button>
              </div>
            </div>
          )}

          {currentReasonDef?.helpTip &&
            !currentReasonDef.isDisputeHandoff &&
            !currentReasonDef.isMessagingHandoff && (
              <div className="p-3.5 bg-surface-muted border border-border-disabled rounded-2xl text-xs text-text-emphasis flex items-start gap-2.5">
                <HelpCircle className="w-icon-md h-icon-md text-text-tertiary shrink-0 mt-0.5" />
                <span>
                  <strong>Conseil :</strong> {currentReasonDef.helpTip}
                </span>
              </div>
            )}
        </fieldset>
      )}

      {errors.context && (
        <p role="status" className="text-xs text-text-supporting">
          {errors.context}
        </p>
      )}
      {selectedCategory && selectedReasonId && !isAuthenticated && (
        <div className="rounded-2xl border border-border-base bg-bg-surface p-6 space-y-3">
          <h2 className="font-bold text-text-main">
            {t("support.contact.signInFirst")}
          </h2>
          <p className="text-sm text-text-supporting">
            {t("support.contact.safeContinuation")}
          </p>
          <Button to={routes.auth.login(authReturnTo)}>Se connecter</Button>
          <Button variant="outline" to={routes.auth.register(authReturnTo)}>
            Créer un compte
          </Button>
        </div>
      )}
      {/* 4. Step 3: Adaptive Contact Form */}
      {selectedCategory && selectedReasonId && isAuthenticated && (
        <form
          onSubmit={handleSubmit}
          className="bg-bg-surface border border-border-base rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fadeIn"
        >
          <h2 className="text-base font-bold text-text-main">
            {t("support.contactPage.3RedigezVotreMessage")}
          </h2>

          {/* Context Card Preview if linked */}
          {context && (
            <SupportContextCard
              context={context}
              onRemove={() => setContext(undefined)}
            />
          )}

          {/* Subject Field */}
          <FormField
            label={t("support.contactPage.objetDeLaDemande")}
            required
            error={errors.subject}
          >
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("support.contactPage.objetDeVotreDemande")}
            />
          </FormField>

          {/* Description Textarea */}
          <FormField
            label={t("support.contactPage.detaillezVotreSituation")}
            required
            hint="Expliquez ce qui s'est passé avec un maximum de précision."
            error={errors.description}
          >
            <Textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                "support.contactPage.decrivezVotreProblemeLesDemarches",
              )}
            />
          </FormField>

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
              disabled={isSubmitting}
              className="font-semibold"
            >
              {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
