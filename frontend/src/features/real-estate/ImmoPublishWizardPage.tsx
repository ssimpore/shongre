import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  FileCheck2,
  KeyRound,
  LockKeyhole,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { RealEstateCatalog } from "@shongre/contracts/real-estate";
import {
  REAL_ESTATE_CONSTRAINTS,
  REAL_ESTATE_SCHEMA_VERSION,
} from "@shongre/contracts/real-estate";
import { motionDurationMs } from "@shongre/design-tokens";
import { services } from "../../api/client/service-registry";
import {
  EMPTY_PROPERTY_PUBLICATION_DRAFT,
  type PropertyPublicationDraftData,
} from "../../api/contracts/real-estate.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  ProgressBar,
  Select,
  Skeleton,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatImmoMoney } from "./immo-format";
import { ImmoLocationPicker } from "./components/ImmoLocationPicker";
import { scrollToTop } from "../../utilities/motion";

const STEPS = [
  ["Projet", KeyRound],
  ["Localisation", MapPin],
  ["Caractéristiques", Building2],
  ["Prix", CircleDollarSign],
  ["Énergie, légal & annonceur", FileCheck2],
  ["Annonce & médias", Camera],
  ["Aperçu", Eye],
  ["Offre", Sparkles],
  ["Paiement", LockKeyhole],
  ["Publication", CheckCircle2],
] as const;

const PUBLISH_STEP = {
  project: 1,
  location: 2,
  characteristics: 3,
  pricing: 4,
  legal: 5,
  content: 6,
  preview: 7,
  offer: 8,
  payment: 9,
  publication: 10,
} as const;
const FIRST_STEP = REAL_ESTATE_CONSTRAINTS.publication.firstStep;
const TOTAL_STEPS = REAL_ESTATE_CONSTRAINTS.publication.stepCount;

type DraftData = PropertyPublicationDraftData;

