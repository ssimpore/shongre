import { useEffect, useId, useRef, useState } from "react";
import { officialProviderColors } from "@shongre/design-tokens";
import { services } from "../../../api/client/service-registry";
import type {
  SocialAuthProvider,
  SocialAuthStartInput,
} from "../../../api/contracts/auth.contract";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-icon-md w-icon-md">
      <path
        fill={officialProviderColors.google.blue}
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
      />
      <path
        fill={officialProviderColors.google.green}
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z"
      />
      <path
        fill={officialProviderColors.google.yellow}
        d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.3L6.5 14Z"
      />
      <path
        fill={officialProviderColors.google.red}
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
      className="h-icon-md w-icon-md fill-current"
    >
      <path d="M17.1 12.6c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-1.9c-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.4-.8 1.5 0 2 .8 3.4.8 1.4 0 2.3-1.2 3.1-2.5a11 11 0 0 0 1.4-2.9 4.2 4.2 0 0 1-2.1-4.3ZM14.6 5.4A4.3 4.3 0 0 0 15.7 2a4.7 4.7 0 0 0-3.1 1.6 4 4 0 0 0-1.1 3.2 3.9 3.9 0 0 0 3.1-1.4Z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-icon-md w-icon-md">
      <path
        fill={officialProviderColors.facebook.blue}
        d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"
      />
      <path
        fill={officialProviderColors.facebook.white}
        d="m15.9 14.9.4-2.9h-2.8v-1.8c0-.8.4-1.6 1.7-1.6h1.3V6.1s-1.2-.2-2.3-.2c-2.3 0-3.8 1.4-3.8 3.9V12H7.9v2.9h2.5v7a10.4 10.4 0 0 0 3.1 0v-7h2.4Z"
      />
    </svg>
  );
}

const PROVIDERS = [
  { id: "google" as const, name: "Google", icon: <GoogleMark /> },
  { id: "apple" as const, name: "Apple", icon: <AppleMark /> },
  { id: "facebook" as const, name: "Facebook", icon: <FacebookMark /> },
];

type SocialLoginButtonsProps = Pick<
  SocialAuthStartInput,
  "returnTo" | "accountType"
> & {
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
};

export function SocialLoginButtons({
  returnTo,
  accountType,
  disabled = false,
  onPendingChange,
}: SocialLoginButtonsProps) {
  const { t } = useTranslation();
  const statusId = useId();
  const starting = useRef(false);
  const [pending, setPending] = useState<SocialAuthProvider | null>(null);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<Record<
    SocialAuthProvider,
    boolean
  > | null>(null);
  const [availabilityFailed, setAvailabilityFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void services.auth
      .getSocialAuthAvailability()
      .then((result) => {
        if (active) setAvailability(result);
      })
      .catch(() => {
        if (active) setAvailabilityFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const availableProviders = PROVIDERS.filter(
    (provider) => availability?.[provider.id],
  );
  const status = availabilityFailed
    ? t("auth.social.availabilityFailed")
    : availability === null
      ? t("auth.social.checking")
      : availableProviders.length === 0
        ? t("auth.social.emailOnly")
        : null;

  const start = async (provider: SocialAuthProvider) => {
    if (disabled || starting.current || availability?.[provider] !== true)
      return;
    starting.current = true;
    setPending(provider);
    setError("");
    onPendingChange?.(true);
    try {
      const { authorizationUrl } = await services.auth.startSocialAuth({
        provider,
        intent: "sign_in",
        returnTo,
        accountType,
      });
      window.location.assign(authorizationUrl);
    } catch {
      setError(t("auth.social.failed"));
      starting.current = false;
      setPending(null);
      onPendingChange?.(false);
    }
  };

  return (
    <div className="mb-5 space-y-4">
      <div
        role="group"
        aria-label={t("auth.social.heading")}
        className="space-y-3"
      >
        <p className="text-center text-sm font-semibold text-text-main">
          {availableProviders.length > 0
            ? t("auth.social.heading")
            : t("auth.social.emailHeading")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {availableProviders.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              size="compact"
              className="w-full text-xs"
              aria-label={t(`auth.social.${provider.id}`)}
              leftIcon={provider.icon}
              isLoading={pending === provider.id}
              disabled={
                disabled ||
                availability?.[provider.id] !== true ||
                pending !== null
              }
              aria-describedby={
                status && availability?.[provider.id] !== true
                  ? statusId
                  : undefined
              }
              onClick={() => void start(provider.id)}
            >
              {provider.name}
            </Button>
          ))}
        </div>
        {status ? (
          <div
            id={statusId}
            role="status"
            className="text-center text-xs leading-relaxed text-text-supporting"
          >
            {status}
            {availabilityFailed ? (
              <div className="mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    setAvailabilityFailed(false);
                    setAvailability(null);
                    setAttempt((current) => current + 1);
                  }}
                >
                  {t("auth.social.retry")}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </div>
      {availableProviders.length > 0 && (
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border-subtle" />
          <span className="text-xs text-text-supporting">
            {t("auth.social.email")}
          </span>
          <span className="h-px flex-1 bg-border-subtle" />
        </div>
      )}
    </div>
  );
}
