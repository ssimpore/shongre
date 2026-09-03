import { headers } from "next/headers";
import { resolveNotFoundPresentation } from "../src/platform/seo/not-found-presentation";

export default async function NotFound() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-shongre-request-pathname") || "/";
  const presentation = resolveNotFoundPresentation(undefined, pathname);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-16">
      <title>{presentation.title} | Shongre</title>
      <meta name="robots" content="noindex, nofollow" />
      <section className="w-full max-w-xl rounded-card border border-border-base bg-bg-surface p-8 text-center shadow-sm sm:p-12">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          Erreur 404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text-main">
          {presentation.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-text-secondary">
          {presentation.description}
        </p>
        <a
          href={presentation.returnHref}
          className="mt-8 inline-flex min-h-control-touch items-center justify-center rounded-control bg-primary px-5 text-sm font-bold text-white motion-interactive hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {presentation.returnLabel}
        </a>
      </section>
    </main>
  );
}
