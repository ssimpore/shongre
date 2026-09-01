import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DIGITAL_ACCESS_REPORT_DESCRIPTION_MAX_LENGTH,
  type DigitalEntitlementProjection,
  type DigitalEntitlementStatus,
} from "@shongre/contracts/digital-products";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileKey2,
  LoaderCircle,
} from "lucide-react";
import { services } from "../../api/client/service-registry";
import type {
  ConsumedDigitalAccess,
  DigitalAccessReportType,
} from "../../api/contracts/digital-products.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { Badge, Button, Skeleton } from "../../design-system";
import { Textarea } from "../../design-system/primitives/FormField";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { digitalMessagesFr } from "../../i18n/digital.catalogue.fr";

type RevealResult = Extract<
  ConsumedDigitalAccess,
  { kind: "EXTERNAL_LINK" | "CREDENTIALS" }
>;

const STATUS_KEYS: Record<
  DigitalEntitlementStatus,
  | "digital.purchases.paymentPending"
  | "digital.purchases.paymentFailed"
  | "digital.purchases.processing"
  | "digital.purchases.provisioning"
  | "digital.purchases.available"
  | "digital.purchases.unavailable"
  | "digital.purchases.expired"
  | "digital.purchases.revoked"
  | "digital.purchases.limitReached"
  | "digital.purchases.disputed"
  | "digital.purchases.refunded"
> = {
  PAYMENT_PENDING: "digital.purchases.paymentPending",
  PAYMENT_FAILED: "digital.purchases.paymentFailed",
  PAYMENT_CANCELLED: "digital.purchases.paymentFailed",
  FULFILLMENT_PROCESSING: "digital.purchases.processing",
  PROVISIONING: "digital.purchases.provisioning",
  PROVISIONING_FAILED: "digital.purchases.unavailable",
  ACCESS_AVAILABLE: "digital.purchases.available",
  DELIVERED: "digital.purchases.available",
  INVALID_ACCESS: "digital.purchases.unavailable",
  QUARANTINED: "digital.purchases.unavailable",
  LIMIT_REACHED: "digital.purchases.limitReached",
  RESET_REQUESTED: "digital.purchases.processing",
  REPLACEMENT_REQUESTED: "digital.purchases.processing",
  EXPIRED: "digital.purchases.expired",
  REFUND_REQUESTED: "digital.purchases.processing",
  PARTIALLY_REFUNDED: "digital.purchases.refunded",
  REFUNDED: "digital.purchases.refunded",
  DISPUTED: "digital.purchases.disputed",
  REVOKED: "digital.purchases.revoked",
  UNAVAILABLE: "digital.purchases.unavailable",
};

const isAvailable = (entitlement: DigitalEntitlementProjection) =>
  entitlement.paymentStatus === "CONFIRMED" &&
  ["ACCESS_AVAILABLE", "DELIVERED"].includes(entitlement.status);

