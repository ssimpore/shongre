import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Box, Flag, MapPin, Truck } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type {
  DeliveryApplication,
  DeliveryCourierEligibilityStatus,
  DeliveryCourierProfile,
  DeliveryPrivateRequest,
  DeliveryPublicRequest,
  DeliveryRequestStatus,
  DeliverySelectedCourierAssignment,
  DeliveryVehicleType,
} from "@shongre/contracts/delivery";
import {
  DELIVERY_CONSTRAINTS,
  DELIVERY_PARTICIPANT_TRANSITIONS,
} from "@shongre/contracts/delivery";
import { MODERATION_CONSTRAINTS } from "@shongre/contracts";
import { Card } from "@shongre/ui/web";
import { deterministicUuid } from "@shongre/shared/deterministic-id";
import { services } from "../../api/client/service-registry";
import { analyticsClient } from "../../analytics/analytics.client";
import type { DeliveryActor } from "../../api/contracts/delivery.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { routes } from "../../configuration/routes";
import {
  Badge,
  Button,
  Checkbox,
  Container,
  FormField,
  Input,
  Modal,
  Select,
  Skeleton,
  StatePanel,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { deliveryCatalogueFr } from "../../i18n/delivery.catalogue.fr";
import type { MessageKey } from "../../i18n/messages.fr";
import { ConfirmModal } from "../../design-system/primitives/ConfirmModal";
import { useDeliveryAvailability } from "./useDeliveryAvailability";

const VEHICLE_TYPES: DeliveryVehicleType[] = [
  "bicycle",
  "cargo_bicycle",
  "scooter",
  "car",
  "van",
];

const vehicleOptions = (t: ReturnType<typeof useTranslation>["t"]) =>
  VEHICLE_TYPES.map((value) => ({
    value,
    label: t(`delivery.vehicle.${value}` as MessageKey),
  }));

const futureLocalDate = (days: number, hour: number) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
};

const toIso = (value: string) => new Date(value).toISOString();

function actorFromUser(
  user: ReturnType<typeof useAuth>["currentUser"],
): DeliveryActor | null {
  if (!user) return null;
  return {
    userId: user.id,
    displayName: user.name || user.companyName || "Membre Shongre",
    verified: Boolean(user.isIdentityVerified || user.isEmailVerified),
  };
}

function DeliveryHeader({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation(deliveryCatalogueFr);
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex items-center gap-2 text-primary">
        <Truck className="h-icon-xl w-icon-xl" aria-hidden="true" />
        <span className="text-overline font-bold uppercase tracking-wide">
          Shongre
        </span>
      </div>
      <h1
        className={
          compact
            ? "text-xl font-bold text-text-main"
            : "text-2xl font-bold text-text-main sm:text-3xl"
        }
      >
        {t("delivery.title")}
      </h1>
      {!compact && (
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
          {t("delivery.subtitle")}
        </p>
      )}
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
      {[1, 2, 3, 4].map((key) => (
        <Skeleton key={key} className="h-52 w-full rounded-card" />
      ))}
    </div>
  );
}