export const ImmoPublishWizardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeMarket, currentLocale } = useMarketLocation();
  const toast = useToast();
  const navigate = useNavigate();
  const accountId = currentUser?.id || "guest";
  const [draftId, setDraftId] = useState("");
  const [step, setStep] = useState<number>(FIRST_STEP);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [data, setData] = useState<DraftData>(EMPTY_PROPERTY_PUBLICATION_DRAFT);
  const [catalog, setCatalog] = useState<RealEstateCatalog | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishedId, setPublishedId] = useState<string>();
  const [paymentStatus, setPaymentStatus] = useState<string>();
  const hydrated = useRef(false);
  const checkoutRecoveryStarted = useRef(false);

  usePageMeta({
    title: "Publier un bien immobilier",
    description: "Créez votre annonce immobilière étape par étape.",
    canonicalPath: "/deposer/immo",
    noIndex: true,
  });

  useEffect(() => {
    Promise.all([
      services.realEstate.getCatalog(activeMarket.code),
      services.realEstate.getOrCreateDraft(
        accountId,
        activeMarket.code,
        currentUser?.name,
      ),
    ])
      .then(([nextCatalog, remote]) => {
        setCatalog(nextCatalog);
        setDraftId(remote.id);
        setStep(remote.currentStep);
        setCompletedSteps(remote.completedSteps);
        setData({
          ...EMPTY_PROPERTY_PUBLICATION_DRAFT,
          ...(remote.data as Partial<DraftData>),
        });
        const restoredPaymentStatus = remote.data.paymentStatus;
        setPaymentStatus(
          typeof restoredPaymentStatus === "string"
            ? restoredPaymentStatus
            : undefined,
        );
        hydrated.current = true;
      })
      .catch(() =>
        toast.error("Le service de publication Immo est indisponible."),
      );
  }, [accountId, activeMarket.code, currentUser?.name, toast]);

  useEffect(() => {
    if (!hydrated.current || !draftId) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        await services.realEstate.saveDraft({
          id: draftId,
          ownerUserId: accountId,
          schemaVersion: REAL_ESTATE_SCHEMA_VERSION,
          marketCode: activeMarket.code,
          currentStep: step,
          completedSteps,
          data: { ...data, paymentStatus },
          validationIssues: [],
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setSaving(false);
      }
    }, motionDurationMs.slow);
    return () => window.clearTimeout(timer);
  }, [
    accountId,
    activeMarket.code,
    completedSteps,
    data,
    draftId,
    paymentStatus,
    step,
  ]);

  useEffect(() => {
    if (
      !catalog ||
      checkoutRecoveryStarted.current ||
      new URLSearchParams(window.location.search).get("checkout") !== "success"
    )
      return;
    checkoutRecoveryStarted.current = true;
    services.realEstate
      .createCheckout({
        accountId,
        marketCode: activeMarket.code,
        offerId: data.offerId,
        addOnIds: data.addOnIds,
        idempotencyKey: `immo-${draftId}-${data.offerId}`,
      })
      .then((result) => {
        setPaymentStatus(result.status);
        if (result.status === "paid") {
          setCompletedSteps((current) =>
            Array.from(new Set([...current, PUBLISH_STEP.payment])),
          );
          setStep(PUBLISH_STEP.publication);
          toast.success("Paiement confirmé. Vous pouvez envoyer l’annonce.");
        } else {
          setStep(PUBLISH_STEP.payment);
          toast.info("Le paiement est encore en cours de confirmation.");
        }
      })
      .catch(() => {
        setStep(PUBLISH_STEP.payment);
        toast.error("La confirmation du paiement n’a pas pu être récupérée.");
      });
  }, [
    accountId,
    activeMarket.code,
    catalog,
    data.addOnIds,
    data.offerId,
    draftId,
    toast,
  ]);

  const update = <K extends keyof DraftData>(key: K, value: DraftData[K]) =>
    setData((current) => ({ ...current, [key]: value }));
  const toggle = (key: "amenities" | "addOnIds", value: string) =>
    update(
      key,
      data[key].includes(value)
        ? data[key].filter((item) => item !== value)
        : [...data[key], value],
    );

  const validate = () => {
    if (
      step === PUBLISH_STEP.project &&
      (!data.transactionType || !data.propertyType)
    )
      return "Choisissez le projet et le type de bien.";
    if (
      step === PUBLISH_STEP.location &&
      (!data.city || !data.postalCode || !data.publicLabel)
    )
      return "Renseignez une localisation publique.";
    if (
      step === PUBLISH_STEP.characteristics &&
      (!data.livingAreaSquareMeters || !data.rooms)
    )
      return "La surface et le nombre de pièces sont requis.";
    if (step === PUBLISH_STEP.pricing && !data.priceMinor)
      return "Renseignez le prix demandé.";
    if (
      step === PUBLISH_STEP.legal &&
      (!data.ownershipDeclared || !data.sellerDisplayName)
    )
      return "Confirmez votre droit à publier et le nom de l’annonceur.";
    if (
      step === PUBLISH_STEP.content &&
      (data.title.length < REAL_ESTATE_CONSTRAINTS.title.minLength ||
        data.description.length <
          REAL_ESTATE_CONSTRAINTS.description.minLength ||
        !data.mediaUrls.length)
    )
      return "Précisez le titre, la description et ajoutez une photo.";
    if (step === PUBLISH_STEP.offer && !data.offerId)
      return "Sélectionnez une offre.";
    return undefined;
  };

  const next = () => {
    const issue = validate();
    if (issue) {
      toast.warning(issue);
      return;
    }
    setCompletedSteps((current) => Array.from(new Set([...current, step])));
    setStep((current) => Math.min(TOTAL_STEPS, current + FIRST_STEP));
    scrollToTop();
  };

  const upload = async (
    files: FileList | null,
    visibility: "public" | "private",
  ) => {
    if (!files?.length) return;
    const selectedOffer =
      catalog?.offers.find((item) => item.id === data.offerId) ||
      catalog?.offers[0];
    const mediaLimit = Number(selectedOffer?.entitlements.maxMedia || 0);
    if (
      visibility === "public" &&
      data.mediaUrls.length + files.length > mediaLimit
    ) {
      toast.warning(
        `Cette offre autorise ${mediaLimit} photo(s). Vous en avez déjà ${data.mediaUrls.length}.`,
      );
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await services.realEstate.uploadDraftMedia(
          draftId,
          { name: file.name, type: file.type, size: file.size, body: file },
          visibility,
        );
        if (result.url)
          setData((current) => ({
            ...current,
            mediaUrls: [...current.mediaUrls, result.url!],
          }));
        if (result.privateStorageKey)
          setData((current) => ({
            ...current,
            privateDocumentKeys: [
              ...current.privateDocumentKeys,
              result.privateStorageKey!,
            ],
          }));
      }
      toast.success(
        visibility === "public"
          ? "Photo ajoutée."
          : "Document privé ajouté et protégé.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Téléversement impossible.",
      );
    } finally {
      setUploading(false);
    }
  };

  const checkout = async () => {
    if (!catalog) return;
    setSubmitting(true);
    try {
      const checkout = await services.realEstate.createCheckout({
        accountId,
        marketCode: activeMarket.code,
        offerId: data.offerId,
        addOnIds: data.addOnIds,
        idempotencyKey: `immo-${draftId}-${data.offerId}`,
      });
      setPaymentStatus(checkout.status);
      if (checkout.provider === "stripe" && checkout.providerCheckoutUrl) {
        window.location.assign(checkout.providerCheckoutUrl);
        return;
      }
      if (checkout.status !== "paid") {
        toast.warning(
          checkout.status === "failed"
            ? "Le paiement a échoué. Aucun montant n’a été activé."
            : "Le paiement doit être finalisé avant la publication.",
        );
        return;
      }
      setCompletedSteps((current) =>
        Array.from(new Set([...current, PUBLISH_STEP.payment])),
      );
      setStep(PUBLISH_STEP.publication);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Paiement impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const publish = async () => {
    if (!catalog || paymentStatus !== "paid") {
      toast.warning("Finalisez d’abord l’étape de paiement.");
      return;
    }
    setSubmitting(true);
    try {
      const done = Array.from(
        { length: PUBLISH_STEP.publication - FIRST_STEP },
        (_, index) => index + FIRST_STEP,
      );
      setCompletedSteps(done);
      await services.realEstate.saveDraft({
        id: draftId,
        ownerUserId: accountId,
        schemaVersion: REAL_ESTATE_SCHEMA_VERSION,
        marketCode: activeMarket.code,
        currentStep: PUBLISH_STEP.publication,
        completedSteps: done,
        data: { ...data, paymentStatus },
        validationIssues: [],
        updatedAt: new Date().toISOString(),
      });
      const result = await services.realEstate.submitDraft(draftId);
      setPublishedId(result.propertyId);
      toast.success(
        "Annonce envoyée en validation. Aucun paiement réel n’a été effectué en mode démo.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Publication impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!catalog || !draftId)
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Skeleton className="h-168 rounded-card" />
      </div>
    );
  const offer =
    catalog.offers.find((item) => item.id === data.offerId) ||
    catalog.offers[0];

  return (
    <main className="min-h-screen bg-bg-subtle pb-14">
      <div className="border-b border-border-base bg-bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Shongre Immo
            </p>
            <h1 className="text-lg font-black text-text-main">
              Publier un bien
            </h1>
          </div>
          <p className="flex items-center gap-2 text-xs text-text-muted">
            <Save className="h-icon-md w-icon-md" />
            {saving ? "Enregistrement…" : "Brouillon enregistré"}
          </p>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-media-content-lg">
        <aside className="hidden rounded-card border border-border-base bg-bg-surface p-3 lg:block">
          <ol className="space-y-1">
            {STEPS.map(([label, Icon], index) => {
              const number = index + FIRST_STEP;
              const active = number === step;
              const complete = completedSteps.includes(number);
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() =>
                      number <= Math.max(step, ...completedSteps, FIRST_STEP) &&
                      setStep(number)
                    }
                    className={`flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-xs font-bold ${active ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-subtle"}`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${active ? "bg-white/15" : complete ? "bg-success-surface text-success" : "bg-bg-subtle"}`}
                    >
                      {complete ? (
                        <Check className="h-icon-md w-icon-md" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <span>
                      {number}. {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="min-w-0 rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-7">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-primary">
                Étape {step} sur {TOTAL_STEPS}
              </p>
              <span className="text-xs text-text-muted">
                {new Intl.NumberFormat(currentLocale, {
                  style: "percent",
                  maximumFractionDigits: 0,
                }).format(step / TOTAL_STEPS)}
              </span>
            </div>
            <ProgressBar
              className="mt-2"
              value={step}
              max={TOTAL_STEPS}
              label={`Étape ${step} sur ${TOTAL_STEPS}`}
            />
            <h2 className="mt-4 text-xl font-black text-text-main">
              {STEPS[step - FIRST_STEP][0]}
            </h2>
          </div>

          {step === PUBLISH_STEP.project ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  Votre projet
                  <Select
                    className="mt-2 w-full"
                    labelledByAncestor
                    value={data.transactionType}
                    onChange={(event) =>
                      update("transactionType", event.target.value)
                    }
                  >
                    <option value="sale">Vendre</option>
                    <option value="long_term_rental">Louer à l’année</option>
                    <option value="seasonal_rental">
                      Location saisonnière
                    </option>
                    <option value="shared_accommodation">Colocation</option>
                  </Select>
                </label>
                <label className="text-xs font-bold">
                  Type de bien
                  <Select
                    className="mt-2 w-full"
                    labelledByAncestor
                    value={data.propertyType}
                    onChange={(event) =>
                      update("propertyType", event.target.value)
                    }
                  >
                    {catalog.propertyTypes.map((type) => (
                      <option key={type.type} value={type.type}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              <p className="rounded-control bg-info-surface p-4 text-xs text-text-secondary">
                Les champs suivants s’adaptent au type de bien et au marché
                activé. Le bien reste une seule annonce, même s’il est éligible
                à plusieurs marchés.
              </p>
            </div>
          ) : null}

          {step === PUBLISH_STEP.location ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Ville" required>
                  <Input
                    value={data.city}
                    onChange={(event) => update("city", event.target.value)}
                  />
                </FormField>
                <FormField label="Code postal" required>
                  <Input
                    value={data.postalCode}
                    onChange={(event) =>
                      update("postalCode", event.target.value)
                    }
                  />
                </FormField>
              </div>
              <FormField
                label="Localisation publique"
                hint="Quartier ou commune affiché aux acheteurs."
              >
                <Input
                  value={data.publicLabel}
                  onChange={(event) =>
                    update("publicLabel", event.target.value)
                  }
                />
              </FormField>
              <FormField
                label="Adresse exacte"
                hint="Privée : jamais incluse dans les réponses publiques ni sur la carte."
              >
                <Input
                  value={data.exactAddress}
                  onChange={(event) =>
                    update("exactAddress", event.target.value)
                  }
                />
              </FormField>
              <label className="block text-xs font-bold">
                Précision affichée sur la carte
                <Select
                  className="mt-2 w-full"
                  labelledByAncestor
                  value={data.locationPrecision}
                  onChange={(event) =>
                    update(
                      "locationPrecision",
                      event.target.value as DraftData["locationPrecision"],
                    )
                  }
                >
                  <option value="street">Rue approximative</option>
                  <option value="district">Quartier</option>
                  <option value="city">Commune</option>
                </Select>
              </label>
              <div>
                <p className="mb-2 text-xs font-bold">Position de référence</p>
                <ImmoLocationPicker
                  value={{
                    latitude: data.latitude,
                    longitude: data.longitude,
                  }}
                  onChange={({ latitude, longitude }) =>
                    setData((current) => ({
                      ...current,
                      latitude,
                      longitude,
                    }))
                  }
                />
                <p className="mt-2 text-micro text-text-muted">
                  Déplacez le repère. La position publique sera arrondie selon
                  le niveau choisi ; l’adresse exacte reste privée.
                </p>
              </div>
              <fieldset>
                <legend className="text-xs font-bold">
                  Marchés de publication
                </legend>
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <Checkbox checked label={activeMarket.name} readOnly />{" "}
                  {activeMarket.name} — actif
                </label>
                <p className="mt-2 text-micro text-text-muted">
                  D’autres marchés compatibles seront proposés lorsque leur
                  configuration autorisera cette publication.
                </p>
              </fieldset>
            </div>
          ) : null}

          {step === PUBLISH_STEP.characteristics ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Surface habitable (m²)" required>
                  <Input
                    type="number"
                    min={REAL_ESTATE_CONSTRAINTS.positiveInteger.min}
                    value={data.livingAreaSquareMeters || ""}
                    onChange={(event) =>
                      update(
                        "livingAreaSquareMeters",
                        Number(event.target.value),
                      )
                    }
                  />
                </FormField>
                <FormField label="Pièces" required>
                  <Input
                    type="number"
                    min={REAL_ESTATE_CONSTRAINTS.nonNegativeInteger.min}
                    value={data.rooms || ""}
                    onChange={(event) =>
                      update("rooms", Number(event.target.value))
                    }
                  />
                </FormField>
                <FormField label="Chambres">
                  <Input
                    type="number"
                    min={REAL_ESTATE_CONSTRAINTS.nonNegativeInteger.min}
                    value={data.bedrooms || ""}
                    onChange={(event) =>
                      update("bedrooms", Number(event.target.value))
                    }
                  />
                </FormField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Salles de bain">
                  <Input
                    type="number"
                    min={REAL_ESTATE_CONSTRAINTS.nonNegativeInteger.min}
                    value={data.bathrooms || ""}
                    onChange={(event) =>
                      update("bathrooms", Number(event.target.value))
                    }
                  />
                </FormField>
                <label className="text-xs font-bold">
                  État
                  <Select
                    className="mt-2 w-full"
                    labelledByAncestor
                    value={data.condition}
                    onChange={(event) =>
                      update("condition", event.target.value)
                    }
                  >
                    <option value="new">Neuf</option>
                    <option value="excellent">Excellent état</option>
                    <option value="good">Bon état</option>
                    <option value="renovation_needed">Travaux à prévoir</option>
                    <option value="to_renovate">À rénover</option>
                  </Select>
                </label>
              </div>
              <fieldset>
                <legend className="mb-2 text-xs font-bold">Équipements</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["lift", "Ascenseur"],
                    ["balcony", "Balcon"],
                    ["terrace", "Terrasse"],
                    ["garden", "Jardin"],
                    ["parking", "Parking"],
                    ["cellar", "Cave"],
                  ].map(([id, label]) => (
                    <Checkbox
                      key={id}
                      label={label}
                      checked={data.amenities.includes(id)}
                      onChange={() => toggle("amenities", id)}
                    />
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === PUBLISH_STEP.pricing ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label="Prix"
                  required
                  hint={`Saisi en ${catalog.config.currency}, conservé en unités mineures dans le contrat.`}
                >
                  <Input
                    type="number"
                    min={REAL_ESTATE_CONSTRAINTS.nonNegativeInteger.min}
                    value={
                      data.priceMinor
                        ? data.priceMinor /
                          REAL_ESTATE_CONSTRAINTS.minorUnitsPerMajor
                        : ""
                    }
                    onChange={(event) =>
                      update(
                        "priceMinor",
                        Math.round(
                          Number(event.target.value) *
                            REAL_ESTATE_CONSTRAINTS.minorUnitsPerMajor,
                        ),
                      )
                    }
                  />
                </FormField>
                <FormField label="Charges">
                  <Input
                    type="number"
                    min={REAL_ESTATE_CONSTRAINTS.nonNegativeInteger.min}
                    value={
                      data.chargesMinor
                        ? data.chargesMinor /
                          REAL_ESTATE_CONSTRAINTS.minorUnitsPerMajor
                        : ""
                    }
                    onChange={(event) =>
                      update(
                        "chargesMinor",
                        Math.round(
                          Number(event.target.value) *
                            REAL_ESTATE_CONSTRAINTS.minorUnitsPerMajor,
                        ),
                      )
                    }
                  />
                </FormField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  Période
                  <Select
                    className="mt-2 w-full"
                    labelledByAncestor
                    value={data.period}
                    onChange={(event) => update("period", event.target.value)}
                  >
                    <option value="total">Prix total</option>
                    <option value="month">Par mois</option>
                    <option value="week">Par semaine</option>
                    <option value="night">Par nuit</option>
                  </Select>
                </label>
                <label className="text-xs font-bold">
                  Honoraires à la charge
                  <Select
                    className="mt-2 w-full"
                    labelledByAncestor
                    value={data.feesPaidBy}
                    onChange={(event) =>
                      update("feesPaidBy", event.target.value)
                    }
                  >
                    <option value="seller">du vendeur</option>
                    <option value="buyer">de l’acquéreur</option>
                    <option value="owner">du propriétaire</option>
                    <option value="tenant">du locataire</option>
                    <option value="shared">partagée</option>
                  </Select>
                </label>
              </div>
            </div>
          ) : null}

          {step === PUBLISH_STEP.legal ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  Classe DPE
                  <Select
                    className="mt-2 w-full"
                    labelledByAncestor
                    value={data.dpeClass}
                    onChange={(event) => update("dpeClass", event.target.value)}
                  >
                    <option value="">En attente</option>
                    {["A", "B", "C", "D", "E", "F", "G"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </Select>
                </label>
                <label className="text-xs font-bold">
                  Classe GES
                  <Select
                    className="mt-2 w-full"
                    labelledByAncestor
                    value={data.gesClass}
                    onChange={(event) => update("gesClass", event.target.value)}
                  >
                    <option value="">En attente</option>
                    {["A", "B", "C", "D", "E", "F", "G"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </Select>
                </label>
              </div>
              <Checkbox
                label="Ce bien est en copropriété"
                checked={data.coOwnershipApplicable}
                onChange={(event) =>
                  update("coOwnershipApplicable", event.target.checked)
                }
              />
              {data.coOwnershipApplicable ? (
                <FormField label="Nombre de lots" required>
                  <Input
                    type="number"
                    min={REAL_ESTATE_CONSTRAINTS.positiveInteger.min}
                    value={data.coOwnershipLots || ""}
                    onChange={(event) =>
                      update("coOwnershipLots", Number(event.target.value))
                    }
                  />
                </FormField>
              ) : null}
              <div className="rounded-control border border-border-base bg-bg-subtle p-4">
                <Checkbox
                  label="Je déclare être autorisé à publier ce bien et fournir des informations exactes."
                  checked={data.ownershipDeclared}
                  onChange={(event) =>
                    update("ownershipDeclared", event.target.checked)
                  }
                />
                <p className="mt-2 text-micro text-text-muted">
                  Des exigences supplémentaires peuvent être demandées par le
                  service de vérification selon le contexte.
                </p>
              </div>
            </div>
          ) : null}

          {step === PUBLISH_STEP.content ? (
            <div className="space-y-4">
              <FormField label="Titre" required>
                <Input
                  minLength={REAL_ESTATE_CONSTRAINTS.title.minLength}
                  maxLength={REAL_ESTATE_CONSTRAINTS.title.maxLength}
                  value={data.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </FormField>
              <FormField
                label="Description"
                required
                hint="Décrivez les espaces, l’environnement et les conditions sans divulguer l’adresse exacte."
              >
                <Textarea
                  rows={9}
                  minLength={REAL_ESTATE_CONSTRAINTS.description.minLength}
                  value={data.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </FormField>
            </div>
          ) : null}

          {step === PUBLISH_STEP.content ? (
            <div className="space-y-5">
              <div className="rounded-card border border-dashed border-primary-border bg-primary-light p-5 text-center">
                <Camera className="mx-auto h-7 w-7 text-primary" />
                <p className="mt-2 text-sm font-black">Photos publiques</p>
                <p className="mt-1 text-xs text-text-muted">
                  JPG, PNG ou WebP · maximum{" "}
                  {REAL_ESTATE_CONSTRAINTS.media.maxFileSizeMegabytes} Mo.
                </p>
                <label className="mt-3 inline-flex cursor-pointer rounded-control bg-primary px-4 py-2 text-xs font-bold text-white">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => upload(event.target.files, "public")}
                  />
                  {uploading ? "Téléversement…" : "Ajouter des photos"}
                </label>
                <p className="mt-3 text-xs font-bold">
                  {data.mediaUrls.length} /{" "}
                  {Number(offer.entitlements.maxMedia || 0)} photos
                </p>
              </div>
              <div className="rounded-card border border-border-base bg-bg-subtle p-5">
                <ShieldCheck className="h-icon-xl w-icon-xl text-primary" />
                <p className="mt-2 text-sm font-black">Documents privés</p>
                <p className="mt-1 text-xs text-text-muted">
                  Diagnostics, justificatif de propriété, règlement de
                  copropriété. Ils ne sont jamais exposés dans l’annonce.
                </p>
                <label className="mt-3 inline-flex cursor-pointer rounded-control border border-primary px-4 py-2 text-xs font-bold text-primary">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => upload(event.target.files, "private")}
                  />
                  Ajouter un document
                </label>
                <p className="mt-3 text-xs font-bold">
                  {data.privateDocumentKeys.length} document(s) protégé(s)
                </p>
              </div>
            </div>
          ) : null}

          {step === PUBLISH_STEP.legal ? (
            <div className="space-y-4">
              <label className="text-xs font-bold">
                Vous publiez comme
                <Select
                  className="mt-2 w-full"
                  labelledByAncestor
                  value={data.sellerType}
                  onChange={(event) => update("sellerType", event.target.value)}
                >
                  <option value="owner">Propriétaire particulier</option>
                  <option value="agency">Agence immobilière</option>
                  <option value="developer">Promoteur</option>
                  <option value="property_manager">Gestionnaire</option>
                </Select>
              </label>
              <FormField label="Nom affiché" required>
                <Input
                  value={data.sellerDisplayName}
                  onChange={(event) =>
                    update("sellerDisplayName", event.target.value)
                  }
                />
              </FormField>
              <div className="rounded-control bg-info-surface p-4 text-xs text-text-secondary">
                <p className="font-black text-text-main">
                  Vérification progressive
                </p>
                <p className="mt-1">
                  E-mail et téléphone suffisent pour démarrer. Identité, mandat
                  ou informations professionnelles peuvent être demandés avant
                  publication ou activation de services payants.
                </p>
              </div>
            </div>
          ) : null}

          {step === PUBLISH_STEP.preview ? (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-card border border-border-base">
                <div className="aspect-2/1 bg-bg-subtle">
                  {data.mediaUrls[0] ? (
                    <img
                      src={data.mediaUrls[0]}
                      alt="Aperçu du bien"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-text-muted">
                      Aucune image
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase text-primary">
                    {data.transactionType === "sale" ? "Vente" : "Location"} ·{" "}
                    {
                      catalog.propertyTypes.find(
                        (item) => item.type === data.propertyType,
                      )?.label
                    }
                  </p>
                  <h3 className="mt-1 text-lg font-black">
                    {data.title || "Titre de l’annonce"}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {data.publicLabel} · localisation approximative
                  </p>
                  <p className="mt-4 text-xl font-black text-primary">
                    {formatImmoMoney(
                      {
                        amountMinor: data.priceMinor,
                        currency: catalog.config.currency,
                      },
                      currentLocale,
                    )}
                    {data.period === "month" ? "/mois" : ""}
                  </p>
                  <p className="mt-3 text-sm text-text-secondary">
                    {data.livingAreaSquareMeters} m² · {data.rooms} pièces ·{" "}
                    {data.bedrooms} chambres
                  </p>
                </div>
              </div>
              <p className="rounded-control bg-warning-surface p-4 text-xs text-warning">
                L’adresse exacte et les documents privés sont exclus de cet
                aperçu public.
              </p>
            </div>
          ) : null}

          {step === PUBLISH_STEP.offer ? (
            <div className="space-y-6">
              {publishedId ? (
                <div className="rounded-card bg-success-surface p-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                  <h3 className="mt-3 text-lg font-black text-success">
                    Annonce envoyée en validation
                  </h3>
                  <p className="mt-2 text-xs text-text-secondary">
                    Référence {publishedId}. Statut : en cours d’examen.
                  </p>
                  {paymentStatus ? (
                    <Badge variant="success" className="mt-3">
                      Paiement démo : {paymentStatus}
                    </Badge>
                  ) : null}
                  <Button
                    variant="primary"
                    className="mt-5"
                    onClick={() => navigate("/compte/annonces")}
                  >
                    Voir mes annonces
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {catalog.offers
                      .filter((item) =>
                        data.sellerType === "owner"
                          ? item.audience === "individual"
                          : item.audience !== "individual",
                      )
                      .map((item) => {
                        const price = item.prices.find(
                          (value) => value.isActive,
                        )?.amount;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => update("offerId", item.id)}
                            className={`rounded-card border p-4 text-left ${data.offerId === item.id ? "border-primary bg-primary-light" : "border-border-base"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-black">{item.name}</p>
                              {item.isRecommended ? (
                                <Badge variant="primary">Recommandée</Badge>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs text-text-secondary">
                              {item.description}
                            </p>
                            <p className="mt-3 text-base font-black text-primary">
                              {price
                                ? formatImmoMoney(price, currentLocale)
                                : "Sur devis"}
                              {item.kind === "subscription" ? "/mois" : ""}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Options facultatives</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {catalog.addOns.map((item) => (
                        <Checkbox
                          key={item.id}
                          label={`${item.name} · ${formatImmoMoney(item.price, currentLocale)}`}
                          checked={data.addOnIds.includes(item.id)}
                          onChange={() => toggle("addOnIds", item.id)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-control border border-border-base bg-bg-subtle p-4 text-xs">
                    <div className="flex justify-between">
                      <span>Offre sélectionnée</span>
                      <strong>{offer.name}</strong>
                    </div>
                    <p className="mt-2 text-micro text-text-muted">
                      Prix, taxe et quotas proviennent du catalogue du marché.
                      Aucun achat additionnel n’est présélectionné.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={next}
                    leftIcon={<LockKeyhole className="h-icon-md w-icon-md" />}
                  >
                    Continuer vers le paiement
                  </Button>
                  <p className="text-center text-micro text-text-muted">
                    Mode démo : le parcours de paiement est déterministe et
                    clairement identifié.
                  </p>
                </>
              )}
            </div>
          ) : null}

          {step === PUBLISH_STEP.payment ? (
            <div className="space-y-5">
              <div className="rounded-card border border-border-base bg-bg-subtle p-5">
                <h3 className="text-sm font-black text-text-main">
                  Récapitulatif sécurisé
                </h3>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span>{offer.name}</span>
                  <strong>
                    {offer.prices[0]
                      ? formatImmoMoney(offer.prices[0].amount, currentLocale)
                      : "Sur devis"}
                  </strong>
                </div>
                {catalog.addOns
                  .filter((item) => data.addOnIds.includes(item.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="mt-3 flex items-center justify-between text-xs"
                    >
                      <span>{item.name}</span>
                      <strong>
                        {formatImmoMoney(item.price, currentLocale)}
                      </strong>
                    </div>
                  ))}
                <p className="mt-4 border-t border-border-base pt-4 text-micro text-text-muted">
                  La taxe applicable et le montant final sont calculés depuis le
                  catalogue serveur. Aucun moyen de paiement n’est enregistré
                  dans le brouillon.
                </p>
              </div>
              {paymentStatus ? (
                <Badge
                  variant={paymentStatus === "paid" ? "success" : "warning"}
                >
                  État du paiement : {paymentStatus}
                </Badge>
              ) : null}
              <Button
                variant="primary"
                className="w-full"
                isLoading={submitting}
                onClick={checkout}
                leftIcon={<LockKeyhole className="h-icon-md w-icon-md" />}
              >
                {offer.prices[0]?.amount.amountMinor === 0 &&
                data.addOnIds.length === 0
                  ? "Valider l’offre gratuite"
                  : "Accéder au paiement sécurisé"}
              </Button>
              <p className="text-center text-micro text-text-muted">
                En mode démo, le résultat est déterministe et aucun paiement
                réel n’est créé.
              </p>
            </div>
          ) : null}

          {step === PUBLISH_STEP.publication ? (
            <div className="space-y-5">
              {publishedId ? (
                <div className="rounded-card bg-success-surface p-6 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                  <h3 className="mt-3 text-lg font-black text-success">
                    Annonce envoyée en validation
                  </h3>
                  <p className="mt-2 text-xs text-text-secondary">
                    Référence {publishedId}. Statut : en cours d’examen.
                  </p>
                  <Button
                    variant="primary"
                    className="mt-5"
                    onClick={() => navigate("/compte/annonces")}
                  >
                    Voir mes annonces
                  </Button>
                </div>
              ) : (
                <div className="rounded-card border border-border-base p-5">
                  <ShieldCheck className="h-7 w-7 text-primary" />
                  <h3 className="mt-3 text-base font-black">
                    Dernière vérification avant modération
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                    Votre annonce sera contrôlée selon les règles du marché{" "}
                    {activeMarket.name}. Une demande de justificatif ou de
                    correction peut suivre. Shongre ne présente aucun document
                    comme vérifié sans examen autorisé.
                  </p>
                  <Button
                    variant="primary"
                    className="mt-5 w-full"
                    isLoading={submitting}
                    onClick={publish}
                    leftIcon={<CheckCircle2 className="h-icon-md w-icon-md" />}
                  >
                    Envoyer en modération
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {!publishedId ? (
            <div className="mt-8 flex items-center justify-between border-t border-border-subtle pt-5">
              <Button
                variant="outline"
                onClick={() =>
                  setStep((current) =>
                    Math.max(FIRST_STEP, current - FIRST_STEP),
                  )
                }
                disabled={step === FIRST_STEP}
                leftIcon={<ArrowLeft className="h-icon-md w-icon-md" />}
              >
                Retour
              </Button>
              {step < PUBLISH_STEP.offer ? (
                <Button
                  variant="primary"
                  onClick={next}
                  rightIcon={<ArrowRight className="h-icon-md w-icon-md" />}
                >
                  Continuer
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};
