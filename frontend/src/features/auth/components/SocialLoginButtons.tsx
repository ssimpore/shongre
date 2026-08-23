import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { services } from "../../../api/client/service-registry";
import type {
  SocialAuthProvider,
  SocialAuthStartInput,
} from "../../../api/contracts/auth.contract";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.3L6.5 14Z"
      />
      <path
        fill="#EA4335"
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current"
    >
      <path d="M17.1 12.6c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-1.9c-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.4-.8 1.5 0 2 .8 3.4.8 1.4 0 2.3-1.2 3.1-2.5a11 11 0 0 0 1.4-2.9 4.2 4.2 0 0 1-2.1-4.3ZM14.6 5.4A4.3 4.3 0 0 0 15.7 2a4.7 4.7 0 0 0-3.1 1.6 4 4 0 0 0-1.1 3.2 3.9 3.9 0 0 0 3.1-1.4Z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#1877F2"
        d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"
      />
      <path
        fill="#fff"
        d="m15.9 14.9.4-2.9h-2.8v-1.8c0-.8.4-1.6 1.7-1.6h1.3V6.1s-1.2-.2-2.3-.2c-2.3 0-3.8 1.4-3.8 3.9V12H7.9v2.9h2.5v7a10.4 10.4 0 0 0 3.1 0v-7h2.4Z"
      />
    </svg>
  );
}

const PROVIDERS = [
  { id: "google" as const, icon: <GoogleMark /> },
  { id: "apple" as const, icon: <AppleMark /> },
  { id: "facebook" as const, icon: <FacebookMark /> },
];

export function SocialLoginButtons(
  props: Pick<SocialAuthStartInput, "intent" | "returnTo" | "accountType">,
) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<SocialAuthProvider | null>(null);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<
    (Record<SocialAuthProvider, boolean> & { linking: boolean }) | null
  >(null);

  useEffect(() => {
    let active = true;
    void services.auth
      .getSocialAuthAvailability()
      .then((result) => {
        if (active) setAvailability(result);
      })
      .catch(() => {
        if (active)
          setAvailability({
            google: false,
            apple: false,
            facebook: false,
            linking: false,
          });
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleProviders = PROVIDERS.filter(
    (provider) =>
      availability?.[provider.id] !== false &&
      !(props.intent === "link" && availability?.linking === false),
  );

  const start = async (provider: SocialAuthProvider) => {
    if (pending) return;
    setPending(provider);
    setError("");
    try {
      const { authorizationUrl } = await services.auth.startSocialAuth({
        provider,
        ...props,
      });
      window.location.assign(authorizationUrl);
    } catch {
      setError(t("auth.social.failed"));
      setPending(null);
    }
  };

  if (availability && visibleProviders.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-micro font-semibold uppercase tracking-wide text-stone-500">
          {t("auth.social.or")}
        </span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>
      <div className="grid gap-2">
        {visibleProviders.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            size="md"
            className="w-full bg-white"
            leftIcon={provider.icon}
            isLoading={pending === provider.id}
            disabled={
              availability === null ||
              (pending !== null && pending !== provider.id)
            }
            onClick={() => void start(provider.id)}
          >
            {t(`auth.social.${provider.id}`)}
          </Button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-center text-micro leading-relaxed text-stone-500">
        {t("auth.social.privacy")}{" "}
        <Link className="font-semibold underline" to="/conditions-utilisation">
          CGU
        </Link>{" "}
        ·{" "}
        <Link className="font-semibold underline" to="/confidentialite">
          Confidentialité
        </Link>
      </p>
    </div>
  );
}
