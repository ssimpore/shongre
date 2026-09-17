import React, { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { services } from "../../../api/client/service-registry";
import { useToast } from "../../../app/providers/ToastProvider";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";
import {
  currentWebPushSubscription,
  subscribeWebPush,
  unsubscribeWebPush,
  webPushSupport,
} from "../../../platform/notifications/web-push";

type PanelState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "unsupported" }
  | { kind: "denied" }
  | { kind: "off"; publicKey: string }
  | { kind: "on" };

/**
 * Push on this browser. The per-category push preferences decide *what* is
 * pushed; this decides whether this browser is a device at all. The state
 * shown is the browser's own subscription, re-read on every visit.
 */
export const WebPushDevicePanel: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const support = webPushSupport();
      if (support === "unsupported") {
        setState({ kind: "unsupported" });
        return;
      }
      try {
        const config = await services.notifications.getWebPushConfig();
        if (cancelled) return;
        if (!config.enabled || !config.publicKey) {
          setState({ kind: "unavailable" });
          return;
        }
        if (support === "denied") {
          setState({ kind: "denied" });
          return;
        }
        const existing = await currentWebPushSubscription();
        if (cancelled) return;
        setState(
          existing
            ? { kind: "on" }
            : { kind: "off", publicKey: config.publicKey },
        );
      } catch {
        if (!cancelled) setState({ kind: "unavailable" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async (publicKey: string) => {
    setIsBusy(true);
    try {
      const subscription = await subscribeWebPush(publicKey);
      if (!subscription) {
        setState(
          webPushSupport() === "denied"
            ? { kind: "denied" }
            : { kind: "off", publicKey },
        );
        return;
      }
      await services.notifications.registerWebPushDevice(subscription);
      setState({ kind: "on" });
      toast.success(t("notifications.webPush.enabledToast"));
    } catch {
      toast.error(t("notifications.webPush.error"));
    } finally {
      setIsBusy(false);
    }
  };

  const disable = async () => {
    setIsBusy(true);
    try {
      const subscription = await unsubscribeWebPush();
      if (subscription) {
        await services.notifications.unregisterWebPushDevice(subscription);
      }
      const config = await services.notifications.getWebPushConfig();
      setState(
        config.enabled && config.publicKey
          ? { kind: "off", publicKey: config.publicKey }
          : { kind: "unavailable" },
      );
      toast.success(t("notifications.webPush.disabledToast"));
    } catch {
      toast.error(t("notifications.webPush.error"));
    } finally {
      setIsBusy(false);
    }
  };

  if (state.kind === "loading" || state.kind === "unavailable") return null;

  return (
    <section
      aria-labelledby="web-push-device-heading"
      data-web-push-device={state.kind}
      className="bg-bg-surface rounded-3xl border border-border-base p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        {state.kind === "on" ? (
          <BellRing className="w-icon-lg h-icon-lg text-primary shrink-0 mt-0.5" />
        ) : (
          <BellOff className="w-icon-lg h-icon-lg text-text-tertiary shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <h2
            id="web-push-device-heading"
            className="text-sm font-bold text-text-main"
          >
            {t("notifications.webPush.title")}
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            {state.kind === "on"
              ? t("notifications.webPush.on")
              : state.kind === "denied"
                ? t("notifications.webPush.denied")
                : state.kind === "unsupported"
                  ? t("notifications.webPush.unsupported")
                  : t("notifications.webPush.off")}
          </p>
        </div>
      </div>
      {state.kind === "on" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          isLoading={isBusy}
          onClick={() => void disable()}
        >
          {t("notifications.webPush.disable")}
        </Button>
      )}
      {state.kind === "off" && (
        <Button
          type="button"
          size="sm"
          isLoading={isBusy}
          onClick={() => void enable(state.publicKey)}
        >
          {t("notifications.webPush.enable")}
        </Button>
      )}
    </section>
  );
};
