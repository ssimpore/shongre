import { useEffect, useState } from "react";
import type { ConsentCategories } from "../domains/consent/consent.types";
import { getPublicRuntimeConfig } from "../platform/runtime-config/public-runtime-config";
import { analyticsClient } from "./analytics.client";

export function AnalyticsDebugPanel({
  categories,
}: {
  categories: ConsentCategories;
}) {
  const [version, setVersion] = useState(0);
  useEffect(
    () => analyticsClient.subscribe(() => setVersion((value) => value + 1)),
    [],
  );
  const config = getPublicRuntimeConfig();
  if (
    config.appEnvironment !== "local" &&
    config.appEnvironment !== "development"
  ) {
    return null;
  }
  const events = analyticsClient.recentEvents();
  const latest = events.at(-1);
  const providers = analyticsClient.activeProviderIds();

  return (
    <details
      className="relative mx-3 mt-3 ml-auto w-viewport-popover-max max-w-sm rounded-control border border-stone-700 bg-stone-950 p-3 text-xs text-white shadow-xl"
      data-version={version}
    >
      <summary className="cursor-pointer font-bold">
        Analytics debug · {events.length} événement
        {events.length === 1 ? "" : "s"}
      </summary>
      <dl className="mt-3 grid grid-cols-action-content gap-x-3 gap-y-1 text-micro">
        <dt className="text-stone-400">Consentement</dt>
        <dd>
          analytics={String(categories.analytics)} · marketing=
          {String(categories.marketing)}
        </dd>
        <dt className="text-stone-400">Providers</dt>
        <dd>{providers.length ? providers.join(", ") : "aucun"}</dd>
        <dt className="text-stone-400">Dernier event</dt>
        <dd>{latest?.name ?? "—"}</dd>
      </dl>
      {latest && (
        <pre className="mt-3 max-h-56 overflow-auto rounded-control bg-black p-2 text-micro leading-relaxed text-stone-200">
          {JSON.stringify(latest, null, 2)}
        </pre>
      )}
    </details>
  );
}
