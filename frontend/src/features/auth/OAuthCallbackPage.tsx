import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import type { SocialAuthProvider } from "../../api/contracts/auth.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { Button } from "../../design-system/primitives/Button";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { AuthLayout } from "./components/AuthLayout";
import { resolveSafeReturn } from "../../security/safe-return";

type CallbackState =
  | "loading"
  | "success"
  | "cancelled"
  | "link_required"
  | "email_required"
  | "error";

function socialProvider(value: string | null): SocialAuthProvider | null {
  return value === "google" || value === "apple" || value === "facebook"
    ? value
    : null;
}

export function OAuthCallbackPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const processed = useRef(false);
  const provider = socialProvider(searchParams.get("provider"));
  const status = searchParams.get("status") || "error";
  const returnTo = resolveSafeReturn(searchParams.get("returnTo"), "/compte");
  const onboarding =
    searchParams.get("onboarding") ||
    (searchParams.get("accountType") === "professional"
      ? "professional"
      : null);
  const destination =
    onboarding === "professional"
      ? "/compte?onboarding=professional"
      : onboarding === "choose_account_type"
        ? "/compte/type-de-compte"
        : returnTo;
  const [view, setView] = useState<CallbackState>("loading");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  usePageMeta({
    title: t("auth.callback.title"),
    description: "Finalisation sécurisée de votre connexion Shongre.",
    noIndex: true,
  });

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    if (status === "cancelled") {
      setView("cancelled");
      return;
    }
    if (status === "link_required") {
      setView("link_required");
      return;
    }
    if (status === "email_required") {
      setView("email_required");
      return;
    }
    if (status === "verification_required") {
      navigate("/verification-email", { replace: true });
      return;
    }
    if (
      status !== "authenticated" &&
      status !== "linked" &&
      status !== "success"
    ) {
      setView("error");
      return;
    }

    void (async () => {
      try {
        if (searchParams.get("demo") === "true") {
          if (!provider || !services.auth.completeDemoSocialAuth)
            throw new Error("invalid_demo_callback");
          await services.auth.completeDemoSocialAuth({
            provider,
            intent: searchParams.get("intent") === "link" ? "link" : "sign_in",
          });
        }
        await refreshUser();
        setView("success");
        window.setTimeout(() => navigate(destination, { replace: true }), 650);
      } catch {
        setView("error");
      }
    })();
  }, [destination, navigate, provider, refreshUser, searchParams, status]);

  const completeProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await services.auth.completeOAuthProfile({
        email: email.trim(),
        accountType:
          searchParams.get("accountType") === "professional"
            ? "professional"
            : "individual",
      });
      navigate("/verification-email", { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("auth.social.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const message =
    view === "success"
      ? status === "linked"
        ? t("auth.callback.linked")
        : t("auth.callback.success")
      : view === "cancelled"
        ? t("auth.callback.cancelled")
        : view === "link_required"
          ? t("auth.callback.linkRequired")
          : view === "email_required"
            ? t("auth.callback.emailRequired")
            : view === "error"
              ? t("auth.social.failed")
              : t("auth.callback.loading");

  return (
    <AuthLayout
      title={t("auth.callback.title")}
      subtitle={t("auth.callback.subtitle")}
    >
      <div
        aria-live="polite"
        aria-busy={view === "loading"}
        className="space-y-5 text-center"
      >
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            view === "success"
              ? "bg-success-surface text-success"
              : "bg-stone-100 text-stone-600"
          }`}
        >
          {view === "success" ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : view === "email_required" ? (
            <Mail className="h-7 w-7" />
          ) : (
            <AlertCircle className="h-7 w-7" />
          )}
        </div>
        <p className="text-sm leading-relaxed text-stone-700">{message}</p>

        {view === "email_required" ? (
          <form onSubmit={completeProfile} className="space-y-3 text-left">
            <label
              htmlFor="oauth-email"
              className="block text-xs font-bold text-stone-800"
            >
              {t("auth.callback.emailLabel")}
            </label>
            <input
              id="oauth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-control-touch w-full rounded-control border border-stone-200 bg-white px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {error ? (
              <p role="alert" className="text-xs font-semibold text-danger">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={submitting}
            >
              {t("auth.callback.verifyEmail")}
            </Button>
          </form>
        ) : null}

        {view === "cancelled" || view === "error" ? (
          <Button
            to="/connexion"
            variant="primary"
            className="w-full"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            {t("auth.callback.backToLogin")}
          </Button>
        ) : null}
        {view === "link_required" ? (
          <Link
            className="inline-flex font-bold text-primary underline"
            to={`/connexion?returnTo=${encodeURIComponent(returnTo)}`}
          >
            {t("auth.callback.signInExisting")}
          </Link>
        ) : null}
      </div>
    </AuthLayout>
  );
}
