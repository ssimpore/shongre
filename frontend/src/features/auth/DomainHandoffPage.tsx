import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { Button } from "../../design-system/primitives/Button";
import { usePageMeta } from "../../hooks/usePageMeta";
import { resolveSafeReturn } from "../../security/safe-return";
import { AuthLayout } from "./components/AuthLayout";

type ExchangeState = "loading" | "success" | "error";

export function DomainHandoffPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { activeMarket, marketContext } = useMarketLocation();
  const targetCountry = marketContext?.countryCode ?? activeMarket.code;
  const processed = useRef(false);
  const [state, setState] = useState<ExchangeState>("loading");

  usePageMeta({
    title: "Connexion sécurisée",
    description: "Transfert sécurisé de votre session Shongre.",
    noIndex: true,
  });

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const code = searchParams.get("code") || "";
    if (code.length < 32) {
      setState("error");
      return;
    }

    void (async () => {
      try {
        const result = await services.auth.exchangeDomainHandoff({
          code,
          targetCountry,
        });
        await refreshUser();
        setState("success");
        const destination = resolveSafeReturn(result.returnTo, "/");
        window.setTimeout(() => navigate(destination, { replace: true }), 450);
      } catch {
        setState("error");
      }
    })();
  }, [navigate, refreshUser, searchParams, targetCountry]);

  const icon =
    state === "loading" ? (
      <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
    ) : state === "success" ? (
      <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
    ) : (
      <ShieldAlert className="h-7 w-7" aria-hidden="true" />
    );

  return (
    <AuthLayout
      title="Votre compte Shongre vous suit"
      subtitle={`Connexion sécurisée au marché ${activeMarket.name}`}
    >
      <div
        className="space-y-5 text-center"
        aria-live="polite"
        aria-busy={state === "loading"}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <p className="text-sm leading-relaxed text-stone-700">
          {state === "loading"
            ? "Nous créons une session locale protégée pour ce domaine."
            : state === "success"
              ? "Connexion confirmée. Redirection en cours…"
              : "Ce lien sécurisé a expiré ou a déjà été utilisé."}
        </p>
        {state === "error" ? (
          <Button
            to="/connexion"
            variant="primary"
            className="w-full"
            rightIcon={
              <ArrowRight className="h-icon-md w-icon-md" aria-hidden="true" />
            }
          >
            Se connecter
          </Button>
        ) : null}
      </div>
    </AuthLayout>
  );
}
