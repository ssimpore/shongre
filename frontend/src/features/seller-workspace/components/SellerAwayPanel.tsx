import React, { useState } from "react";
import { CalendarOff, CalendarCheck } from "lucide-react";
import { services } from "../../../api/client/service-registry";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useToast } from "../../../app/providers/ToastProvider";
import { Button } from "../../../design-system/primitives/Button";
import { FormField, Input } from "../../../design-system/primitives/FormField";
import { useTranslation } from "../../../i18n/I18nProvider";
import { sellerCatalogueFr } from "../../../i18n/seller.catalogue.fr";
import { useRegionalFormatters } from "../../../hooks/useRegionalFormatters";

const AWAY_MESSAGE_MAX_LENGTH = 300;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `date` inputs speak the visitor's wall clock; the API gets an instant. */
function toDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The seller's absence: pauses every publication until the return date and
 * tells buyers so on the profile, the listings and in conversations. Ending
 * it early resumes everything at once.
 */
export const SellerAwayPanel: React.FC = () => {
  const { t } = useTranslation(sellerCatalogueFr);
  const toast = useToast();
  const { currentUser, refreshUser } = useAuth();
  const { formatDate } = useRegionalFormatters();
  const [isOpen, setIsOpen] = useState(false);
  const [until, setUntil] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const awayUntil = currentUser?.awayUntil;
  const isAway = Boolean(awayUntil && Date.parse(awayUntil) > Date.now());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!until) return;
    setIsSaving(true);
    try {
      // The return happens at the end of the chosen day, in the seller's zone.
      const returnAt = new Date(`${until}T23:59:59`);
      const state = await services.auth.setAwayMode({
        until: returnAt.toISOString(),
        ...(message.trim() ? { message: message.trim() } : {}),
      });
      await refreshUser();
      setIsOpen(false);
      toast.success(
        t("sellerworkspace.away.enabledToast", {
          count: state.pausedPublications ?? 0,
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t("sellerworkspace.away.error"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const end = async () => {
    setIsSaving(true);
    try {
      const state = await services.auth.setAwayMode({ until: null });
      await refreshUser();
      toast.success(
        t("sellerworkspace.away.endedToast", {
          count: state.resumedPublications ?? 0,
        }),
      );
    } catch {
      toast.error(t("sellerworkspace.away.error"));
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return null;

  return (
    <section
      aria-labelledby="seller-away-heading"
      data-seller-away-panel={isAway ? "away" : "available"}
      className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${
        isAway
          ? "border-warning-border bg-warning-surface"
          : "border-border-base bg-bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {isAway ? (
            <CalendarOff className="w-icon-lg h-icon-lg text-warning shrink-0 mt-0.5" />
          ) : (
            <CalendarCheck className="w-icon-lg h-icon-lg text-primary shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <h2
              id="seller-away-heading"
              className="text-sm font-bold text-text-main"
            >
              {isAway
                ? t("sellerworkspace.away.activeTitle", {
                    date: formatDate(awayUntil!, {
                      day: "numeric",
                      month: "long",
                    }),
                  })
                : t("sellerworkspace.away.title")}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {isAway
                ? currentUser.awayMessage ||
                  t("sellerworkspace.away.activeDescription")
                : t("sellerworkspace.away.description")}
            </p>
          </div>
        </div>
        {isAway ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            isLoading={isSaving}
            onClick={() => void end()}
          >
            {t("sellerworkspace.away.end")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
          >
            {t("sellerworkspace.away.start")}
          </Button>
        )}
      </div>

      {!isAway && isOpen && (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <FormField
            label={t("sellerworkspace.away.untilLabel")}
            required
            hint={t("sellerworkspace.away.untilHint")}
          >
            <Input
              type="date"
              required
              value={until}
              min={toDateInput(new Date(Date.now() + DAY_MS))}
              max={toDateInput(new Date(Date.now() + 90 * DAY_MS))}
              onChange={(event) => setUntil(event.target.value)}
            />
          </FormField>
          <FormField
            label={t("sellerworkspace.away.messageLabel")}
            hint={t("sellerworkspace.away.messageHint", {
              count: message.length,
              max: AWAY_MESSAGE_MAX_LENGTH,
            })}
          >
            <Input
              value={message}
              maxLength={AWAY_MESSAGE_MAX_LENGTH}
              placeholder={t("sellerworkspace.away.messagePlaceholder")}
              onChange={(event) => setMessage(event.target.value)}
            />
          </FormField>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              isLoading={isSaving}
              disabled={!until}
            >
              {t("sellerworkspace.away.confirm")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};
