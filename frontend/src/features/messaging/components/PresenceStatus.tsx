import { currentPresence, type UserPresence } from "@shongre/shared/presence";
import { PresenceIndicator } from "@shongre/ui/web";
import { useTranslation } from "../../../i18n/I18nProvider";

export function PresenceStatus({
  presence,
  lastSeen = false,
}: {
  presence?: UserPresence;
  lastSeen?: boolean;
}) {
  const { t, locale } = useTranslation();
  const value = currentPresence(presence);
  const status = value?.status ?? "unknown";
  const label = t(`messaging.presence.${status}`);
  const date = value?.lastSeenAt ? Date.parse(value.lastSeenAt) : NaN;
  const description =
    lastSeen &&
    status !== "online" &&
    status !== "unknown" &&
    Number.isFinite(date)
      ? t("messaging.presence.lastSeen", {
          date: new Intl.DateTimeFormat(locale, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(date),
        })
      : null;
  return (
    <span
      className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-micro text-text-supporting"
      data-presence-status={status}
    >
      <PresenceIndicator status={status} label={label} decorative />
      <span>{label}</span>
      {description && <span>{description}</span>}
    </span>
  );
}
