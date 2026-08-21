"use client";

import dynamic from "next/dynamic";

const ClientApplication = dynamic(() => import("../src/App"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-bg-base text-text-secondary">
      <p role="status" className="text-body-sm">
        Chargement de Shongre…
      </p>
    </main>
  ),
});

export function WebApplication() {
  return <ClientApplication />;
}
