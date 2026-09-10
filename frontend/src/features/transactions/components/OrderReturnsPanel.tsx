import React, { useCallback, useEffect, useState } from "react";
import { PackageCheck, Undo2 } from "lucide-react";
import { services } from "../../../api/client/service-registry";
import type {
  OrderReturn,
  OrderReturnReason,
} from "../../../api/contracts/orders.contract";
import { Button } from "../../../design-system/primitives/Button";
import { FormField, Input, Textarea } from "../../../design-system";
import { useTranslation } from "../../../i18n/I18nProvider";
import { ORDER_RETURN_CONSTRAINTS } from "@shongre/contracts/orders";

/** Order states from which a return can still be asked for. */
const RETURNABLE_STATUSES = new Set([
  "escrow_funded",
  "payment_escrowed",
  "shipped",
  "pin_pending",
  "completed",
  "disputed",
]);

const REASONS: readonly OrderReturnReason[] = [
  "withdrawal",
  "damaged",
  "not_as_described",
  "wrong_item",
  "missing_parts",
  "other",
];

/** A return still waiting on somebody. */
const OPEN_STATUSES = new Set<OrderReturn["status"]>([
  "requested",
  "approved",
  "shipped",
  "received",
]);

export interface OrderReturnsPanelProps {
  orderId: string;
  orderStatus: string;
  isBuyer: boolean;
  isSeller: boolean;
  onChanged?: () => void;
}

/**
 * The return conversation for one order.
 *
 * Both sides read the same panel, because a return is a sequence they take
 * turns in: the buyer asks, the seller answers, the buyer ships, the seller
 * confirms and the refund follows. Showing one side's view of it made the
 * other side's next step invisible.
 */
