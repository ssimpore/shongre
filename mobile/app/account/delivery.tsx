import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { FormField } from "@shongre/ui/native";
import type {
  DeliveryApplication,
  DeliveryCourierProfile,
  DeliveryPrivateRequest,
  DeliveryPublicRequest,
  DeliveryRequestStatus,
  DeliverySelectedCourierAssignment,
  DeliveryVehicleType,
} from "@shongre/contracts/delivery";
import { DELIVERY_PARTICIPANT_TRANSITIONS } from "@shongre/contracts/delivery";
import { deterministicUuid } from "@shongre/shared/deterministic-id";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StatePanel } from "@/components/StatePanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import {
  deliveryService,
  type MobileDeliveryActor,
} from "@/features/delivery/delivery.service";
import {
  mobileColors as colors,
  mobileRadius as radius,
  nativeBorders,
  nativeSpacing as spacing,
  nativeTypography,
} from "@shongre/design-tokens/native";

type ViewMode = "browse" | "request" | "courier" | "mine";

const isViewMode = (value: string | undefined): value is ViewMode =>
  Boolean(value && ["browse", "request", "courier", "mine"].includes(value));

const VEHICLES: { value: DeliveryVehicleType; label: string }[] = [
  { value: "bicycle", label: "Vélo" },
  { value: "cargo_bicycle", label: "Vélo cargo" },
  { value: "scooter", label: "Scooter" },
  { value: "car", label: "Voiture" },
  { value: "van", label: "Utilitaire" },
];

const futureIso = (days: number, hour: number) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
};

function RequestSummary({ request }: { request: DeliveryPublicRequest }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{request.title}</Text>
        {request.budget ? (
          <Text style={styles.price}>
            {(request.budget.amountMinor / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: request.budget.currency,
            })}
          </Text>
        ) : null}
      </View>
      <Text style={styles.body}>{request.description}</Text>
      <Text style={styles.route}>
        {request.pickupLocality.city} {request.pickupLocality.postalCode} →{" "}
        {request.dropoffLocality.city} {request.dropoffLocality.postalCode}
      </Text>
      <Text style={styles.muted}>
        {request.package.type} ·{" "}
        {request.package.approximateWeightGrams / 1_000} kg ·{" "}
        {request.applicationCount} candidature(s)
      </Text>
    </View>
  );
}

