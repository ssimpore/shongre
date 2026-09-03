import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  Pause,
  Play,
  Search,
  Store,
  Tag,
  Trash2,
} from "lucide-react";
import type {
  WatchChannels,
  WatchFrequency,
  WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button, EmptyState } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import { formatRelativeDate } from "../../utilities/formatters";

const frequencyLabelKeys: Record<WatchFrequency, MessageKey> = {
  immediate: "watch.frequency.immediate",
  daily: "watch.frequency.daily",
  weekly: "watch.frequency.weekly",
};

const typePresentation = {
  listing_price: { labelKey: "watch.type.listingPrice", icon: Tag },
  seller: { labelKey: "watch.type.seller", icon: Store },
  saved_search: { labelKey: "watch.type.savedSearch", icon: Search },
} as const;

export const WatchSubscriptionsPage = () => {
  const { t, locale } = useTranslation();
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const toast = useToast();
  const [items, setItems] = useState<WatchSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  usePageMeta({
    title: t("watch.meta.title"),
    description: t("watch.meta.description"),
    canonicalPath: "/compte/alertes",
    noIndex: true,
  });

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      setItems(
        await services.watchSubscriptions.list(
          currentUser.id,
          activeMarket.code,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("watch.error.loading"),
      );
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, currentUser, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (
    item: WatchSubscription,
    changes: Parameters<typeof services.watchSubscriptions.update>[3],
  ) => {
    if (!currentUser) return;
    setPendingId(item.id);
    try {
      const next = await services.watchSubscriptions.update(
        currentUser.id,
        activeMarket.code,
        item.id,
        changes,
      );
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === next.id ? next : candidate,
        ),
      );
      toast.success(t("watch.feedback.updated"));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : t("watch.error.updating"),
      );
    } finally {
      setPendingId(null);
    }
  };

  const toggleChannel = (
    item: WatchSubscription,
    channel: keyof WatchChannels,
  ) => {
    const channels = {
      ...item.channels,
      [channel]: !item.channels[channel],
    };
    if (!Object.values(channels).some(Boolean)) {
      toast.info(t("watch.feedback.channelRequired"));
      return;
    }
    void update(item, { channels });
  };

  const remove = async (item: WatchSubscription) => {
    if (!currentUser) return;
    setPendingId(item.id);
    try {
      await services.watchSubscriptions.remove(
        currentUser.id,
        activeMarket.code,
        item.id,
      );
      setItems((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
      toast.info(t("watch.feedback.removed"));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : t("watch.error.removing"),
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6" data-watch-subscriptions-page>
      <header>
        <h1 className="text-xl font-black text-stone-900 sm:text-2xl">
          {t("watch.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t("watch.description", { market: activeMarket.name })}
        </p>
      </header>

      {loading ? (
        <div
          className="space-y-3"
          role="status"
          aria-busy="true"
          aria-label={t("common.loading")}
        >
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-card border border-border-base bg-bg-subtle"
            />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<BellRing className="h-10 w-10 text-stone-400" />}
          title={t("watch.error.title")}
          description={error}
          action={
            <Button onClick={() => void load()}>{t("common.retry")}</Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BellRing className="h-10 w-10 text-stone-400" />}
          title={t("watch.empty.title")}
          description={t("watch.empty.description")}
          action={<Button to="/recherche">{t("watch.empty.action")}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const presentation = typePresentation[item.targetType];
            const Icon = presentation.icon;
            const pending = pendingId === item.id;
            return (
              <article
                key={item.id}
                className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs sm:p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-light text-primary">
                      <Icon
                        className="h-icon-lg w-icon-lg"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary">
                        {t(presentation.labelKey)}
                      </p>
                      <h2 className="truncate text-sm font-black text-stone-900">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.status === "paused"
                          ? t("watch.status.paused")
                          : t("watch.status.active")}
                        {item.lastNotifiedAt
                          ? ` · ${t("watch.lastNotified")} ${formatRelativeDate(item.lastNotifiedAt, locale)}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`frequency-${item.id}`}>
                      {t("watch.frequency.label")}
                    </label>
                    <select
                      id={`frequency-${item.id}`}
                      value={item.frequency}
                      disabled={pending}
                      onChange={(event) =>
                        void update(item, {
                          frequency: event.target.value as WatchFrequency,
                        })
                      }
                      className="min-h-control-sm rounded-control border border-border-base bg-white px-3 text-xs font-semibold text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {Object.entries(frequencyLabelKeys).map(
                        ([value, labelKey]) => (
                          <option key={value} value={value}>
                            {t(labelKey)}
                          </option>
                        ),
                      )}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      leftIcon={
                        item.status === "active" ? (
                          <Pause className="h-icon-sm w-icon-sm" />
                        ) : (
                          <Play className="h-icon-sm w-icon-sm" />
                        )
                      }
                      onClick={() =>
                        void update(item, {
                          status:
                            item.status === "active" ? "paused" : "active",
                        })
                      }
                    >
                      {item.status === "active"
                        ? t("watch.action.pause")
                        : t("watch.action.resume")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      aria-label={`${t("watch.action.remove")} · ${item.title}`}
                      onClick={() => void remove(item)}
                      className="text-danger"
                    >
                      <Trash2 className="h-icon-md w-icon-md" />
                    </Button>
                  </div>
                </div>

                <fieldset className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                  <legend className="sr-only">
                    {t("watch.channels.label")}
                  </legend>
                  {(
                    [
                      ["inApp", t("watch.channel.inApp")],
                      ["email", t("watch.channel.email")],
                      ["push", t("watch.channel.push")],
                    ] as const
                  ).map(([channel, label]) => (
                    <label
                      key={channel}
                      className="flex min-h-control-sm cursor-pointer items-center gap-2 rounded-control border border-border-base bg-bg-subtle px-3 text-xs font-semibold text-stone-700"
                    >
                      <input
                        type="checkbox"
                        checked={item.channels[channel]}
                        disabled={pending}
                        onChange={() => toggleChannel(item, channel)}
                        className="h-4 w-4 accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
