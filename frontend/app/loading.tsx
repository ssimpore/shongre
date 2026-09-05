import { BrandIcon } from "../src/design-system/primitives/BrandLogo";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-base text-text-secondary">
      <BrandIcon size="prominent" decorative priority />
      <p role="status" className="text-body-sm">
        Chargement de SHONGRE.…
      </p>
    </main>
  );
}