export default function DeliveryScreen() {
  const { user } = useAuth();
  const { activeMarket } = useMarket();
  const {
    orderId,
    requestId,
    mode: requestedMode,
  } = useLocalSearchParams<{
    orderId?: string;
    requestId?: string;
    mode?: ViewMode;
  }>();
  const sourceOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
  const selectedRequestId = Array.isArray(requestId) ? requestId[0] : requestId;
  const requestedModeValue = Array.isArray(requestedMode)
    ? requestedMode[0]
    : requestedMode;
  const routeMode: ViewMode = isViewMode(requestedModeValue)
    ? requestedModeValue
    : "browse";
  const actor = useMemo<MobileDeliveryActor | null>(
    () =>
      user
        ? {
            userId: user.id,
            displayName: user.name,
            verified: false,
          }
        : null,
    [user],
  );
  const [modeOverride, setModeOverride] = useState<{
    routeMode: ViewMode;
    value: ViewMode;
  } | null>(null);
  const mode =
    modeOverride?.routeMode === routeMode ? modeOverride.value : routeMode;
  const setMode = useCallback(
    (value: ViewMode) => setModeOverride({ routeMode, value }),
    [routeMode],
  );
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DeliveryPublicRequest[]>([]);
  const [ownRequests, setOwnRequests] = useState<DeliveryPrivateRequest[]>([]);
  const [ownApplications, setOwnApplications] = useState<DeliveryApplication[]>(
    [],
  );
  const [assignedRequests, setAssignedRequests] = useState<
    DeliverySelectedCourierAssignment[]
  >([]);
  const [profile, setProfile] = useState<DeliveryCourierProfile | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const availability = await deliveryService.availability(
        activeMarket.code,
      );
      setEnabled(availability.enabled);
      if (!availability.enabled) {
        setRequests([]);
        return;
      }
      const [
        publicRequests,
        selectedPublicRequest,
        currentProfile,
        mine,
        applications,
      ] = await Promise.all([
        deliveryService.search({ marketCode: activeMarket.code, limit: 20 }),
        selectedRequestId
          ? deliveryService
              .getPublicRequest(selectedRequestId, activeMarket.code)
              .catch(() => null)
          : Promise.resolve(null),
        actor
          ? deliveryService.getCourierProfile(actor, activeMarket.code)
          : Promise.resolve(null),
        actor
          ? deliveryService.listOwnRequests(actor, activeMarket.code)
          : Promise.resolve([]),
        actor
          ? deliveryService.listOwnApplications(actor, activeMarket.code)
          : Promise.resolve([]),
      ]);
      setRequests(
        selectedPublicRequest
          ? [
              selectedPublicRequest,
              ...publicRequests.filter(
                (request) => request.id !== selectedPublicRequest.id,
              ),
            ]
          : publicRequests,
      );
      setProfile(currentProfile);
      setOwnRequests(mine);
      setOwnApplications(applications);
      if (actor) {
        const assigned = await Promise.all(
          applications
            .filter((application) => application.status === "accepted")
            .map((application) =>
              deliveryService
                .getPrivateRequest(
                  actor,
                  application.requestId,
                  activeMarket.code,
                )
                .catch(() => null),
            ),
        );
        setAssignedRequests(
          assigned.filter(
            (request): request is DeliverySelectedCourierAssignment =>
              request !== null && "selectedApplication" in request,
          ),
        );
      } else {
        setAssignedRequests([]);
      }
    } catch {
      setError("La livraison est momentanément indisponible.");
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, actor, selectedRequestId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load]);

  return (
    <Screen edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Livraison & coursier" }} />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.heading}>
          Livraison & coursier
        </Text>
        <Text style={styles.body}>
          Demandez une livraison locale ou proposez votre disponibilité sur{" "}
          {activeMarket.name}.
        </Text>
      </View>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {(
          [
            ["browse", "Demandes"],
            ["request", "Publier"],
            ["courier", "Coursier"],
            ["mine", "Suivi"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            label={label}
            size="sm"
            variant={mode === value ? "primary" : "secondary"}
            onPress={() => setMode(value)}
            accessibilityLabel={label}
          />
        ))}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {enabled === false ? (
        <StatePanel
          title="Fonction indisponible"
          message="La livraison n’est pas encore activée sur ce marché."
        />
      ) : loading ? (
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          Chargement…
        </Text>
      ) : !actor && mode !== "browse" ? (
        <StatePanel
          title="Connexion requise"
          message="Connectez-vous pour publier, candidater ou suivre une livraison."
        />
      ) : mode === "browse" ? (
        <BrowseView
          requests={requests}
          selectedRequestId={selectedRequestId}
          actor={actor}
          profile={profile}
          marketCode={activeMarket.code}
          onChanged={load}
        />
      ) : mode === "request" && actor ? (
        <CreateRequestView
          actor={actor}
          marketCode={activeMarket.code}
          sourceOrderId={sourceOrderId}
          onCreated={async () => {
            await load();
            setMode("mine");
          }}
        />
      ) : mode === "courier" && actor ? (
        <CourierProfileView
          actor={actor}
          marketCode={activeMarket.code}
          profile={profile}
          onSaved={load}
        />
      ) : actor ? (
        <TrackingView
          actor={actor}
          requests={ownRequests}
          assignedRequests={assignedRequests}
          applications={ownApplications}
          marketCode={activeMarket.code}
          onChanged={load}
        />
      ) : null}
    </Screen>
  );
}

