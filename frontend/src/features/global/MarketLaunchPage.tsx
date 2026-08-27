import { ArrowLeft, Clock3 } from "lucide-react";
import type { CountryConfig } from "@shongre/contracts";
import { EarlyAccessSignup } from "./EarlyAccessSignup";

export function MarketLaunchPage({
  country,
  gatewayHref,
}: {
  country: CountryConfig;
  gatewayHref: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-stone-950">
      <header className="border-b border-border-base">
        <div className="mx-auto flex h-16 w-full max-w-page items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href={gatewayHref}
            className="text-xl font-extrabold uppercase tracking-tight"
          >
            Shongre<span className="text-primary">.</span>
          </a>
          <span className="text-2xl" aria-hidden="true">
            {country.flag}
          </span>
        </div>
      </header>
      <main id="main-content" className="flex flex-1 items-center">
        <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Clock3 className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">
            {country.launchContent.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-600">
            {country.launchContent.description}
          </p>
          <dl className="mx-auto mt-8 grid max-w-xl grid-cols-2 border-y border-border-base py-5 text-left text-xs sm:grid-cols-4">
            <div>
              <dt className="text-stone-500">Pays</dt>
              <dd className="mt-1 font-bold">{country.name}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Langue</dt>
              <dd className="mt-1 font-bold">{country.defaultLocale}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Devise</dt>
              <dd className="mt-1 font-bold">{country.currency}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Fuseau</dt>
              <dd className="mt-1 font-bold">{country.timezone}</dd>
            </div>
          </dl>
          {country.launchContent.earlyAccessEnabled && (
            <EarlyAccessSignup
              marketCode={country.code}
              locale={country.defaultLocale}
            />
          )}
          <a
            href={gatewayHref}
            className="mt-8 inline-flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-4 text-sm font-bold hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowLeft className="h-icon-md w-icon-md" aria-hidden="true" />
            Choisir un autre pays
          </a>
        </section>
      </main>
    </div>
  );
}