export const DigitalPurchasesPage: React.FC = () => {
  const { t } = useTranslation(digitalMessagesFr);
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  usePageMeta({
    title: t("meta.digitalPurchases.title"),
    description: t("meta.digitalPurchases.description"),
    canonicalPath: "/compte/achats-numeriques",
    noIndex: true,
  });

  const [items, setItems] = useState<DigitalEntitlementProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, RevealResult>>({});
  const [leaving, setLeaving] = useState<RevealResult | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(false);
    setRevealed({});
    setLeaving(null);
    try {
      setItems(
        await services.digitalProducts.listEntitlements(
          activeMarket.code,
          currentUser.id,
        ),
      );
    } catch {
      setItems([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, currentUser?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (
    entitlement: DigitalEntitlementProjection,
    assetId?: string,
  ) => {
    if (!currentUser?.id) return;
    setBusyId(entitlement.id);
    try {
      const grant = assetId
        ? await services.digitalProducts.createDownloadGrant(
            activeMarket.code,
            currentUser.id,
            entitlement.id,
            assetId,
          )
        : await services.digitalProducts.createRevealGrant(
            activeMarket.code,
            currentUser.id,
            entitlement.id,
          );
      const access = await services.digitalProducts.consumeAccessGrant(
        currentUser.id,
        grant.id,
      );
      if (access.kind === "DOWNLOAD") {
        if (!access.simulated) {
          const anchor = document.createElement("a");
          anchor.href = access.url;
          anchor.download = access.fileName;
          anchor.rel = "noopener noreferrer";
          anchor.style.display = "none";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        }
      } else if (access.kind === "EXTERNAL_LINK") {
        setLeaving(access);
      } else {
        setRevealed((current) => ({
          ...current,
          [entitlement.id]: access,
        }));
      }
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const mask = (entitlementId: string) => {
    setRevealed((current) => {
      const next = { ...current };
      delete next[entitlementId];
      return next;
    });
    setCopied(null);
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  };

  const submitReport = async (entitlementId: string) => {
    if (!currentUser?.id || reportText.trim().length < 10) return;
    setBusyId(entitlementId);
    try {
      const type: DigitalAccessReportType = "INVALID_CREDENTIALS";
      await services.digitalProducts.reportInvalidAccess(
        activeMarket.code,
        currentUser.id,
        entitlementId,
        type,
        reportText.trim(),
      );
      setReportText("");
      setReportingId(null);
      setReportSent(entitlementId);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const hasSimulatedItems = useMemo(
    () => items.some((item) => item.simulated),
    [items],
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-2 text-primary">
          <FileKey2 className="h-icon-md w-icon-md" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {t("digital.common.title")}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-black text-text-main">
          {t("digital.purchases.title")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">
          {t("digital.purchases.description")}
        </p>
        {hasSimulatedItems ? (
          <Badge variant="warning" className="mt-3">
            {t("digital.common.simulated")}
          </Badge>
        ) : null}
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger-border bg-danger-surface p-4"
        >
          <p className="text-sm font-bold text-danger">
            {t("digital.common.error")}
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => void load()}
          >
            {t("digital.common.retry")}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div
          className="grid gap-4 lg:grid-cols-2"
          aria-label={t("digital.common.loading")}
        >
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border-base bg-bg-surface p-8 text-center text-sm text-text-secondary">
          {t("digital.common.empty")}
        </div>
      ) : (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const access = revealed[item.id];
            const available = isAvailable(item);
            return (
              <article
                key={item.id}
                className="min-h-64 min-w-0 rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs"
              >
                <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words font-black text-text-main">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs text-text-secondary">
                      {t("digital.purchases.version", {
                        version: item.productVersion,
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={available ? "success" : "neutral"}
                    className="max-w-full shrink whitespace-normal text-left leading-snug"
                  >
                    {t(STATUS_KEYS[item.status])}
                  </Badge>
                </div>

                <p className="mt-3 text-xs font-bold text-text-secondary">
                  {t("digital.common.noShipping")}
                </p>

                <div className="mt-4 space-y-2" aria-live="polite">
                  {available && item.primaryFulfillmentType === "FILE_DOWNLOAD"
                    ? item.files.map((file) => (
                        <Button
                          key={file.id}
                          variant="secondary"
                          disabled={
                            busyId === item.id || file.status !== "READY"
                          }
                          isLoading={busyId === item.id}
                          leftIcon={
                            <Download
                              className="h-icon-sm w-icon-sm"
                              aria-hidden="true"
                            />
                          }
                          onClick={() => void act(item, file.id)}
                        >
                          {t("digital.purchases.download")}
                        </Button>
                      ))
                    : null}

                  {available &&
                  item.primaryFulfillmentType !== "FILE_DOWNLOAD" ? (
                    <Button
                      variant="secondary"
                      disabled={busyId === item.id}
                      isLoading={busyId === item.id}
                      leftIcon={
                        <Eye
                          className="h-icon-sm w-icon-sm"
                          aria-hidden="true"
                        />
                      }
                      onClick={() => void act(item)}
                    >
                      {item.primaryFulfillmentType === "ACCESS_LINK"
                        ? t("digital.purchases.open")
                        : t("digital.purchases.reveal")}
                    </Button>
                  ) : null}

                  {item.status === "PROVISIONING" ? (
                    <div
                      className="flex items-center gap-2 rounded-xl bg-warning-surface p-3 text-sm text-warning"
                      role="status"
                    >
                      <LoaderCircle
                        className="h-icon-sm w-icon-sm animate-spin"
                        aria-hidden="true"
                      />
                      {t("digital.purchases.provisioning")}
                    </div>
                  ) : null}

                  {access ? (
                    <div className="space-y-3 rounded-xl border border-border-base bg-bg-base p-4">
                      {access.fields.map((field, index) => {
                        const key = `${item.id}:${index}`;
                        return (
                          <div key={key}>
                            <div className="text-xs font-bold text-text-secondary">
                              {field.label}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <code className="min-w-0 flex-1 overflow-hidden text-ellipsis rounded-lg bg-bg-surface px-3 py-2 text-sm">
                                {field.value}
                              </code>
                              <Button
                                variant="ghost"
                                aria-label={t("digital.purchases.copy")}
                                onClick={() => void copy(key, field.value)}
                                leftIcon={
                                  copied === key ? (
                                    <Check className="h-icon-sm w-icon-sm" />
                                  ) : (
                                    <Copy className="h-icon-sm w-icon-sm" />
                                  )
                                }
                              >
                                {copied === key
                                  ? t("digital.purchases.copied")
                                  : t("digital.purchases.copy")}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {access.instructions.map((instruction) => (
                        <p
                          key={instruction}
                          className="text-sm text-text-secondary"
                        >
                          {instruction}
                        </p>
                      ))}
                      <Button
                        variant="ghost"
                        leftIcon={
                          <EyeOff
                            className="h-icon-sm w-icon-sm"
                            aria-hidden="true"
                          />
                        }
                        onClick={() => mask(item.id)}
                      >
                        {t("digital.purchases.mask")}
                      </Button>
                    </div>
                  ) : null}

                  {reportSent === item.id ? (
                    <p
                      className="flex items-center gap-2 text-sm text-success"
                      role="status"
                    >
                      <Check
                        className="h-icon-sm w-icon-sm"
                        aria-hidden="true"
                      />
                      {t("digital.purchases.reportSent")}
                    </p>
                  ) : item.supportAvailable ? (
                    <Button
                      variant="ghost"
                      leftIcon={
                        <AlertTriangle
                          className="h-icon-sm w-icon-sm"
                          aria-hidden="true"
                        />
                      }
                      onClick={() => {
                        setReportingId(item.id);
                        setReportText("");
                      }}
                    >
                      {t("digital.purchases.report")}
                    </Button>
                  ) : null}

                  {reportingId === item.id ? (
                    <div className="space-y-2 rounded-xl border border-border-base p-3">
                      <p className="text-xs text-text-secondary">
                        {t("digital.purchases.reportDescription")}
                      </p>
                      <Textarea
                        value={reportText}
                        onChange={(event) => setReportText(event.target.value)}
                        maxLength={DIGITAL_ACCESS_REPORT_DESCRIPTION_MAX_LENGTH}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          disabled={
                            reportText.trim().length < 10 || busyId === item.id
                          }
                          isLoading={busyId === item.id}
                          onClick={() => void submitReport(item.id)}
                        >
                          {t("digital.purchases.reportSubmit")}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setReportingId(null)}
                        >
                          {t("digital.purchases.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {leaving ? (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="digital-leaving-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-bg-surface p-6 shadow-xl">
            <ExternalLink className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2
              id="digital-leaving-title"
              className="mt-3 text-xl font-black text-text-main"
            >
              {t("digital.purchases.leaveTitle")}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {t("digital.purchases.leaveDescription")}
            </p>
            <p className="mt-3 rounded-lg bg-bg-base p-3 font-mono text-sm">
              {leaving.destinationDomain}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setLeaving(null)}>
                {t("digital.purchases.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (leaving.destinationUrl) {
                    window.open(
                      leaving.destinationUrl,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                  setLeaving(null);
                }}
              >
                {t("digital.purchases.continue")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