function BrowseView({
  requests,
  selectedRequestId,
  actor,
  profile,
  marketCode,
  onChanged,
}: {
  requests: DeliveryPublicRequest[];
  selectedRequestId?: string;
  actor: MobileDeliveryActor | null;
  profile: DeliveryCourierProfile | null;
  marketCode: string;
  onChanged: () => Promise<void>;
}) {
  const visibleRequests = selectedRequestId
    ? requests.filter((request) => request.id === selectedRequestId)
    : requests;
  const apply = async (request: DeliveryPublicRequest) => {
    if (
      !actor ||
      profile?.status !== "active" ||
      profile.eligibilityStatus !== "eligible"
    ) {
      Alert.alert(
        "Profil coursier requis",
        "Activez votre profil et attendez sa validation avant de candidater.",
      );
      return;
    }
    try {
      await deliveryService.submitApplication(actor, request.id, marketCode, {
        availabilityNote: "Disponible sur le créneau demandé",
        message:
          "Je peux prendre en charge cette livraison dans les conditions indiquées.",
        idempotencyKey: `mobile-${actor.userId}-${request.id}`,
      });
      Alert.alert(
        "Candidature envoyée",
        "Le demandeur peut maintenant consulter votre proposition.",
      );
      await onChanged();
    } catch {
      Alert.alert(
        "Candidature impossible",
        "Vérifiez votre profil ou l’état de la demande.",
      );
    }
  };
  if (!visibleRequests.length)
    return (
      <StatePanel
        title={
          selectedRequestId ? "Demande indisponible" : "Aucune demande ouverte"
        }
        message={
          selectedRequestId
            ? "Cette demande n’est plus disponible sur ce marché."
            : "Revenez plus tard pour découvrir de nouvelles livraisons."
        }
      />
    );
  return (
    <View style={styles.section}>
      {visibleRequests.map((request) => (
        <View key={request.id} style={styles.section}>
          <RequestSummary request={request} />
          <Button
            label="Proposer mes services"
            variant="secondary"
            onPress={() => void apply(request)}
          />
        </View>
      ))}
    </View>
  );
}

function CreateRequestView({
  actor,
  marketCode,
  sourceOrderId,
  onCreated,
}: {
  actor: MobileDeliveryActor;
  marketCode: string;
  sourceOrderId?: string;
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickupStreet, setPickupStreet] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupPostalCode, setPickupPostalCode] = useState("");
  const [dropoffStreet, setDropoffStreet] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffPostalCode, setDropoffPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [packageType, setPackageType] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (
      !title ||
      !description ||
      !pickupStreet ||
      !pickupCity ||
      !pickupPostalCode ||
      !dropoffStreet ||
      !dropoffCity ||
      !dropoffPostalCode ||
      !phone ||
      !packageType ||
      !weightKg
    ) {
      Alert.alert(
        "Informations manquantes",
        "Complétez tous les champs obligatoires.",
      );
      return;
    }
    setSaving(true);
    try {
      await deliveryService.createAndPublish(actor, {
        marketCode,
        origin: sourceOrderId ? "order" : "standalone",
        sourceOrderId,
        title,
        description,
        pickup: {
          street: pickupStreet,
          city: pickupCity,
          postalCode: pickupPostalCode,
          contactName: actor.displayName,
          contactPhone: phone,
        },
        dropoff: {
          street: dropoffStreet,
          city: dropoffCity,
          postalCode: dropoffPostalCode,
          contactName: actor.displayName,
          contactPhone: phone,
        },
        pickupWindow: { startsAt: futureIso(3, 9), endsAt: futureIso(3, 11) },
        deliveryWindow: {
          startsAt: futureIso(3, 12),
          endsAt: futureIso(3, 17),
        },
        package: {
          type: packageType,
          count: 1,
          approximateWeightGrams: Math.round(Number(weightKg) * 1_000),
          handlingRequirements: [],
          loadingAssistanceRequired: false,
        },
        expiresAt: futureIso(2, 18),
        idempotencyKey: `mobile-${deterministicUuid(
          "delivery-request-submit",
          JSON.stringify({
            userId: actor.userId,
            marketCode,
            title,
            pickupStreet,
            pickupPostalCode,
            dropoffStreet,
            dropoffPostalCode,
            packageType,
            weightKg,
          }),
        )}`,
      });
      Alert.alert(
        "Demande publiée",
        "Les coursiers éligibles peuvent maintenant candidater.",
      );
      await onCreated();
    } catch {
      Alert.alert(
        "Publication impossible",
        "Vérifiez les informations puis réessayez.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.form}>
      <Text style={styles.sectionTitle}>Nouvelle demande</Text>
      <Text style={styles.muted}>
        Les adresses exactes restent privées jusqu’à l’attribution.
      </Text>
      {sourceOrderId ? (
        <Text accessibilityRole="summary" style={styles.notice}>
          Demande rattachée à la commande {sourceOrderId.slice(0, 8)}.
          L’éligibilité sera vérifiée par Shongre avant publication.
        </Text>
      ) : null}
      <FormField label="Titre" required value={title} onChangeText={setTitle} />
      <FormField
        label="Description"
        required
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <FormField
        label="Adresse de départ"
        required
        value={pickupStreet}
        onChangeText={setPickupStreet}
      />
      <FormField
        label="Ville de départ"
        required
        value={pickupCity}
        onChangeText={setPickupCity}
      />
      <FormField
        label="Code postal de départ"
        required
        value={pickupPostalCode}
        onChangeText={setPickupPostalCode}
        keyboardType="number-pad"
      />
      <FormField
        label="Adresse d’arrivée"
        required
        value={dropoffStreet}
        onChangeText={setDropoffStreet}
      />
      <FormField
        label="Ville d’arrivée"
        required
        value={dropoffCity}
        onChangeText={setDropoffCity}
      />
      <FormField
        label="Code postal d’arrivée"
        required
        value={dropoffPostalCode}
        onChangeText={setDropoffPostalCode}
        keyboardType="number-pad"
      />
      <FormField
        label="Téléphone du contact"
        required
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <FormField
        label="Type de colis"
        required
        value={packageType}
        onChangeText={setPackageType}
      />
      <FormField
        label="Poids approximatif (kg)"
        required
        value={weightKg}
        onChangeText={setWeightKg}
        keyboardType="decimal-pad"
      />
      <Button
        label="Publier la demande"
        loading={saving}
        onPress={() => void submit()}
      />
    </View>
  );
}

