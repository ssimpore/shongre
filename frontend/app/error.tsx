"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base p-6 text-center">
      <h1 className="text-heading-md font-bold text-text-main">
        Une erreur est survenue
      </h1>
      <p className="max-w-md text-body-sm text-text-secondary">
        La page n’a pas pu être chargée. Vous pouvez réessayer sans perdre vos
        données.
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-control-touch rounded-control bg-primary px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Réessayer
      </button>
    </main>
  );
}