function RequestCard({ request }: { request: DeliveryPublicRequest }) {
  const { t, locale } = useTranslation(deliveryCatalogueFr);
  const { formatPrice } = useMarketLocation();
  const pickupDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(request.pickupWindow.startsAt));
  return (
    <Card as="article" elevation="xs" className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge variant="primary">{t("delivery.status.open")}</Badge>
          <h2 className="mt-2 text-base font-bold text-text-main sm:text-lg">
            {request.title}
          </h2>
        </div>
        {request.budget && (
          <span className="shrink-0 text-base font-bold text-primary">
            {formatPrice(request.budget.amountMinor / 100, {
              sourceCurrency: request.budget.currency,
            })}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">
        {request.description}
      </p>
      <div className="space-y-2 text-sm text-text-secondary">
        <p className="flex items-center gap-2">
          <MapPin
            className="h-icon-md w-icon-md text-primary"
            aria-hidden="true"
          />
          {t("delivery.route", {
            pickup: `${request.pickupLocality.city} ${request.pickupLocality.postalCode}`,
            dropoff: `${request.dropoffLocality.city} ${request.dropoffLocality.postalCode}`,
          })}
        </p>
        <p className="flex items-center gap-2">
          <Box
            className="h-icon-md w-icon-md text-primary"
            aria-hidden="true"
          />
          {request.package.type} ·{" "}
          {request.package.approximateWeightGrams / 1_000} kg
        </p>
        <p>{pickupDate}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-base pt-4">
        <span className="text-xs text-text-muted">
          {t("delivery.applications", { count: request.applicationCount })}
        </span>
        <Button
          to={routes.delivery.request(request.id)}
          variant="secondary"
          size="compact"
          rightIcon={
            <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
          }
        >
          {t("delivery.viewRequest")}
        </Button>
      </div>
    </Card>
  );
}

export function DeliveryMarketplacePage() {
  const { t } = useTranslation(deliveryCatalogueFr);
  const { activeMarket } = useMarketLocation();
  const { currentUser } = useAuth();
  const vehicles = vehicleOptions(t);
  const availability = useDeliveryAvailability();
  const [requests, setRequests] = useState<DeliveryPublicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupPostalCode, setPickupPostalCode] = useState("");
  const [vehicleType, setVehicleType] = useState<DeliveryVehicleType | "">("");
  usePageMeta({
    title: t("delivery.meta.title"),
    description: t("delivery.meta.description"),
    canonicalPath: routes.delivery.marketplace(),
  });

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const result = await services.delivery.search({
        marketCode: activeMarket.code,
        pickupPostalCode: pickupPostalCode.trim() || undefined,
        vehicleType: vehicleType || undefined,
        limit: 20,
      });
      setRequests(result.items);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, pickupPostalCode, vehicleType]);

  useEffect(() => {
    if (availability.state === "enabled") void search();
    if (availability.state === "disabled" || availability.state === "error")
      setLoading(false);
  }, [availability.state, search]);

  return (
    <Container width="page" className="space-y-8 py-8 sm:py-10">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <DeliveryHeader />
        <div className="flex flex-wrap gap-2">
          {currentUser && (
            <Button to={routes.delivery.workspace()} variant="secondary">
              {t("delivery.requesterWorkspace")}
            </Button>
          )}
          <Button
            to={
              currentUser
                ? routes.delivery.create()
                : routes.auth.login(routes.delivery.create())
            }
          >
            {t("delivery.create")}
          </Button>
        </div>
      </section>

      {availability.state === "disabled" ? (
        <StatePanel
          variant="restricted"
          title={t("delivery.unavailable.title")}
          description={t("delivery.unavailable.description")}
          headingLevel={2}
        />
      ) : availability.state === "error" ? (
        <StatePanel
          variant="error"
          title={t("common.error")}
          description={t("delivery.error.generic")}
          action={
            <Button onClick={() => void availability.reload()}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : (
        <>
          <Card
            as="section"
            tone="subtle"
            aria-label={t("delivery.search.submit")}
          >
            <form
              className="grid items-end gap-3 sm:grid-cols-search-fields"
              onSubmit={(event) => {
                event.preventDefault();
                void search();
              }}
            >
              <FormField label={t("delivery.search.pickup")}>
                <Input
                  value={pickupPostalCode}
                  onChange={(event) => setPickupPostalCode(event.target.value)}
                  inputMode="numeric"
                />
              </FormField>
              <FormField label={t("delivery.search.vehicle")}>
                <Select
                  labelledByAncestor
                  value={vehicleType}
                  onChange={(event) =>
                    setVehicleType(
                      event.target.value as DeliveryVehicleType | "",
                    )
                  }
                  options={[
                    { value: "", label: t("delivery.search.allVehicles") },
                    ...vehicles,
                  ]}
                />
              </FormField>
              <Button type="submit" isLoading={loading}>
                {t("delivery.search.submit")}
              </Button>
            </form>
          </Card>
          {loading || availability.state === "loading" ? (
            <LoadingCards />
          ) : requests.length ? (
            <section className="grid gap-4 md:grid-cols-2" aria-live="polite">
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </section>
          ) : (
            <StatePanel
              variant="notFound"
              title={t("delivery.search.emptyTitle")}
              description={t("delivery.search.emptyDescription")}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPickupPostalCode("");
                    setVehicleType("");
                  }}
                >
                  {t("common.retry")}
                </Button>
              }
            />
          )}
        </>
      )}
    </Container>
  );
}