function CourierProfileView({
  actor,
  marketCode,
  profile,
  onSaved,
}: {
  actor: MobileDeliveryActor;
  marketCode: string;
  profile: DeliveryCourierProfile | null;
  onSaved: () => Promise<void>;
}) {
  const [active, setActive] = useState(profile?.status === "active");
  const [vehicleIndex, setVehicleIndex] = useState(
    Math.max(
      0,
      VEHICLES.findIndex((entry) => entry.value === profile?.vehicleTypes[0]),
    ),
  );
  const [city, setCity] = useState(profile?.serviceLocalities[0]?.city ?? "");
  const [postalCode, setPostalCode] = useState(
    profile?.serviceLocalities[0]?.postalCode ?? "",
  );
  const [secondaryCity, setSecondaryCity] = useState(
    profile?.serviceLocalities[1]?.city ?? "",
  );
  const [secondaryPostalCode, setSecondaryPostalCode] = useState(
    profile?.serviceLocalities[1]?.postalCode ?? "",
  );
  const [weightKg, setWeightKg] = useState(
    String((profile?.maxWeightGrams ?? 20_000) / 1_000),
  );
  const [notifications, setNotifications] = useState(
    profile?.opportunityNotifications ?? false,
  );
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!city || !postalCode || !weightKg) return;
    setSaving(true);
    try {
      const savedProfile = await deliveryService.saveCourierProfile(
        actor,
        marketCode,
        {
          status: active ? "active" : "paused",
          vehicleTypes: [VEHICLES[vehicleIndex].value],
          maxWeightGrams: Math.round(Number(weightKg) * 1_000),
          serviceLocalities: [
            { city, postalCode },
            ...(secondaryCity && secondaryPostalCode
              ? [{ city: secondaryCity, postalCode: secondaryPostalCode }]
              : []),
          ],
          opportunityNotifications: notifications,
        },
      );
      Alert.alert(
        "Profil enregistré",
        savedProfile.eligibilityStatus === "eligible"
          ? "Votre disponibilité et votre zone ont été mises à jour."
          : "Votre profil est enregistré et doit être validé avant toute candidature.",
      );
      await onSaved();
    } catch {
      Alert.alert(
        "Enregistrement impossible",
        "Vérifiez les informations puis réessayez.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.form}>
      <Text style={styles.sectionTitle}>Mon profil coursier</Text>
      {profile && profile.eligibilityStatus !== "eligible" ? (
        <Text accessibilityLiveRegion="polite" style={styles.warning}>
          Votre profil doit être validé avant de pouvoir candidater.
        </Text>
      ) : null}
      <View style={styles.switchRow}>
        <Text style={styles.label}>Disponible</Text>
        <Switch
          value={active}
          onValueChange={setActive}
          trackColor={{ false: colors.border, true: colors.surfaceMuted }}
          thumbColor={active ? colors.primary : colors.textMuted}
        />
      </View>
      <Text style={styles.label}>
        Véhicule : {VEHICLES[vehicleIndex].label}
      </Text>
      <Button
        label="Changer de véhicule"
        variant="secondary"
        onPress={() =>
          setVehicleIndex((value) => (value + 1) % VEHICLES.length)
        }
      />
      <FormField
        label="Première zone · ville"
        required
        value={city}
        onChangeText={setCity}
      />
      <FormField
        label="Première zone · code postal"
        required
        value={postalCode}
        onChangeText={setPostalCode}
        keyboardType="number-pad"
      />
      <FormField
        label="Deuxième zone · ville (facultatif)"
        value={secondaryCity}
        onChangeText={setSecondaryCity}
      />
      <FormField
        label="Deuxième zone · code postal (facultatif)"
        value={secondaryPostalCode}
        onChangeText={setSecondaryPostalCode}
        keyboardType="number-pad"
      />
      <FormField
        label="Poids maximal (kg)"
        required
        value={weightKg}
        onChangeText={setWeightKg}
        keyboardType="decimal-pad"
      />
      <View style={styles.switchRow}>
        <Text style={styles.label}>Recevoir les opportunités</Text>
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: colors.border, true: colors.surfaceMuted }}
          thumbColor={notifications ? colors.primary : colors.textMuted}
        />
      </View>
      <Button
        label="Enregistrer mon profil"
        loading={saving}
        onPress={() => void save()}
      />
    </View>
  );
}

