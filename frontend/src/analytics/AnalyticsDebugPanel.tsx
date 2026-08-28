import { useEffect, useState } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
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
      className="group relative shrink-0 text-xs text-white"
      data-version={version}
    >
      <summary
        className="flex h-7 cursor-pointer list-none items-center gap-1.5 whitespace-nowrap rounded-md border border-stone-700 bg-stone-800 px-2 font-semibold text-white transition-colors hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden"
        aria-label={`Ouvrir le diagnostic Analytics, ${events.length} événement${events.length === 1 ? "" : "s"}`}
      >
        <BarChart3
          className="h-icon-sm w-icon-sm text-stone-400"
          aria-hidden="true"
        />
        <span className="hidden lg:inline">Analytics</span>
        <span className="text-stone-500" aria-hidden="true">
          ·
        </span>
        <span className="tabular-nums">{events.length}</span>
        <ChevronDown
          className="h-icon-xs w-icon-xs text-stone-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="fixed inset-x-3 top-9 z-popover w-auto rounded-control border border-stone-700 bg-stone-950 p-3 shadow-dropdown sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-viewport-popover-max">
        <p className="font-bold">Diagnostic Analytics</p>
        <dl className="mt-3 grid grid-cols-action-content gap-x-3 gap-y-1 text-micro">
          <dt className="text-stone-400">Consentement</dt>
          <dd>
            analytics={String(categories.analytics)} · marketing=
            {String(categories.marketing)}
          </dd>
          <dt className="text-stone-400">Providers</dt>
          <dd>{providers.length ? providers.join(", ") : "aucun"}</dd>
          <dt className="text-stone-400">Dernier événement</dt>
          <dd>{latest?.name ?? "—"}</dd>
        </dl>
        {latest && (
          <pre className="mt-3 max-h-56 overflow-auto rounded-control bg-black p-2 text-micro leading-relaxed text-stone-200">
            {JSON.stringify(latest, null, 2)}
          </pre>
        )}
      </div>
    </details>
  );
}