export const OrderReturnsPanel: React.FC<OrderReturnsPanelProps> = ({
  orderId,
  orderStatus,
  isBuyer,
  isSeller,
  onChanged,
}) => {
  const { t } = useTranslation();
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [reason, setReason] = useState<OrderReturnReason>("not_as_described");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setReturns(await services.orders.listReturns(orderId));
    } catch {
      // A read failure leaves the panel empty rather than blocking the modal;
      // the actions below surface their own errors.
      setReturns([]);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError("");
    try {
      await action();
      await load();
      onChanged?.();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("orders.returns.failed"),
      );
    } finally {
      setBusy(null);
    }
  };

  const open = returns.find((entry) => OPEN_STATUSES.has(entry.status));
  const canRequest = isBuyer && !open && RETURNABLE_STATUSES.has(orderStatus);

  if (!isBuyer && !isSeller) return null;
  if (!open && !canRequest && returns.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border-disabled bg-bg-subtle p-4"
      aria-labelledby={`returns-${orderId}`}
    >
      <div className="flex items-center gap-2">
        <Undo2
          className="h-icon-sm w-icon-sm text-text-secondary"
          aria-hidden="true"
        />
        <h3
          id={`returns-${orderId}`}
          className="text-sm font-bold text-text-deep"
        >
          {t("orders.returns.title")}
        </h3>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {returns.map((entry) => (
        <div
          key={entry.id}
          className="mt-3 border-t border-border-soft pt-3 first-of-type:border-t-0 first-of-type:pt-0"
        >
          <p className="text-xs font-semibold text-text-deep">
            {t(`orders.returns.status.${entry.status}`)}
            {entry.isStatutoryWithdrawal
              ? ` · ${t("orders.returns.statutory")}`
              : ""}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{entry.details}</p>
          {entry.decisionNote ? (
            <p className="mt-1 text-xs text-text-tertiary">
              {t("orders.returns.sellerNote")}: {entry.decisionNote}
            </p>
          ) : null}

          {isSeller && entry.status === "requested" ? (
            <div className="mt-3 space-y-2">
              {!entry.isStatutoryWithdrawal ? (
                <FormField
                  label={t("orders.returns.noteLabel")}
                  htmlFor={`return-note-${entry.id}`}
                >
                  <Input
                    id={`return-note-${entry.id}`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={ORDER_RETURN_CONSTRAINTS.decisionNoteMaxLength}
                  />
                </FormField>
              ) : (
                <p className="text-xs text-text-tertiary">
                  {t("orders.returns.statutoryNotice")}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={busy === `approve-${entry.id}`}
                  onClick={() =>
                    void run(`approve-${entry.id}`, () =>
                      services.orders.decideReturn(entry.id, {
                        approve: true,
                      }),
                    )
                  }
                >
                  {t("orders.returns.approve")}
                </Button>
                {!entry.isStatutoryWithdrawal ? (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={busy === `reject-${entry.id}`}
                    onClick={() =>
                      void run(`reject-${entry.id}`, () =>
                        services.orders.decideReturn(entry.id, {
                          approve: false,
                          note,
                        }),
                      )
                    }
                  >
                    {t("orders.returns.reject")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {isBuyer && entry.status === "approved" ? (
            <div className="mt-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <FormField
                  label={t("orders.returns.carrier")}
                  htmlFor={`return-carrier-${entry.id}`}
                >
                  <Input
                    id={`return-carrier-${entry.id}`}
                    value={carrierName}
                    onChange={(event) => setCarrierName(event.target.value)}
                    maxLength={ORDER_RETURN_CONSTRAINTS.carrierNameMaxLength}
                  />
                </FormField>
                <FormField
                  label={t("orders.returns.tracking")}
                  htmlFor={`return-tracking-${entry.id}`}
                >
                  <Input
                    id={`return-tracking-${entry.id}`}
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    maxLength={ORDER_RETURN_CONSTRAINTS.trackingNumberMaxLength}
                  />
                </FormField>
              </div>
              <Button
                size="sm"
                variant="primary"
                isLoading={busy === `ship-${entry.id}`}
                onClick={() =>
                  void run(`ship-${entry.id}`, () =>
                    services.orders.markReturnShipped(entry.id, {
                      carrierName,
                      trackingNumber,
                    }),
                  )
                }
              >
                {t("orders.returns.markShipped")}
              </Button>
            </div>
          ) : null}

          {isSeller && ["approved", "shipped"].includes(entry.status) ? (
            <Button
              className="mt-3"
              size="sm"
              variant="primary"
              leftIcon={<PackageCheck className="h-icon-sm w-icon-sm" />}
              isLoading={busy === `receive-${entry.id}`}
              onClick={() =>
                void run(`receive-${entry.id}`, () =>
                  services.orders.confirmReturnReceived(entry.id),
                )
              }
            >
              {t("orders.returns.confirmReceived")}
            </Button>
          ) : null}
        </div>
      ))}

      {canRequest ? (
        <form
          className="mt-3 space-y-2 border-t border-border-soft pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run("request", () =>
              services.orders.requestReturn(orderId, { reason, details }),
            );
          }}
        >
          <FormField
            label={t("orders.returns.reasonLabel")}
            htmlFor={`return-reason-${orderId}`}
          >
            <select
              id={`return-reason-${orderId}`}
              className="w-full rounded-control border border-border-base bg-bg-surface px-3 py-2 text-sm text-text-deep h-control-touch"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as OrderReturnReason)
              }
            >
              {/*
                Every reason is offered because whether the withdrawal right
                applies depends on who sold, and that is the server's decision
                to make. A refusal comes back naming the alternative.
              */}
              {REASONS.map((value) => (
                <option key={value} value={value}>
                  {t(`orders.returns.reason.${value}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t("orders.returns.detailsLabel")}
            htmlFor={`return-details-${orderId}`}
            hint={t("orders.returns.detailsHint")}
          >
            <Textarea
              id={`return-details-${orderId}`}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              minLength={ORDER_RETURN_CONSTRAINTS.detailsMinLength}
              maxLength={ORDER_RETURN_CONSTRAINTS.detailsMaxLength}
              rows={3}
              required
            />
          </FormField>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            isLoading={busy === "request"}
            disabled={
              details.trim().length < ORDER_RETURN_CONSTRAINTS.detailsMinLength
            }
          >
            {t("orders.returns.request")}
          </Button>
        </form>
      ) : null}
    </section>
  );
};