function TrackingView({
  actor,
  requests,
  assignedRequests,
  applications,
  marketCode,
  onChanged,
}: {
  actor: MobileDeliveryActor;
  requests: DeliveryPrivateRequest[];
  assignedRequests: DeliverySelectedCourierAssignment[];
  applications: DeliveryApplication[];
  marketCode: string;
  onChanged: () => Promise<void>;
}) {
  const transitionLabel = (status: DeliveryRequestStatus) => {
    const labels: Partial<Record<DeliveryRequestStatus, string>> = {
      picked_up: "Confirmer la récupération",
      in_transit: "Démarrer la livraison",
      delivered: "Confirmer la livraison",
      completed: "Clôturer la livraison",
      cancelled: "Annuler la livraison",
      disputed: "Signaler un problème",
    };
    return labels[status] ?? status;
  };
  const transition = async (
    request: DeliveryPrivateRequest | DeliverySelectedCourierAssignment,
    status: DeliveryRequestStatus,
  ) => {
    try {
      await deliveryService.transition(
        actor,
        request.id,
        marketCode,
        status,
        request.version,
      );
      await onChanged();
    } catch {
      Alert.alert(
        "Mise à jour impossible",
        "La livraison a changé. Actualisez puis réessayez.",
      );
    }
  };
  const accept = (
    request: DeliveryPrivateRequest,
    application: DeliveryApplication,
  ) => {
    Alert.alert(
      "Choisir ce coursier ?",
      "Cette action clôturera les autres candidatures.",
      [
        { text: "Retour", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => {
            void deliveryService
              .acceptApplication(
                actor,
                request.id,
                application.id,
                marketCode,
                request.version,
              )
              .then(onChanged)
              .catch(() =>
                Alert.alert(
                  "Sélection impossible",
                  "La demande a changé. Actualisez puis réessayez.",
                ),
              );
          },
        },
      ],
    );
  };
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mes demandes</Text>
      {requests.length ? (
        requests.map((request) => (
          <View key={request.id} style={styles.card}>
            <Text style={styles.cardTitle}>{request.title}</Text>
            <Text style={styles.muted}>Statut : {request.status}</Text>
            {DELIVERY_PARTICIPANT_TRANSITIONS.requester[request.status].map(
              (status) => (
                <Button
                  key={status}
                  label={transitionLabel(status)}
                  size="sm"
                  variant={status === "completed" ? "primary" : "secondary"}
                  onPress={() => void transition(request, status)}
                />
              ),
            )}
            {request.applications.map((application) => (
              <View key={application.id} style={styles.application}>
                <Text style={styles.label}>
                  {application.courier.displayName}
                </Text>
                <Text style={styles.body}>{application.message}</Text>
                {application.status === "submitted" &&
                request.status === "open" ? (
                  <Button
                    label="Choisir ce coursier"
                    size="sm"
                    onPress={() => accept(request, application)}
                  />
                ) : (
                  <Text style={styles.muted}>{application.status}</Text>
                )}
              </View>
            ))}
          </View>
        ))
      ) : (
        <Text style={styles.muted}>Aucune demande publiée.</Text>
      )}
      <Text style={styles.sectionTitle}>Mes candidatures</Text>
      {applications.length ? (
        applications.map((application) => (
          <View key={application.id} style={styles.card}>
            <Text style={styles.cardTitle}>{application.availabilityNote}</Text>
            <Text style={styles.muted}>{application.status}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>Aucune candidature envoyée.</Text>
      )}
      {assignedRequests.length ? (
        <>
          <Text style={styles.sectionTitle}>Livraisons attribuées</Text>
          {assignedRequests.map((request) => (
            <View key={request.id} style={styles.card}>
              <Text style={styles.cardTitle}>{request.title}</Text>
              <Text style={styles.muted}>Statut : {request.status}</Text>
              <Text style={styles.route}>
                {request.pickup.street}, {request.pickup.city} →{" "}
                {request.dropoff.street}, {request.dropoff.city}
              </Text>
              {DELIVERY_PARTICIPANT_TRANSITIONS.courier[request.status].map(
                (status) => (
                  <Button
                    key={status}
                    label={transitionLabel(status)}
                    size="sm"
                    variant={
                      ["picked_up", "in_transit", "delivered"].includes(status)
                        ? "primary"
                        : "secondary"
                    }
                    onPress={() => void transition(request, status)}
                  />
                ),
              )}
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  heading: {
    color: colors.text,
    fontSize: nativeTypography.size.headingLg,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  body: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
  },
  muted: {
    color: colors.textMuted,
    fontSize: nativeTypography.size.caption,
    lineHeight: nativeTypography.lineHeight.caption,
  },
  notice: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  error: {
    color: colors.danger,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  warning: {
    color: colors.warning,
    fontSize: nativeTypography.size.bodySm,
    lineHeight: nativeTypography.lineHeight.bodySm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.warning,
    backgroundColor: colors.surfaceMuted,
  },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  section: { gap: spacing.md },
  sectionTitle: {
    color: colors.text,
    fontSize: nativeTypography.size.headingSm,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: nativeBorders.hairline,
    borderColor: colors.border,
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: nativeTypography.size.body,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  price: {
    color: colors.primary,
    fontSize: nativeTypography.size.body,
    fontFamily: nativeTypography.fontFamily.bold,
  },
  route: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.semibold,
  },
  form: { gap: spacing.lg },
  switchRow: {
    minHeight: spacing.xxxl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: nativeTypography.size.bodySm,
    fontFamily: nativeTypography.fontFamily.semibold,
  },
  application: {
    gap: spacing.sm,
    borderTopWidth: nativeBorders.hairline,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
