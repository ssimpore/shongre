import { ArrowRight, Search, ShieldCheck, Users } from "lucide-react";
import type { CountryConfig } from "@shongre/contracts";
import Link from "next/link";

export interface GatewayCountryLink {
  country: CountryConfig;
  href: string;
}

export function GlobalGatewayPage({
  countries,
  franceOrigin,
}: {
  countries: GatewayCountryLink[];
  franceOrigin: string;
}) {
  return (
    <div className="min-h-screen bg-white font-sans text-stone-950">
      <header className="border-b border-border-base bg-white">
        <div className="mx-auto flex h-16 w-full max-w-page items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xl font-extrabold uppercase tracking-tight text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            aria-label="Accueil international Shongre"
          >
            Shongre<span className="text-primary">.</span>
          </Link>
          <a
            href={`${franceOrigin}/connexion`}
            className="inline-flex min-h-control-touch items-center rounded-control border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Se connecter
          </a>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid w-full max-w-page gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
              Shongre, le marché local à l’échelle du monde
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
              Choisissez votre pays pour retrouver les annonces, les services et
              les professionnels près de chez vous.
            </p>
          </div>

          <div aria-labelledby="country-list-title">
            <h2 id="country-list-title" className="mb-4 text-lg font-black">
              Choisissez votre pays
            </h2>
            <ul className="divide-y divide-border-subtle border-y border-border-base">
              {countries.map(({ country, href }) => {
                const available =
                  country.marketplace.enabled &&
                  ["active", "beta"].includes(country.launchStatus);
                return (
                  <li key={country.code}>
                    <a
                      href={href}
                      className="group flex min-h-16 items-center gap-4 px-1 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      aria-label={`${country.name}${available ? "" : " — ouverture prochaine"}`}
                    >
                      <span className="text-2xl" aria-hidden="true">
                        {country.flag}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-black text-stone-950">
                          {country.name}
                        </span>
                        <span className="block truncate text-xs text-stone-600">
                          {country.nativeName} · {country.currency}
                        </span>
                      </span>
                      {available ? (
                        <ArrowRight
                          className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="rounded-control border border-border-base bg-bg-subtle px-2.5 py-1 text-xs font-bold text-stone-700">
                          À venir
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="border-y border-border-base bg-bg-subtle">
          <div className="mx-auto grid w-full max-w-page divide-y divide-border-base px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
            {[
              {
                title: "Local et de confiance",
                description:
                  "Des annonces et des professionnels avec des repères de confiance adaptés à chaque marché.",
                Icon: ShieldCheck,
              },
              {
                title: "Proche de vous",
                description:
                  "Une recherche et des services qui restent dans le pays choisi, sans mélange silencieux.",
                Icon: Users,
              },
              {
                title: "Simple et pratique",
                description:
                  "Un seul compte Shongre et la même expérience, quel que soit le marché.",
                Icon: Search,
              },
            ].map(({ title, description, Icon }) => (
              <article
                key={title}
                className="flex gap-4 py-8 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-base bg-white text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-black">{title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-stone-600">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="mx-auto flex w-full max-w-page flex-col gap-5 px-4 py-8 text-xs text-stone-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="font-bold text-stone-950">
            Shongre<span className="text-primary">.</span>
          </p>
          <nav
            aria-label="Liens légaux"
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            <a
              href={`${franceOrigin}/securite`}
              className="hover:text-stone-950"
            >
              Sécurité
            </a>
            <a
              href={`${franceOrigin}/confidentialite`}
              className="hover:text-stone-950"
            >
              Confidentialité
            </a>
            <a
              href={`${franceOrigin}/conditions-utilisation`}
              className="hover:text-stone-950"
            >
              Conditions d’utilisation
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