export function DeliveryRequestDetailPage() {
  const { requestId = "" } = useParams();
  const { t, locale } = useTranslation(deliveryCatalogueFr);
  const { activeMarket, formatPrice } = useMarketLocation();
  const { currentUser } = useAuth();
  const toast = useToast();
  const actor = useMemo(() => actorFromUser(currentUser), [currentUser]);
  const [request, setRequest] = useState<DeliveryPublicRequest | null>(null);
  const [profile, setProfile] = useState<DeliveryCourierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<
    "fraud" | "prohibited" | "harassment" | "other"
  >("other");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  usePageMeta({
    title: request ? `${request.title} | Shongre` : t("delivery.meta.title"),
    description: request?.description || t("delivery.meta.description"),
    canonicalPath: requestId
      ? routes.delivery.request(requestId)
      : routes.delivery.marketplace(),
    noIndex: true,
  });
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      services.delivery.getPublicRequest(requestId, activeMarket.code),
      actor
        ? services.delivery.getCourierProfile(actor, activeMarket.code)
        : Promise.resolve(null),
    ])
      .then(([nextRequest, nextProfile]) => {
        if (active) {
          setRequest(nextRequest);
          setProfile(nextProfile);
          analyticsClient.track("delivery_request_viewed", {
            originType: nextRequest.origin,
            vehicleClass: nextRequest.package.requiredVehicleType,
            lifecycleState: nextRequest.status,
            applicationCount: nextRequest.applicationCount,
          });
        }
      })
      .catch(() => {
        if (active) setRequest(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, actor?.userId, requestId]);

  if (loading)
    return (
      <Container width="page" className="py-8">
        <Skeleton className="h-96 w-full rounded-card" />
      </Container>
    );
  if (!request)
    return (
      <Container width="page" className="py-8">
        <StatePanel
          variant="notFound"
          title={t("delivery.search.emptyTitle")}
          description={t("delivery.search.emptyDescription")}
          action={
            <Button to={routes.delivery.marketplace()}>
              {t("common.back")}
            </Button>
          }
          headingLevel={1}
        />
      </Container>
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !actor ||
      !profile ||
      profile.status !== "active" ||
      profile.eligibilityStatus !== "eligible"
    )
      return;
    setSubmitting(true);
    try {
      await services.delivery.submitApplication(
        actor,
        request.id,
        activeMarket.code,
        {
          availabilityNote: availabilityNote.trim(),
          message: message.trim(),
          quote: quote
            ? {
                amountMinor: Math.round(Number(quote) * 100),
                currency: activeMarket.currency,
              }
            : undefined,
          idempotencyKey: `web-${actor.userId}-${request.id}`,
        },
      );
      toast.success(t("delivery.request.applicationSent"));
      setAvailabilityNote("");
      setMessage("");
      setQuote("");
    } catch {
      toast.error(t("delivery.error.generic"));
    } finally {
      setSubmitting(false);
    }
  };
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(request.pickupWindow.startsAt));
  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actor) return;
    setReporting(true);
    try {
      await services.moderation.submitReport({
        deliveryRequestId: request.id,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setReportOpen(false);
      setReportDetails("");
      toast.success(t("delivery.report.success"));
    } catch {
      toast.error(t("delivery.report.error"));
    } finally {
      setReporting(false);
    }
  };
  return (
    <Container
      width="page"
      className="grid gap-6 py-8 lg:grid-cols-content-aside-lg"
    >
      <div className="space-y-5">
        <DeliveryHeader compact />
        <Card as="article" elevation="xs" padding="lg" className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge variant="primary">{t("delivery.status.open")}</Badge>
              <h2 className="mt-2 text-xl font-bold text-text-main sm:text-2xl">
                {request.title}
              </h2>
            </div>
            {request.budget && (
              <span className="text-xl font-bold text-primary">
                {formatPrice(request.budget.amountMinor / 100, {
                  sourceCurrency: request.budget.currency,
                })}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            {request.description}
          </p>
          <dl className="grid gap-4 border-t border-border-base pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-text-muted">
                {t("delivery.route", {
                  pickup: request.pickupLocality.city,
                  dropoff: request.dropoffLocality.city,
                })}
              </dt>
              <dd className="mt-1 text-sm text-text-main">
                {request.pickupLocality.postalCode} →{" "}
                {request.dropoffLocality.postalCode}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">
                {t("delivery.request.package")}
              </dt>
              <dd className="mt-1 text-sm text-text-main">
                {request.package.type} · {request.package.count}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">
                {t("delivery.request.weight")}
              </dt>
              <dd className="mt-1 text-sm text-text-main">
                {request.package.approximateWeightGrams / 1_000} kg
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-text-muted">
                {t("delivery.request.window")}
              </dt>
              <dd className="mt-1 text-sm text-text-main">{date}</dd>
            </div>
          </dl>
        </Card>
      </div>
      <aside>
        <Card
          as="section"
          elevation="sm"
          className="space-y-4 lg:sticky lg:top-sticky-offset"
        >
          <h2 className="text-base font-bold text-text-main">
            {t("delivery.request.apply")}
          </h2>
          {!actor ? (
            <>
              <p className="text-sm text-text-secondary">
                {t("delivery.request.loginRequired")}
              </p>
              <Button
                fullWidth
                to={routes.auth.login(routes.delivery.request(request.id))}
              >
                {t("delivery.request.apply")}
              </Button>
            </>
          ) : !profile || profile.status !== "active" ? (
            <>
              <p className="text-sm text-text-secondary">
                {t("delivery.request.profileRequired")}
              </p>
              <Button fullWidth to={routes.delivery.courierWorkspace()}>
                {t("delivery.courierWorkspace")}
              </Button>
            </>
          ) : profile.eligibilityStatus !== "eligible" ? (
            <>
              <p className="text-sm text-warning">
                {t("delivery.courier.eligibilityRequired")}
              </p>
              <Button
                fullWidth
                variant="secondary"
                to={routes.delivery.courierWorkspace()}
              >
                {t("delivery.courierWorkspace")}
              </Button>
            </>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <FormField label={t("delivery.request.availability")} required>
                <Input
                  required
                  minLength={
                    DELIVERY_CONSTRAINTS.applicationAvailability.minLength
                  }
                  maxLength={
                    DELIVERY_CONSTRAINTS.applicationAvailability.maxLength
                  }
                  value={availabilityNote}
                  onChange={(event) => setAvailabilityNote(event.target.value)}
                />
              </FormField>
              <FormField label={t("delivery.request.applyMessage")} required>
                <Textarea
                  required
                  minLength={DELIVERY_CONSTRAINTS.applicationMessage.minLength}
                  maxLength={DELIVERY_CONSTRAINTS.applicationMessage.maxLength}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                />
              </FormField>
              <FormField
                label={t("delivery.request.quote", {
                  currency: activeMarket.currency,
                })}
              >
                <Input
                  type="number"
                  min={DELIVERY_CONSTRAINTS.quoteMajor.min}
                  step={DELIVERY_CONSTRAINTS.quoteMajor.step}
                  inputMode="decimal"
                  value={quote}
                  onChange={(event) => setQuote(event.target.value)}
                />
              </FormField>
              <p className="text-xs leading-relaxed text-text-muted">
                {t("delivery.quoteDisclaimer")}
              </p>
              <Button type="submit" fullWidth isLoading={submitting}>
                {t("delivery.request.submitApplication")}
              </Button>
            </form>
          )}
          {actor ? (
            <Button
              fullWidth
              variant="ghost"
              leftIcon={<Flag className="h-icon-sm w-icon-sm" />}
              onClick={() => setReportOpen(true)}
            >
              {t("delivery.report.action")}
            </Button>
          ) : null}
        </Card>
      </aside>
      <Modal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title={t("delivery.report.title")}
        description={t("delivery.report.description")}
      >
        <form className="space-y-4" onSubmit={submitReport}>
          <FormField label={t("delivery.report.reason")} required>
            <Select
              labelledByAncestor
              value={reportReason}
              onChange={(event) =>
                setReportReason(event.target.value as typeof reportReason)
              }
              options={[
                { value: "fraud", label: t("delivery.report.reason.fraud") },
                {
                  value: "prohibited",
                  label: t("delivery.report.reason.prohibited"),
                },
                {
                  value: "harassment",
                  label: t("delivery.report.reason.harassment"),
                },
                { value: "other", label: t("delivery.report.reason.other") },
              ]}
            />
          </FormField>
          <FormField label={t("delivery.report.details")} required>
            <Textarea
              required
              minLength={MODERATION_CONSTRAINTS.reportDetailsMinLength}
              maxLength={MODERATION_CONSTRAINTS.reportDetailsMaxLength}
              rows={4}
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReportOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="danger" isLoading={reporting}>
              {t("delivery.report.submit")}
            </Button>
          </div>
        </form>
      </Modal>
    </Container>
  );
}

interface DeliveryDraftFields {
  title: string;
  description: string;
  pickupStreet: string;
  pickupCity: string;
  pickupPostalCode: string;
  dropoffStreet: string;
  dropoffCity: string;
  dropoffPostalCode: string;
  contactName: string;
  contactPhone: string;
  packageType: string;
  weightKg: string;
  pickupAt: string;
  deliveryAt: string;
  expiresAt: string;
}

export function DeliveryCreatePage() {
  const { t } = useTranslation(deliveryCatalogueFr);
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceOrderId = searchParams.get("orderId")?.trim() || undefined;
  const actor = useMemo(() => actorFromUser(currentUser), [currentUser]);
  const [submitting, setSubmitting] = useState(false);
  const [sourceOrderState, setSourceOrderState] = useState<
    "standalone" | "loading" | "valid" | "invalid"
  >(sourceOrderId ? "loading" : "standalone");
  const [sourceOrderCode, setSourceOrderCode] = useState("");
  const [fields, setFields] = useState<DeliveryDraftFields>({
    title: "",
    description: "",
    pickupStreet: "",
    pickupCity: "",
    pickupPostalCode: "",
    dropoffStreet: "",
    dropoffCity: "",
    dropoffPostalCode: "",
    contactName: currentUser?.name || "",
    contactPhone: currentUser?.phone || "",
    packageType: "",
    weightKg: "",
    pickupAt: futureLocalDate(3, 9),
    deliveryAt: futureLocalDate(3, 14),
    expiresAt: futureLocalDate(2, 18),
  });
  usePageMeta({
    title: t("delivery.create.title"),
    description: t("delivery.create.description"),
    canonicalPath: routes.delivery.create(),
    noIndex: true,
  });
  useEffect(() => {
    analyticsClient.track("delivery_request_started", {
      originType: sourceOrderId ? "order" : "standalone",
    });
  }, [sourceOrderId]);
  useEffect(() => {
    if (!sourceOrderId || !currentUser) {
      setSourceOrderState("standalone");
      return;
    }
    let active = true;
    setSourceOrderState("loading");
    services.orders
      .getOrderById(sourceOrderId)
      .then((order) => {
        if (!active) return;
        const eligible =
          order &&
          (order.buyerId === currentUser.id ||
            order.sellerId === currentUser.id) &&
          (order.marketCode ?? activeMarket.code) === activeMarket.code &&
          order.deliveryMethod !== "digital" &&
          ["escrow_funded", "shipped", "pin_pending"].includes(order.status);
        if (!eligible) {
          setSourceOrderState("invalid");
          return;
        }
        setSourceOrderCode(order.code || order.id.slice(0, 8));
        setFields((prior) => ({
          ...prior,
          title:
            prior.title ||
            t("delivery.order.prefillTitle", { listing: order.listingTitle }),
          description:
            prior.description ||
            t("delivery.order.prefillDescription", {
              listing: order.listingTitle,
            }),
          packageType: prior.packageType || order.listingTitle,
          dropoffStreet:
            prior.dropoffStreet || order.deliveryAddress?.street || "",
          dropoffCity: prior.dropoffCity || order.deliveryAddress?.city || "",
          dropoffPostalCode:
            prior.dropoffPostalCode || order.deliveryAddress?.postalCode || "",
        }));
        setSourceOrderState("valid");
      })
      .catch(() => {
        if (active) setSourceOrderState("invalid");
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, currentUser, sourceOrderId, t]);
  const update =
    (name: keyof DeliveryDraftFields) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((prior) => ({ ...prior, [name]: event.target.value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actor) return;
    if (sourceOrderId && sourceOrderState !== "valid") return;
    setSubmitting(true);
    try {
      const draft = await services.delivery.createDraft(actor, {
        marketCode: activeMarket.code,
        origin: sourceOrderId ? "order" : "standalone",
        sourceOrderId,
        title: fields.title.trim(),
        description: fields.description.trim(),
        pickup: {
          street: fields.pickupStreet.trim(),
          city: fields.pickupCity.trim(),
          postalCode: fields.pickupPostalCode.trim(),
          contactName: fields.contactName.trim(),
          contactPhone: fields.contactPhone.trim(),
        },
        dropoff: {
          street: fields.dropoffStreet.trim(),
          city: fields.dropoffCity.trim(),
          postalCode: fields.dropoffPostalCode.trim(),
          contactName: fields.contactName.trim(),
          contactPhone: fields.contactPhone.trim(),
        },
        pickupWindow: {
          startsAt: toIso(fields.pickupAt),
          endsAt: new Date(
            new Date(fields.pickupAt).getTime() + 3_600_000,
          ).toISOString(),
        },
        deliveryWindow: {
          startsAt: toIso(fields.deliveryAt),
          endsAt: new Date(
            new Date(fields.deliveryAt).getTime() + 3_600_000,
          ).toISOString(),
        },
        package: {
          type: fields.packageType.trim(),
          count: 1,
          approximateWeightGrams: Math.round(Number(fields.weightKg) * 1_000),
          handlingRequirements: [],
          loadingAssistanceRequired: false,
        },
        expiresAt: toIso(fields.expiresAt),
        idempotencyKey: `web-${deterministicUuid(
          "delivery-request-submit",
          JSON.stringify({ actorId: actor.userId, sourceOrderId, fields }),
        )}`,
      });
      await services.delivery.publishRequest(
        actor,
        draft.id,
        activeMarket.code,
      );
      toast.success(t("delivery.create.success"));
      navigate(routes.delivery.workspace(draft.id));
    } catch {
      toast.error(t("delivery.error.generic"));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Container width="content" className="space-y-6 py-8">
      <DeliveryHeader compact />
      <Card as="section" padding="lg" elevation="xs" className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-text-main">
            {t("delivery.create.title")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t("delivery.create.description")}
          </p>
        </div>
        {sourceOrderState === "loading" ? (
          <Skeleton className="h-16 w-full rounded-card" />
        ) : sourceOrderState === "valid" ? (
          <div
            className="rounded-card border border-success-border bg-success-surface p-4 text-sm text-success"
            role="status"
          >
            {t("delivery.order.linked", { order: sourceOrderCode })}
          </div>
        ) : sourceOrderState === "invalid" ? (
          <StatePanel
            variant="restricted"
            title={t("delivery.order.invalidTitle")}
            description={t("delivery.order.invalidDescription")}
            action={
              <Button to={routes.delivery.create()} variant="secondary">
                {t("delivery.order.standalone")}
              </Button>
            }
            headingLevel={2}
          />
        ) : null}
        <form className="space-y-6" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("delivery.create.requestTitle")}
              required
              className="sm:col-span-2"
            >
              <Input
                required
                minLength={DELIVERY_CONSTRAINTS.requestTitle.minLength}
                maxLength={DELIVERY_CONSTRAINTS.requestTitle.maxLength}
                value={fields.title}
                onChange={update("title")}
              />
            </FormField>
            <FormField
              label={t("delivery.create.requestDescription")}
              required
              className="sm:col-span-2"
            >
              <Textarea
                required
                minLength={DELIVERY_CONSTRAINTS.requestDescription.minLength}
                maxLength={DELIVERY_CONSTRAINTS.requestDescription.maxLength}
                rows={4}
                value={fields.description}
                onChange={update("description")}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-text-main">
                {t("delivery.create.pickup")}
              </legend>
              <FormField label={t("delivery.create.street")} required>
                <Input
                  required
                  value={fields.pickupStreet}
                  onChange={update("pickupStreet")}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t("delivery.create.city")} required>
                  <Input
                    required
                    value={fields.pickupCity}
                    onChange={update("pickupCity")}
                  />
                </FormField>
                <FormField label={t("delivery.create.postalCode")} required>
                  <Input
                    required
                    value={fields.pickupPostalCode}
                    onChange={update("pickupPostalCode")}
                  />
                </FormField>
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-text-main">
                {t("delivery.create.dropoff")}
              </legend>
              <FormField label={t("delivery.create.street")} required>
                <Input
                  required
                  value={fields.dropoffStreet}
                  onChange={update("dropoffStreet")}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t("delivery.create.city")} required>
                  <Input
                    required
                    value={fields.dropoffCity}
                    onChange={update("dropoffCity")}
                  />
                </FormField>
                <FormField label={t("delivery.create.postalCode")} required>
                  <Input
                    required
                    value={fields.dropoffPostalCode}
                    onChange={update("dropoffPostalCode")}
                  />
                </FormField>
              </div>
            </fieldset>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("delivery.create.contactName")} required>
              <Input
                required
                value={fields.contactName}
                onChange={update("contactName")}
              />
            </FormField>
            <FormField label={t("delivery.create.contactPhone")} required>
              <Input
                required
                type="tel"
                value={fields.contactPhone}
                onChange={update("contactPhone")}
              />
            </FormField>
            <FormField label={t("delivery.create.packageType")} required>
              <Input
                required
                value={fields.packageType}
                onChange={update("packageType")}
              />
            </FormField>
            <FormField label={t("delivery.create.weightKg")} required>
              <Input
                required
                type="number"
                min={DELIVERY_CONSTRAINTS.weightKg.min}
                max={DELIVERY_CONSTRAINTS.weightKg.max}
                step={DELIVERY_CONSTRAINTS.weightKg.step}
                value={fields.weightKg}
                onChange={update("weightKg")}
              />
            </FormField>
            <FormField label={t("delivery.request.window")} required>
              <Input
                required
                type="datetime-local"
                value={fields.pickupAt}
                onChange={update("pickupAt")}
              />
            </FormField>
            <FormField label={t("delivery.create.dropoff")} required>
              <Input
                required
                type="datetime-local"
                value={fields.deliveryAt}
                onChange={update("deliveryAt")}
              />
            </FormField>
            <FormField label={t("delivery.create.expiresAt")} required>
              <Input
                required
                type="datetime-local"
                value={fields.expiresAt}
                onChange={update("expiresAt")}
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={submitting}
              disabled={
                sourceOrderState === "loading" || sourceOrderState === "invalid"
              }
            >
              {t("delivery.create.publish")}
            </Button>
          </div>
        </form>
      </Card>
    </Container>
  );
}

function statusLabel(
  status: DeliveryRequestStatus,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const key = `delivery.status.${status}` as Parameters<typeof t>[0];
  return t(key);
}

function transitionActionLabel(
  status: DeliveryRequestStatus,
  t: ReturnType<typeof useTranslation>["t"],
) {
  return t(`delivery.transition.${status}` as MessageKey);
}

export function DeliveryWorkspacePage() {
  const { requestId } = useParams();
  const { t } = useTranslation(deliveryCatalogueFr);
  const { currentUser } = useAuth();
  const { activeMarket, formatPrice } = useMarketLocation();
  const toast = useToast();
  const actor = useMemo(() => actorFromUser(currentUser), [currentUser]);
  const [requests, setRequests] = useState<DeliveryPrivateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [transitioning, setTransitioning] =
    useState<DeliveryRequestStatus | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{
    request: DeliveryPrivateRequest;
    application: DeliveryApplication;
  } | null>(null);
  const load = useCallback(async () => {
    if (!actor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRequests(
        await services.delivery.listOwnRequests(actor, activeMarket.code),
      );
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, actor]);
  useEffect(() => void load(), [load]);
  usePageMeta({
    title: `${t("delivery.requesterWorkspace")} | Shongre`,
    description: t("delivery.meta.description"),
    canonicalPath: routes.delivery.workspace(),
    noIndex: true,
  });
  const selected = requestId
    ? requests.find((request) => request.id === requestId)
    : null;
  const accept = async () => {
    if (!actor || !pendingSelection) return;
    setAccepting(true);
    try {
      await services.delivery.acceptApplication(
        actor,
        pendingSelection.request.id,
        pendingSelection.application.id,
        activeMarket.code,
        pendingSelection.request.version,
      );
      toast.success(t("delivery.workspace.accepted"));
      setPendingSelection(null);
      await load();
    } catch {
      toast.error(t("delivery.error.generic"));
    } finally {
      setAccepting(false);
    }
  };
  const transition = async (
    request: DeliveryPrivateRequest,
    status: DeliveryRequestStatus,
  ) => {
    if (!actor) return;
    setTransitioning(status);
    try {
      await services.delivery.transition(
        actor,
        request.id,
        activeMarket.code,
        status,
        request.version,
      );
      toast.success(t("delivery.workspace.updated"));
      await load();
    } catch {
      toast.error(t("delivery.error.generic"));
    } finally {
      setTransitioning(null);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <DeliveryHeader compact />
        <Button to={routes.delivery.create()}>{t("delivery.create")}</Button>
      </div>
      {loading ? (
        <LoadingCards />
      ) : !requests.length ? (
        <StatePanel
          variant="notFound"
          title={t("delivery.workspace.empty")}
          description={t("delivery.create.description")}
          action={
            <Button to={routes.delivery.create()}>
              {t("delivery.create")}
            </Button>
          }
        />
      ) : selected ? (
        <div className="space-y-4">
          <Button variant="ghost" to={routes.delivery.workspace()}>
            {t("common.back")}
          </Button>
          <Card as="section" padding="lg" className="space-y-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <Badge
                  variant={selected.status === "open" ? "primary" : "neutral"}
                >
                  {statusLabel(selected.status, t)}
                </Badge>
                <h2 className="mt-2 text-xl font-bold text-text-main">
                  {selected.title}
                </h2>
              </div>
              <p className="text-sm text-text-secondary">
                {selected.pickup.city} → {selected.dropoff.city}
              </p>
            </div>
            <section
              className="grid gap-4 rounded-card border border-border-base bg-bg-subtle p-4 sm:grid-cols-2"
              aria-labelledby="delivery-private-stops-heading"
            >
              <h3
                id="delivery-private-stops-heading"
                className="text-base font-bold text-text-main sm:col-span-2"
              >
                {t("delivery.workspace.privateStops")}
              </h3>
              <div>
                <h4 className="text-sm font-semibold text-text-main">
                  {t("delivery.create.pickup")}
                </h4>
                <address className="mt-1 not-italic text-sm leading-relaxed text-text-secondary">
                  {selected.pickup.street}
                  <br />
                  {selected.pickup.postalCode} {selected.pickup.city}
                  <br />
                  {selected.pickup.contactName} · {selected.pickup.contactPhone}
                </address>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-main">
                  {t("delivery.create.dropoff")}
                </h4>
                <address className="mt-1 not-italic text-sm leading-relaxed text-text-secondary">
                  {selected.dropoff.street}
                  <br />
                  {selected.dropoff.postalCode} {selected.dropoff.city}
                  <br />
                  {selected.dropoff.contactName} ·{" "}
                  {selected.dropoff.contactPhone}
                </address>
              </div>
            </section>
            {DELIVERY_PARTICIPANT_TRANSITIONS.requester[selected.status]
              .length ? (
              <div>
                <h3 className="text-base font-bold text-text-main">
                  {t("delivery.workspace.statusActions")}
                </h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {DELIVERY_PARTICIPANT_TRANSITIONS.requester[
                    selected.status
                  ].map((status) => (
                    <Button
                      key={status}
                      variant={status === "completed" ? "primary" : "secondary"}
                      isLoading={transitioning === status}
                      disabled={transitioning !== null}
                      onClick={() => void transition(selected, status)}
                    >
                      {transitionActionLabel(status, t)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <h3 className="text-base font-bold text-text-main">
                {t("delivery.workspace.applications")}
              </h3>
              <div className="mt-3 space-y-3">
                {selected.applications.length ? (
                  selected.applications.map((application) => (
                    <Card
                      as="article"
                      tone="subtle"
                      key={application.id}
                      className="flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-semibold text-text-main">
                          {application.courier.displayName}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {application.message}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {application.availabilityNote}
                        </p>
                        {application.quote && (
                          <div className="mt-2">
                            <p className="font-bold text-primary">
                              {formatPrice(
                                application.quote.amountMinor / 100,
                                {
                                  sourceCurrency: application.quote.currency,
                                },
                              )}
                            </p>
                            <p className="mt-1 max-w-lg text-xs text-text-muted">
                              {t("delivery.quoteDisclaimer")}
                            </p>
                          </div>
                        )}
                      </div>
                      {application.status === "submitted" &&
                        selected.status === "open" && (
                          <Button
                            onClick={() =>
                              setPendingSelection({
                                request: selected,
                                application,
                              })
                            }
                          >
                            {t("delivery.workspace.accept")}
                          </Button>
                        )}
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-text-muted">
                    {t("delivery.search.emptyDescription")}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => (
            <Card
              as="article"
              key={request.id}
              elevation="xs"
              className="space-y-3"
            >
              <Badge
                variant={request.status === "open" ? "primary" : "neutral"}
              >
                {statusLabel(request.status, t)}
              </Badge>
              <h2 className="text-base font-bold text-text-main">
                {request.title}
              </h2>
              <p className="text-sm text-text-secondary">
                {request.pickupLocality.city} → {request.dropoffLocality.city}
              </p>
              <Button
                variant="secondary"
                to={routes.delivery.workspace(request.id)}
              >
                {t("delivery.viewRequest")}
              </Button>
            </Card>
          ))}
        </div>
      )}
      <ConfirmModal
        isOpen={pendingSelection !== null}
        onClose={() => setPendingSelection(null)}
        onConfirm={() => void accept()}
        title={t("delivery.workspace.selectTitle")}
        message={t("delivery.workspace.selectMessage")}
        confirmText={t("delivery.workspace.confirmSelection")}
        isLoading={accepting}
      />
    </div>
  );
}

export function DeliveryCourierWorkspacePage() {
  const { t } = useTranslation(deliveryCatalogueFr);
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const toast = useToast();
  const actor = useMemo(() => actorFromUser(currentUser), [currentUser]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] =
    useState<DeliveryRequestStatus | null>(null);
  const [applications, setApplications] = useState<DeliveryApplication[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<
    DeliverySelectedCourierAssignment[]
  >([]);
  const [status, setStatus] = useState<"inactive" | "active" | "paused">(
    "inactive",
  );
  const [vehicle, setVehicle] = useState<DeliveryVehicleType>("bicycle");
  const [maxWeightKg, setMaxWeightKg] = useState("20");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [secondaryCity, setSecondaryCity] = useState("");
  const [secondaryPostalCode, setSecondaryPostalCode] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] =
    useState<DeliveryCourierEligibilityStatus | null>(null);
  const vehicles = vehicleOptions(t);
  usePageMeta({
    title: `${t("delivery.courier.title")} | Shongre`,
    description: t("delivery.courier.description"),
    canonicalPath: routes.delivery.courierWorkspace(),
    noIndex: true,
  });
  const load = useCallback(async () => {
    if (!actor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profile, ownApplications] = await Promise.all([
        services.delivery.getCourierProfile(actor, activeMarket.code),
        services.delivery.listOwnApplications(actor, activeMarket.code),
      ]);
      if (profile) {
        setStatus(profile.status === "suspended" ? "paused" : profile.status);
        setVehicle(profile.vehicleTypes[0]);
        setMaxWeightKg(String(profile.maxWeightGrams / 1_000));
        setCity(profile.serviceLocalities[0]?.city || "");
        setPostalCode(profile.serviceLocalities[0]?.postalCode || "");
        setSecondaryCity(profile.serviceLocalities[1]?.city || "");
        setSecondaryPostalCode(profile.serviceLocalities[1]?.postalCode || "");
        setNotifications(profile.opportunityNotifications);
        setEligibilityStatus(profile.eligibilityStatus);
      }
      setApplications(ownApplications);
      const assignments = await Promise.all(
        ownApplications
          .filter((application) => application.status === "accepted")
          .map((application) =>
            services.delivery
              .getPrivateRequest(
                actor,
                application.requestId,
                activeMarket.code,
              )
              .catch(() => null),
          ),
      );
      setAssignedRequests(
        assignments.filter(
          (request): request is DeliverySelectedCourierAssignment =>
            request !== null && "selectedApplication" in request,
        ),
      );
    } catch {
      setApplications([]);
      setAssignedRequests([]);
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, actor]);
  useEffect(() => void load(), [load]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actor) return;
    setSaving(true);
    try {
      const savedProfile = await services.delivery.saveCourierProfile(
        actor,
        activeMarket.code,
        {
          status,
          vehicleTypes: [vehicle],
          maxWeightGrams: Math.round(Number(maxWeightKg) * 1_000),
          serviceLocalities: [
            { city: city.trim(), postalCode: postalCode.trim() },
            ...(secondaryCity.trim() && secondaryPostalCode.trim()
              ? [
                  {
                    city: secondaryCity.trim(),
                    postalCode: secondaryPostalCode.trim(),
                  },
                ]
              : []),
          ],
          opportunityNotifications: notifications,
        },
      );
      setEligibilityStatus(savedProfile.eligibilityStatus);
      toast.success(t("delivery.courier.saved"));
    } catch {
      toast.error(t("delivery.error.generic"));
    } finally {
      setSaving(false);
    }
  };
  const transition = async (
    request: DeliverySelectedCourierAssignment,
    nextStatus: DeliveryRequestStatus,
  ) => {
    if (!actor) return;
    setTransitioning(nextStatus);
    try {
      await services.delivery.transition(
        actor,
        request.id,
        activeMarket.code,
        nextStatus,
        request.version,
      );
      toast.success(t("delivery.workspace.updated"));
      await load();
    } catch {
      toast.error(t("delivery.error.generic"));
    } finally {
      setTransitioning(null);
    }
  };
  if (loading) return <Skeleton className="h-96 w-full rounded-card" />;
  return (
    <div className="space-y-6">
      <DeliveryHeader compact />
      <Card as="section" padding="lg" className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-text-main">
            {t("delivery.courier.title")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t("delivery.courier.description")}
          </p>
        </div>
        {eligibilityStatus && eligibilityStatus !== "eligible" ? (
          <p
            className="rounded-card border border-warning-border bg-warning-surface p-4 text-sm text-warning"
            role="status"
          >
            {t(
              `delivery.courier.eligibility.${eligibilityStatus}` as MessageKey,
            )}
          </p>
        ) : null}
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
          <FormField label={t("delivery.courier.status")} required>
            <Select
              labelledByAncestor
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
              options={[
                { value: "active", label: t("delivery.courier.active") },
                { value: "paused", label: t("delivery.courier.paused") },
                { value: "inactive", label: t("delivery.courier.inactive") },
              ]}
            />
          </FormField>
          <FormField label={t("delivery.courier.vehicle")} required>
            <Select
              labelledByAncestor
              value={vehicle}
              onChange={(event) =>
                setVehicle(event.target.value as DeliveryVehicleType)
              }
              options={vehicles}
            />
          </FormField>
          <FormField label={t("delivery.courier.maxWeight")} required>
            <Input
              required
              type="number"
              min={DELIVERY_CONSTRAINTS.weightKg.min}
              max={DELIVERY_CONSTRAINTS.weightKg.max}
              step={DELIVERY_CONSTRAINTS.weightKg.step}
              value={maxWeightKg}
              onChange={(event) => setMaxWeightKg(event.target.value)}
            />
          </FormField>
          <FormField label={t("delivery.courier.primaryCity")} required>
            <Input
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </FormField>
          <FormField label={t("delivery.courier.primaryPostalCode")} required>
            <Input
              required
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
          </FormField>
          <FormField label={t("delivery.courier.secondaryCity")}>
            <Input
              value={secondaryCity}
              onChange={(event) => setSecondaryCity(event.target.value)}
            />
          </FormField>
          <FormField label={t("delivery.courier.secondaryPostalCode")}>
            <Input
              value={secondaryPostalCode}
              onChange={(event) => setSecondaryPostalCode(event.target.value)}
            />
          </FormField>
          <label className="flex min-h-control-touch items-center gap-3 text-sm font-medium text-text-main">
            <Checkbox
              checked={notifications}
              onChange={(event) => setNotifications(event.target.checked)}
            />
            {t("delivery.courier.notifications")}
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" isLoading={saving}>
              {t("delivery.courier.save")}
            </Button>
          </div>
        </form>
      </Card>
      <section>
        <h2 className="text-lg font-bold text-text-main">
          {t("delivery.courier.myApplications")}
        </h2>
        <div className="mt-3 space-y-3">
          {applications.length ? (
            applications.map((application) => (
              <Card
                as="article"
                key={application.id}
                tone="subtle"
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-text-main">
                    {application.availabilityNote}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {application.message}
                  </p>
                </div>
                <Badge
                  variant={
                    application.status === "accepted" ? "success" : "neutral"
                  }
                >
                  {application.status}
                </Badge>
              </Card>
            ))
          ) : (
            <p className="text-sm text-text-muted">
              {t("delivery.search.emptyDescription")}
            </p>
          )}
        </div>
      </section>
      {assignedRequests.length ? (
        <section>
          <h2 className="text-lg font-bold text-text-main">
            {t("delivery.courier.assignments")}
          </h2>
          <div className="mt-3 space-y-3">
            {assignedRequests.map((request) => (
              <Card
                as="article"
                key={request.id}
                tone="subtle"
                className="space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-text-main">
                      {request.title}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {request.pickup.street}, {request.pickup.city} →{" "}
                      {request.dropoff.street}, {request.dropoff.city}
                    </p>
                  </div>
                  <Badge variant="primary">
                    {statusLabel(request.status, t)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3">
                  {DELIVERY_PARTICIPANT_TRANSITIONS.courier[request.status].map(
                    (nextStatus) => (
                      <Button
                        key={nextStatus}
                        variant={
                          ["picked_up", "in_transit", "delivered"].includes(
                            nextStatus,
                          )
                            ? "primary"
                            : "secondary"
                        }
                        isLoading={transitioning === nextStatus}
                        disabled={transitioning !== null}
                        onClick={() => void transition(request, nextStatus)}
                      >
                        {transitionActionLabel(nextStatus, t)}
                      </Button>
                    ),
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
