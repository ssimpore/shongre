import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  Camera,
  CarFront,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Cloud,
  Eye,
  FileCheck2,
  Gauge,
  History,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  AutoCatalog,
  VehicleDocument,
  VehicleDraft,
} from "@shongre/contracts/auto";
import {
  AUTO_CONSTRAINTS,
  AUTO_SCHEMA_VERSION,
  getMaximumVehicleModelYear,
} from "@shongre/contracts/auto";
import { services } from "../../api/client/service-registry";
import {
  EMPTY_AUTO_DRAFT_DATA,
  type AutoDraftData,
} from "../../api/contracts/auto.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  ProgressBar,
  Select,
  SelectableCard,
  Skeleton,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatAutoMoney } from "./auto-format";
import { formatCurrencySymbol } from "../../utilities/formatters";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { motionDurationMs } from "@shongre/design-tokens";
import { scrollToTop } from "../../utilities/motion";

const STEPS = [
  ["Type", CarFront],
  ["Identification", ShieldCheck],
  ["Technique", Gauge],
  ["État et historique", History],
  ["Documents", FileCheck2],
  ["Prix et lieu", CircleDollarSign],
  ["Médias", Camera],
  ["Aperçu", Eye],
  ["Offre", Sparkles],
  ["Paiement", LockKeyhole],
  ["Validation", CheckCircle2],
] as const;

const PUBLISH_STEP = {
  type: 1,
  identification: 2,
  technical: 3,
  history: 4,
  documents: 5,
  pricing: 6,
  media: 7,
  preview: 8,
  offer: 9,
  payment: 10,
  validation: 11,
} as const;
const FIRST_STEP = AUTO_CONSTRAINTS.publication.firstStep;
const TOTAL_STEPS = AUTO_CONSTRAINTS.publication.stepCount;

export const AutoPublishWizardPage: React.FC = () => {
  const { activeMarket, currentLocale } = useMarketLocation();
  const { currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const accountId = currentUser?.id || "guest";
  const [catalog, setCatalog] = useState<AutoCatalog | null>(null);
  const [draftId, setDraftId] = useState("");
  const [step, setStep] = useState<number>(FIRST_STEP);
  const [data, setData] = useState<AutoDraftData>(
    EMPTY_AUTO_DRAFT_DATA as AutoDraftData,
  );
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [duplicateCheck, setDuplicateCheck] =
    useState<VehicleDraft["duplicateCheck"]>("not_checked");
  const [vin, setVin] = useState("");
  const [registration, setRegistration] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>();
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completeId, setCompleteId] = useState<string>();
  const hydrated = useRef(false);

  usePageMeta({
    title: "Publier un véhicule",
    description:
      "Décrivez votre véhicule étape par étape et envoyez-le en validation.",
    canonicalPath: "/deposer/auto",
    noIndex: true,
  });

  useEffect(() => {
    Promise.all([
      services.auto.getCatalog(activeMarket.code),
      services.auto.getOrCreateDraft(accountId, activeMarket.code),
    ])
      .then(([nextCatalog, remote]) => {
        setCatalog(nextCatalog);
        setDraftId(remote.id);
        setStep(remote.currentStep);
        setCompletedSteps(remote.completedSteps);
        setDuplicateCheck(remote.duplicateCheck);
        setData({
          ...(EMPTY_AUTO_DRAFT_DATA as AutoDraftData),
          ...(remote.data as Partial<AutoDraftData>),
        });
        hydrated.current = true;
      })
      .catch(() =>
        toast.error("Le catalogue Auto est momentanément indisponible."),
      );
  }, [accountId, activeMarket.code, toast]);

  useEffect(() => {
    if (!hydrated.current || !draftId) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        await services.auto.saveDraft({
          id: draftId,
          ownerUserId: accountId,
          schemaVersion: AUTO_SCHEMA_VERSION,
          marketCode: activeMarket.code,
          currentStep: step,
          completedSteps,
          data,
          duplicateCheck,
          updatedAt: new Date().toISOString(),
        });
        setLastSavedAt(new Date().toISOString());
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
    duplicateCheck,
    step,
  ]);

  const update = <K extends keyof AutoDraftData>(
    key: K,
    value: AutoDraftData[K],
  ) => setData((current) => ({ ...current, [key]: value }));
  const isElectric = ["electric", "plug_in_hybrid", "hybrid"].includes(
    String(data.fuelType),
  );
  const canContinue = useMemo(() => {
    if (step === PUBLISH_STEP.type) return Boolean(data.vehicleType);
    if (step === PUBLISH_STEP.identification)
      return Boolean(
        data.makeLabel &&
        data.modelLabel &&
        data.modelYear &&
        ["clear", "possible_match"].includes(duplicateCheck),
      );
    if (step === PUBLISH_STEP.technical)
      return (
        Number(data.mileage) >= AUTO_CONSTRAINTS.nonNegativeInteger.min &&
        Boolean(data.fuelType && data.transmission) &&
        (!isElectric || Number(data.batteryCapacityKwh) > 0)
      );
    if (step === PUBLISH_STEP.history)
      return Boolean(
        data.condition && data.accidentStatus && data.maintenanceBookStatus,
      );
    if (step === PUBLISH_STEP.pricing)
      return (
        Number(data.priceMinor) > AUTO_CONSTRAINTS.moneyMajor.min &&
        String(data.locationLabel).length >=
          AUTO_CONSTRAINTS.listing.locationLabelMinLength
      );
    if (step === PUBLISH_STEP.media)
      return Array.isArray(data.mediaUrls) && data.mediaUrls.length > 0;
    if (step === PUBLISH_STEP.preview)
      return (
        String(data.title).length >= AUTO_CONSTRAINTS.listing.titleMinLength &&
        String(data.description).length >=
          AUTO_CONSTRAINTS.listing.descriptionMinLength
      );
    return true;
  }, [data, duplicateCheck, isElectric, step]);

  const next = () => {
    if (!canContinue) {
      toast.warning("Complétez les informations requises pour continuer.");
      return;
    }
    setCompletedSteps((current) => Array.from(new Set([...current, step])));
    setStep((current) => Math.min(TOTAL_STEPS, current + FIRST_STEP));
    scrollToTop();
  };

  const checkDuplicate = async () => {
    if (
      vin.trim().length < AUTO_CONSTRAINTS.identity.vinCheckMinLength &&
      registration.trim().length <
        AUTO_CONSTRAINTS.identity.registrationCheckMinLength
    ) {
      toast.warning(
        "Saisissez le VIN ou l’immatriculation pour lancer le contrôle.",
      );
      return;
    }
    setCheckingDuplicate(true);
    try {
      const result = await services.auto.checkDuplicateIdentity(
        draftId,
        vin || undefined,
        registration || undefined,
      );
      setDuplicateCheck(result.status);
      setVin("");
      setRegistration("");
      if (result.status === "possible_match")
        toast.warning(
          "Une correspondance possible sera vérifiée pendant la modération.",
        );
      else toast.success("Aucun doublon actif détecté.");
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const toggleDocument = (type: VehicleDocument["type"], label: string) => {
    const documents = data.documents as VehicleDocument[];
    const exists = documents.some((row) => row.type === type);
    update(
      "documents",
      exists
        ? documents.filter((row) => row.type !== type)
        : [
            ...documents,
            {
              id: `doc_${type}`,
              type,
              status: "uploaded_private",
              publicLabel: label,
              updatedAt: new Date().toISOString(),
            },
          ],
    );
  };

  const uploadMedia = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const quota =
      catalog?.plans.find((row) => row.id === data.planId)?.entitlements
        .maxPhotosPerVehicle || 0;
    if ((data.mediaUrls as string[]).length >= quota) {
      toast.warning("Le quota de photos de cette formule est atteint.");
      return;
    }
    setMediaUploading(true);
    try {
      const uploaded = await services.auto.uploadDraftMedia(draftId, {
        name: file.name,
        type: file.type,
        size: file.size,
        body: file,
      });
      update("mediaUrls", [...(data.mediaUrls as string[]), uploaded.url]);
      toast.success("Photo ajoutée au brouillon.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Photo non ajoutée.",
      );
    } finally {
      setMediaUploading(false);
    }
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    const next = [...(data.mediaUrls as string[])];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update("mediaUrls", next);
  };

  const submit = async () => {
    const finalCompleted = Array.from(
      new Set([...completedSteps, PUBLISH_STEP.payment]),
    );
    setCompletedSteps(finalCompleted);
    setSubmitting(true);
    try {
      await services.auto.saveDraft({
        id: draftId,
        ownerUserId: accountId,
        schemaVersion: AUTO_SCHEMA_VERSION,
        marketCode: activeMarket.code,
        currentStep: PUBLISH_STEP.validation,
        completedSteps: finalCompleted,
        data,
        duplicateCheck,
        updatedAt: new Date().toISOString(),
      });
      const result = await services.auto.submitDraft(draftId);
      setCompleteId(result.vehicleId);
    } catch {
      toast.error("Le brouillon n’a pas pu être envoyé en validation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!catalog || !draftId)
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-7">
        <Skeleton className="h-168 rounded-card" />
      </div>
    );
  if (completeId)
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-surface text-success">
          <CheckCircle2 className="h-icon-xl w-icon-xl" />
        </div>
        <h1 className="mt-5 text-2xl font-black">
          Véhicule envoyé en validation
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          L’annonce <strong>{completeId}</strong> est en attente de modération.
          Aucun paiement réel n’a été effectué dans ce mode de démonstration.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button to="/auto">Voir Shongre Auto</Button>
          <Button
            variant="outline"
            onClick={() => navigate("/compte/annonces")}
          >
            Mes annonces
          </Button>
        </div>
      </div>
    );

  const selectedPlan =
    catalog.plans.find((row) => row.id === data.planId) ||
    catalog.plans.find((row) => row.audience === "individual" && row.isActive);

  const stepContent = (() => {
    if (step === PUBLISH_STEP.type)
      return (
        <>
          <h2 className="text-lg font-black">Quel véhicule vendez-vous ?</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Les champs suivants s’adaptent au type sélectionné.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.vehicleTypes.map((type) => (
              <SelectableCard
                key={type.type}
                selected={data.vehicleType === type.type}
                onSelect={() => update("vehicleType", type.type)}
                className={`rounded-card border p-4 ${data.vehicleType === type.type ? "border-primary bg-primary-light" : "border-border-base bg-bg-surface"}`}
              >
                <CarFront className="h-icon-lg w-icon-lg text-primary" />
                <p className="mt-3 text-sm font-black">{type.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {type.description}
                </p>
              </SelectableCard>
            ))}
          </div>
        </>
      );
    if (step === PUBLISH_STEP.identification)
      return (
        <>
          <h2 className="text-lg font-black">Identifier le véhicule</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Ces informations doivent correspondre aux documents officiels.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <FormField label="Marque" required>
              <Select
                className="w-full"
                labelledByAncestor
                value={String(data.makeId)}
                onChange={(event) => {
                  const entry = catalog.vehicleCatalog.find(
                    (row) => row.id === event.target.value,
                  );
                  update("makeId", event.target.value);
                  if (entry) update("makeLabel", entry.label);
                }}
              >
                <option value="peugeot">Peugeot</option>
                <option value="bmw">BMW</option>
              </Select>
            </FormField>
            <FormField label="Modèle" required>
              <Select
                className="w-full"
                labelledByAncestor
                value={String(data.modelId)}
                onChange={(event) => {
                  const entry = catalog.vehicleCatalog.find(
                    (row) => row.id === event.target.value,
                  );
                  update("modelId", event.target.value);
                  if (entry) update("modelLabel", entry.label);
                }}
              >
                {catalog.vehicleCatalog
                  .filter(
                    (row) =>
                      row.kind === "model" && row.parentId === data.makeId,
                  )
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label="Année-modèle" required>
              <Input
                type="number"
                min={AUTO_CONSTRAINTS.modelYear.min}
                max={getMaximumVehicleModelYear(new Date().getFullYear())}
                value={Number(data.modelYear)}
                onChange={(event) =>
                  update("modelYear", Number(event.target.value))
                }
              />
            </FormField>
            <FormField label="Génération">
              <Input
                value={String(data.generationLabel)}
                onChange={(event) =>
                  update("generationLabel", event.target.value)
                }
              />
            </FormField>
            <FormField label="Finition / version">
              <Input
                value={String(data.trimLabel)}
                onChange={(event) => update("trimLabel", event.target.value)}
              />
            </FormField>
            <FormField label="Première mise en circulation">
              <Input
                type="date"
                value={String(data.firstRegistrationDate)}
                onChange={(event) =>
                  update("firstRegistrationDate", event.target.value)
                }
              />
            </FormField>
          </div>
          <div className="mt-5 border-t border-border-subtle pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="VIN">
                <Input
                  value={vin}
                  onChange={(event) => setVin(event.target.value)}
                  placeholder="17 caractères — jamais publié"
                  autoComplete="off"
                />
              </FormField>
              <FormField label="Immatriculation">
                <Input
                  value={registration}
                  onChange={(event) => setRegistration(event.target.value)}
                  placeholder="AA-123-AA — jamais publiée"
                  autoComplete="off"
                />
              </FormField>
            </div>
            <p className="mt-2 flex items-center gap-2 text-micro text-text-muted">
              <LockKeyhole className="h-icon-xs w-icon-xs" /> La valeur complète
              n’est pas enregistrée dans le brouillon : seuls une forme masquée
              et des condensats anti-doublon sont conservés côté serveur.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="outline"
                size="compact"
                onClick={checkDuplicate}
                isLoading={checkingDuplicate}
              >
                Vérifier les doublons
              </Button>
              {duplicateCheck !== "not_checked" && (
                <Badge
                  variant={duplicateCheck === "clear" ? "success" : "warning"}
                >
                  {duplicateCheck === "clear"
                    ? "Aucun doublon détecté"
                    : "Correspondance à examiner"}
                </Badge>
              )}
            </div>
          </div>
        </>
      );
    if (step === PUBLISH_STEP.technical)
      return (
        <>
          <h2 className="text-lg font-black">Caractéristiques techniques</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Les champs électriques apparaissent uniquement lorsque l’énergie le
            justifie.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <FormField label="Kilométrage" required>
              <Input
                type="number"
                min={AUTO_CONSTRAINTS.nonNegativeInteger.min}
                step={AUTO_CONSTRAINTS.nonNegativeInteger.step}
                value={Number(data.mileage)}
                onChange={(event) =>
                  update("mileage", Number(event.target.value))
                }
              />
            </FormField>
            <FormField label="Énergie" required>
              <Select
                className="w-full"
                labelledByAncestor
                value={String(data.fuelType)}
                onChange={(event) => update("fuelType", event.target.value)}
              >
                <option value="petrol">Essence</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Électrique</option>
                <option value="hybrid">Hybride</option>
                <option value="plug_in_hybrid">Hybride rechargeable</option>
              </Select>
            </FormField>
            <FormField label="Transmission" required>
              <Select
                className="w-full"
                labelledByAncestor
                value={String(data.transmission)}
                onChange={(event) => update("transmission", event.target.value)}
              >
                <option value="manual">Manuelle</option>
                <option value="automatic">Automatique</option>
              </Select>
            </FormField>
            <FormField label="Carrosserie">
              <Input
                value={String(data.bodyType)}
                onChange={(event) => update("bodyType", event.target.value)}
              />
            </FormField>
            <FormField label="Puissance (ch)">
              <Input
                type="number"
                min={AUTO_CONSTRAINTS.nonNegativeInteger.min}
                step={AUTO_CONSTRAINTS.nonNegativeInteger.step}
                value={Number(data.powerHp)}
                onChange={(event) =>
                  update("powerHp", Number(event.target.value))
                }
              />
            </FormField>
            <FormField label="Puissance fiscale">
              <Input
                type="number"
                min={AUTO_CONSTRAINTS.nonNegativeInteger.min}
                step={AUTO_CONSTRAINTS.nonNegativeInteger.step}
                value={Number(data.fiscalPower)}
                onChange={(event) =>
                  update("fiscalPower", Number(event.target.value))
                }
              />
            </FormField>
            {isElectric && (
              <>
                <FormField label="Batterie (kWh)" required>
                  <Input
                    type="number"
                    min={AUTO_CONSTRAINTS.nonNegativeDecimal.min}
                    step={AUTO_CONSTRAINTS.nonNegativeDecimal.step}
                    value={Number(data.batteryCapacityKwh || 0)}
                    onChange={(event) =>
                      update("batteryCapacityKwh", Number(event.target.value))
                    }
                  />
                </FormField>
                <FormField label="Autonomie électrique (km)">
                  <Input
                    type="number"
                    min={AUTO_CONSTRAINTS.nonNegativeInteger.min}
                    step={AUTO_CONSTRAINTS.nonNegativeInteger.step}
                    value={Number(data.electricRangeKm || 0)}
                    onChange={(event) =>
                      update("electricRangeKm", Number(event.target.value))
                    }
                  />
                </FormField>
                <FormField label="Recharge maximale (kW)">
                  <Input
                    type="number"
                    min={AUTO_CONSTRAINTS.nonNegativeDecimal.min}
                    step={AUTO_CONSTRAINTS.nonNegativeDecimal.step}
                    value={Number(data.chargingPowerKw || 0)}
                    onChange={(event) =>
                      update("chargingPowerKw", Number(event.target.value))
                    }
                  />
                </FormField>
              </>
            )}
          </div>
          {isElectric && (
            <div className="mt-4 flex gap-3 rounded-card bg-primary-light p-4 text-xs text-text-secondary">
              <BatteryCharging className="h-icon-md w-icon-md shrink-0 text-primary" />
              <p>
                Indiquez des valeurs vérifiables. L’autonomie dépend des
                conditions d’usage et n’est pas une promesse Shongre.
              </p>
            </div>
          )}
        </>
      );
    if (step === PUBLISH_STEP.history)
      return (
        <>
          <h2 className="text-lg font-black">État et historique</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Déclarez l’état honnêtement ; les incohérences peuvent déclencher
            une revue.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField label="État" required>
              <Select
                className="w-full"
                labelledByAncestor
                value={String(data.condition)}
                onChange={(event) => update("condition", event.target.value)}
              >
                <option value="excellent">Excellent</option>
                <option value="good">Bon</option>
                <option value="fair">Correct</option>
                <option value="damaged">Endommagé</option>
              </Select>
            </FormField>
            <FormField label="Accidents connus" required>
              <Select
                className="w-full"
                labelledByAncestor
                value={String(data.accidentStatus)}
                onChange={(event) =>
                  update("accidentStatus", event.target.value)
                }
              >
                <option value="none_declared">Aucun déclaré</option>
                <option value="repaired">Réparé</option>
                <option value="known_damage">Dommages connus</option>
                <option value="unknown">Inconnu</option>
              </Select>
            </FormField>
            <FormField label="Propriétaires précédents">
              <Input
                type="number"
                min={AUTO_CONSTRAINTS.nonNegativeInteger.min}
                step={AUTO_CONSTRAINTS.nonNegativeInteger.step}
                value={Number(data.previousOwnerCount)}
                onChange={(event) =>
                  update("previousOwnerCount", Number(event.target.value))
                }
              />
            </FormField>
            <FormField label="Carnet d’entretien">
              <Select
                className="w-full"
                labelledByAncestor
                value={String(data.maintenanceBookStatus)}
                onChange={(event) =>
                  update("maintenanceBookStatus", event.target.value)
                }
              >
                <option value="complete">Complet</option>
                <option value="partial">Partiel</option>
                <option value="none">Absent</option>
                <option value="unknown">Inconnu</option>
              </Select>
            </FormField>
            <FormField label="Contrôle technique">
              <Select
                className="w-full"
                labelledByAncestor
                value={String(data.inspectionStatus)}
                onChange={(event) =>
                  update("inspectionStatus", event.target.value)
                }
              >
                <option value="valid">Valide</option>
                <option value="due_soon">À renouveler bientôt</option>
                <option value="expired">Expiré</option>
                <option value="not_applicable">Non applicable</option>
              </Select>
            </FormField>
            <FormField label="Valide jusqu’au">
              <Input
                type="date"
                value={String(data.inspectionValidUntil)}
                onChange={(event) =>
                  update("inspectionValidUntil", event.target.value)
                }
              />
            </FormField>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Checkbox
              checked={Boolean(data.priceNegotiable)}
              onChange={(event) =>
                update("priceNegotiable", event.target.checked)
              }
              label="Prix négociable"
            />
            <Checkbox
              checked={Boolean(data.priceIncludesTax)}
              onChange={(event) =>
                update("priceIncludesTax", event.target.checked)
              }
              label="Prix TTC"
            />
            <Checkbox
              checked={Boolean(data.financingAvailable)}
              onChange={(event) =>
                update("financingAvailable", event.target.checked)
              }
              label="Financement proposé par le vendeur"
            />
          </div>
        </>
      );
    if (step === PUBLISH_STEP.documents)
      return (
        <>
          <h2 className="text-lg font-black">Documents</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Pour {activeMarket.name}, préparez les pièces utiles. Les fichiers
            restent privés et ne sont jamais affichés sur l’annonce.
          </p>
          <div className="mt-5 divide-y divide-border-subtle rounded-card border border-border-base">
            {(
              [
                ["registration_certificate", "Carte grise"],
                ["roadworthiness_inspection", "Contrôle technique"],
                [
                  "histovec_or_non_pledge",
                  "HistoVec / certificat de situation administrative",
                ],
                ["transfer_document", "Documents de cession"],
              ] as [VehicleDocument["type"], string][]
            ).map(([type, label]) => (
              <label
                key={type}
                className="flex min-h-16 cursor-pointer items-center justify-between gap-4 px-4 text-sm"
              >
                <span>
                  <strong className="block text-xs">{label}</strong>
                  <span className="text-micro text-text-muted">
                    Statut privé, contrôlable par la modération
                  </span>
                </span>
                <Checkbox
                  checked={(data.documents as VehicleDocument[]).some(
                    (row) => row.type === type,
                  )}
                  onChange={() => toggleDocument(type, label)}
                  label="Disponible"
                />
              </label>
            ))}
          </div>
        </>
      );
    if (step === PUBLISH_STEP.pricing)
      return (
        <>
          <h2 className="text-lg font-black">Prix et localisation</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Le prix est stocké en centimes et formaté selon le marché.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FormField
              label={`Prix affiché (${formatCurrencySymbol(
                catalog.config.currency,
                currentLocale,
              )})`}
              required
            >
              <Input
                type="number"
                min={AUTO_CONSTRAINTS.moneyMajor.min}
                step={AUTO_CONSTRAINTS.moneyMajor.step}
                value={
                  Number(data.priceMinor) / AUTO_CONSTRAINTS.minorUnitsPerMajor
                }
                onChange={(event) =>
                  update(
                    "priceMinor",
                    Math.round(
                      Number(event.target.value) *
                        AUTO_CONSTRAINTS.minorUnitsPerMajor,
                    ),
                  )
                }
              />
            </FormField>
            <FormField label="Ville / département" required>
              <Input
                value={String(data.locationLabel)}
                onChange={(event) =>
                  update("locationLabel", event.target.value)
                }
              />
            </FormField>
          </div>
          <div className="mt-5 rounded-card border border-border-base bg-bg-subtle p-4">
            <p className="text-xs font-black">Estimation honnête</p>
            <p className="mt-1 text-xs text-text-secondary">
              Une fourchette ne sera affichée que si le service dispose d’un
              échantillon suffisant de véhicules comparables. Elle restera une
              indication, jamais une expertise ni une garantie de vente.
            </p>
          </div>
        </>
      );
    if (step === PUBLISH_STEP.media)
      return (
        <>
          <h2 className="text-lg font-black">Photos et médias</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Au moins une photo est requise. Évitez les plaques lisibles et les
            personnes reconnaissables.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {(data.mediaUrls as string[]).map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="overflow-hidden rounded-card border border-border-base bg-bg-surface"
              >
                <div className="relative aspect-4/3 overflow-hidden">
                  <img
                    src={url}
                    alt={`Photo ${index + 1} du véhicule`}
                    className="h-full w-full object-cover"
                  />
                  {index === 0 && (
                    <Badge className="absolute left-2 top-2" variant="success">
                      Photo principale
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-2 text-micro font-bold">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveMedia(index, -1)}
                    aria-label={`Déplacer la photo ${index + 1} vers la gauche`}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "mediaUrls",
                        (data.mediaUrls as string[]).filter(
                          (_item, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                    aria-label={`Supprimer la photo ${index + 1}`}
                    className="text-danger"
                  >
                    Supprimer
                  </button>
                  <button
                    type="button"
                    disabled={index === (data.mediaUrls as string[]).length - 1}
                    onClick={() => moveMedia(index, 1)}
                    aria-label={`Déplacer la photo ${index + 1} vers la droite`}
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
            <label className="grid aspect-4/3 cursor-pointer place-items-center rounded-card border border-dashed border-border-strong bg-bg-subtle text-xs font-bold text-text-secondary">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={uploadMedia}
                disabled={mediaUploading}
              />
              <span className="grid justify-items-center gap-2">
                <Camera className="h-icon-lg w-icon-lg" />
                {mediaUploading ? "Ajout en cours…" : "Ajouter une photo"}
              </span>
            </label>
          </div>
          <p className="mt-4 text-micro text-text-muted">
            Le plan {selectedPlan?.name || "sélectionné"} autorise{" "}
            {selectedPlan?.entitlements.maxPhotosPerVehicle || 0} photos.
          </p>
        </>
      );
    if (step === PUBLISH_STEP.preview)
      return (
        <>
          <h2 className="text-lg font-black">Aperçu de l’annonce</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Relisez le titre et la description avant de choisir une offre.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-sidebar-compact">
            <img
              src={(data.mediaUrls as string[])[0]}
              alt=""
              className="aspect-4/3 w-full rounded-card object-cover"
            />
            <div>
              <FormField label="Titre" required>
                <Input
                  value={String(data.title)}
                  onChange={(event) => update("title", event.target.value)}
                />
              </FormField>
              <FormField label="Description" required className="mt-4">
                <Textarea
                  rows={6}
                  value={String(data.description)}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </FormField>
              <p className="mt-3 text-lg font-black text-primary">
                {formatAutoMoney(
                  {
                    amountMinor: Number(data.priceMinor),
                    currency: catalog.config.currency,
                  },
                  currentLocale,
                )}
              </p>
            </div>
          </div>
        </>
      );
    if (step === PUBLISH_STEP.offer)
      return (
        <>
          <h2 className="text-lg font-black">Choisir une offre</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Les prix et droits viennent du catalogue du marché, jamais du
            composant.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {catalog.plans
              .filter((plan) => plan.audience === "individual")
              .map((plan) => {
                const paidUnavailable = Boolean(
                  plan.monthlyPrice &&
                  !catalog.config.featureFlags.paidOffersEnabled,
                );
                return (
                  <SelectableCard
                    key={plan.id}
                    selected={data.planId === plan.id}
                    disabled={paidUnavailable}
                    onSelect={() => update("planId", plan.id)}
                    className={`rounded-card border p-5 ${data.planId === plan.id ? "border-primary bg-primary-light" : "border-border-base"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-card bg-bg-subtle text-primary">
                        {plan.id === "auto_private_secure" ? (
                          <ShieldCheck className="h-icon-lg w-icon-lg" />
                        ) : (
                          <CarFront className="h-icon-lg w-icon-lg" />
                        )}
                      </span>
                      <Badge>
                        {plan.monthlyPrice
                          ? formatAutoMoney(plan.monthlyPrice, currentLocale)
                          : "Gratuit"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm font-black">{plan.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                      {plan.description}
                      {paidUnavailable ? " — bientôt disponible" : ""}
                    </p>
                  </SelectableCard>
                );
              })}
          </div>
          <p className="mt-4 text-micro text-text-muted">
            Vente Sérénité reste visible mais non sélectionnable tant que le
            service, ses conditions, le checkout serveur et les opérations de
            remboursement ne sont pas activés.
          </p>
        </>
      );
    if (step === PUBLISH_STEP.payment)
      return (
        <>
          <h2 className="text-lg font-black">Paiement</h2>
          <div className="mt-5 rounded-card border border-success-border bg-success-surface p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <CheckCircle2 className="h-icon-md w-icon-md text-success" />{" "}
              Aucun paiement requis
            </p>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Vous avez choisi Particulier Gratuit. Aucun numéro de carte n’est
              demandé et aucun paiement réel ne sera simulé ici.
            </p>
          </div>
          <div className="mt-4 rounded-card border border-border-base p-4">
            <p className="text-xs font-black">
              Architecture prête pour la suite
            </p>
            <p className="mt-1 text-micro leading-relaxed text-text-muted">
              Les abonnements utiliseront Billing + Checkout Sessions et les
              achats ponctuels Checkout Sessions, avec idempotence et webhooks
              côté serveur. Ces parcours restent désactivés dans la
              configuration du marché.
            </p>
          </div>
        </>
      );
    return (
      <>
        <h2 className="text-lg font-black">Envoyer en validation</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Votre annonce sera contrôlée avant publication. Une correspondance
          possible de VIN reste visible uniquement pour l’équipe de modération.
        </p>
        <div className="mt-5 space-y-3 rounded-card border border-border-base p-5 text-xs">
          <p className="flex items-center gap-2">
            <Check className="h-icon-sm w-icon-sm text-success" />{" "}
            {data.makeLabel} {data.modelLabel} · {data.modelYear}
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-icon-sm w-icon-sm text-success" />{" "}
            {data.mileage} km · {data.fuelType} · {data.transmission}
          </p>
          <p className="flex items-center gap-2">
            <Check className="h-icon-sm w-icon-sm text-success" />{" "}
            {formatAutoMoney(
              {
                amountMinor: Number(data.priceMinor),
                currency: catalog.config.currency,
              },
              currentLocale,
            )}{" "}
            · {data.locationLabel}
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-icon-sm w-icon-sm text-primary" />{" "}
            Contrôle anti-doublon :{" "}
            {duplicateCheck === "clear"
              ? "aucune correspondance"
              : "revue manuelle requise"}
          </p>
        </div>
        <Button
          fullWidth
          className="mt-5"
          onClick={submit}
          isLoading={submitting}
        >
          Envoyer l’annonce en validation
        </Button>
      </>
    );
  })();

  return (
    <div className="min-h-screen bg-bg-base pb-24">
      <div className="mx-auto max-w-screen-xl px-4 py-6">
        <h1 className="text-2xl font-black tracking-tight">
          Publier un véhicule
        </h1>
        <div className="mt-5 overflow-x-auto pb-2">
          <ol className="flex min-w-232 justify-between gap-2">
            {STEPS.map(([label], index) => {
              const number = index + FIRST_STEP;
              const active = number === step;
              const done = completedSteps.includes(number);
              return (
                <li key={label} className="min-w-16 flex-1 text-center">
                  <button
                    type="button"
                    onClick={() => (done || number <= step) && setStep(number)}
                    className="group w-full"
                  >
                    <span
                      className={`mx-auto grid h-8 w-8 place-items-center rounded-full border text-xs font-black ${active ? "border-primary bg-primary text-white" : done ? "border-success bg-success-surface text-success" : "border-border-base bg-bg-surface text-text-muted"}`}
                    >
                      {done ? (
                        <Check className="h-icon-xs w-icon-xs" />
                      ) : (
                        number
                      )}
                    </span>
                    <span
                      className={`mt-2 block text-micro font-bold ${active ? "text-primary" : "text-text-muted"}`}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-content-aside-xs">
          <main className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
            {stepContent}
            <div className="mt-7 flex justify-between border-t border-border-subtle pt-4">
              <Button
                variant="outline"
                disabled={step === FIRST_STEP}
                onClick={() =>
                  setStep((current) =>
                    Math.max(FIRST_STEP, current - FIRST_STEP),
                  )
                }
                leftIcon={<ArrowLeft className="h-icon-sm w-icon-sm" />}
              >
                Retour
              </Button>
              {step < TOTAL_STEPS && (
                <Button
                  onClick={next}
                  disabled={!canContinue}
                  rightIcon={<ArrowRight className="h-icon-sm w-icon-sm" />}
                >
                  Continuer
                </Button>
              )}
            </div>
          </main>
          <aside className="self-start space-y-3 lg:sticky lg:top-4">
            <div className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
              <p className="text-xs font-black">Votre avancement</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">
                    Étape {step} sur {TOTAL_STEPS}
                  </p>
                  <ProgressBar
                    className="mt-2"
                    value={completedSteps.length}
                    max={TOTAL_STEPS}
                    label={`Progression : ${completedSteps.length} étapes sur ${TOTAL_STEPS}`}
                  />
                  <p className="text-micro text-text-muted">
                    {TOTAL_STEPS - completedSteps.length} étape
                    {TOTAL_STEPS - completedSteps.length > FIRST_STEP
                      ? "s"
                      : ""}{" "}
                    restante
                    {TOTAL_STEPS - completedSteps.length > FIRST_STEP
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
              <p className="text-xs font-black">Véhicule</p>
              <p className="mt-2 text-sm font-bold">
                {data.makeLabel} {data.modelLabel}
              </p>
              <p className="text-micro text-text-muted">
                {data.modelYear} · {data.fuelType} · {data.transmission}
              </p>
            </div>
            <div className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
              <p className="flex items-center gap-2 text-xs font-black">
                <Cloud className="h-icon-sm w-icon-sm text-success" />{" "}
                {saving ? "Enregistrement…" : "Progression sauvegardée"}
              </p>
              <p className="mt-2 text-micro leading-relaxed text-text-muted">
                Les champs non sensibles survivent à une interruption. Le VIN et
                l’immatriculation complets ne sont jamais placés dans le
                stockage local.
                {lastSavedAt ? " Dernière sauvegarde effectuée." : ""}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
