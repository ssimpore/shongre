import { useCallback, useEffect, useState } from "react";
import {
  Apple,
  CheckCircle2,
  KeyRound,
  Laptop,
  Link2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { services } from "../../api/client/service-registry";
import type {
  AuthSecurityOverview,
  ConnectedAccountView,
  SocialAuthProvider,
  MfaSetupView,
  MfaStatusView,
} from "../../api/contracts/auth.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Badge, Button } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { PasswordField } from "./components/PasswordField";
import { AUTH_CONSTRAINTS } from "@shongre/contracts/auth";

function providerLabel(
  provider: ConnectedAccountView["provider"],
  passwordLabel: string,
): string {
  return provider === "password"
    ? passwordLabel
    : provider[0].toUpperCase() + provider.slice(1);
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AccountSecurityPage() {
  const { locale, t } = useTranslation();
  const { logout } = useAuth();
  const toast = useToast();
  const [overview, setOverview] = useState<AuthSecurityOverview | null>(null);
  const [availability, setAvailability] = useState<
    (Record<SocialAuthProvider, boolean> & { linking: boolean }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mfaStatus, setMfaStatus] = useState<MfaStatusView | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MfaSetupView | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  usePageMeta({
    title: t("auth.security.title"),
    description: t("auth.security.description"),
    canonicalPath: "/compte/securite-compte",
    noIndex: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [security, providers, mfa] = await Promise.all([
        services.auth.getSecurityOverview(),
        services.auth.getSocialAuthAvailability(),
        services.auth.getMfaStatus(),
      ]);
      setOverview(security);
      setAvailability(providers);
      setMfaStatus(mfa);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger les réglages de sécurité.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const passwordMethod = overview?.methods.find(
    (method) => method.provider === "password",
  );
  const passwordProviderLabel = t("auth.security.passwordProvider");

  const reauthenticate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("reauth");
    setError("");
    try {
      await services.auth.reauthenticate(reauthPassword);
      setReauthPassword("");
      await load();
      toast.success(
        "Identité confirmée pour les prochaines actions sensibles.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Confirmation impossible.",
      );
    } finally {
      setBusy(null);
    }
  };

  const startLink = async (provider: SocialAuthProvider) => {
    if (overview?.recentAuthenticationRequired) {
      setError("Confirmez d’abord votre identité ci-dessous.");
      document.getElementById("security-reauth")?.focus();
      return;
    }
    setBusy(`link-${provider}`);
    try {
      const result = await services.auth.startSocialAuth({
        provider,
        intent: "link",
        returnTo: "/compte/securite-compte",
      });
      window.location.assign(result.authorizationUrl);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Association impossible.",
      );
      setBusy(null);
    }
  };

  const reauthenticateWithProvider = async (provider: SocialAuthProvider) => {
    setBusy(`reauth-${provider}`);
    setError("");
    try {
      const result = await services.auth.startSocialAuth({
        provider,
        intent: "sign_in",
        returnTo: "/compte/securite-compte",
      });
      window.location.assign(result.authorizationUrl);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Confirmation impossible.",
      );
      setBusy(null);
    }
  };

  const unlink = async (provider: SocialAuthProvider) => {
    setBusy(`unlink-${provider}`);
    setError("");
    try {
      await services.auth.unlinkProvider(provider);
      await load();
      toast.success(
        `${providerLabel(provider, passwordProviderLabel)} a été déconnecté.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Déconnexion impossible.",
      );
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("password");
    setError("");
    try {
      if (passwordMethod?.connected) {
        await services.auth.changePassword(currentPassword, newPassword);
      } else {
        await services.auth.addPassword(newPassword);
      }
      setCurrentPassword("");
      setNewPassword("");
      await load();
      toast.success("Votre mot de passe a été mis à jour.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Modification impossible.",
      );
    } finally {
      setBusy(null);
    }
  };

  const revokeSession = async (sessionId: string, current: boolean) => {
    setBusy(`session-${sessionId}`);
    try {
      if (current) {
        await logout();
        return;
      }
      await services.auth.revokeSession(sessionId);
      await load();
      toast.success("La session a été révoquée.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Révocation impossible.",
      );
    } finally {
      setBusy(null);
    }
  };

  const logoutOtherSessions = async () => {
    setBusy("logout-others");
    setError("");
    try {
      await services.auth.logoutAll(true);
      await load();
      toast.success("Les autres appareils ont été déconnectés.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Déconnexion impossible.",
      );
    } finally {
      setBusy(null);
    }
  };

  const beginMfa = async () => {
    setBusy("mfa-setup");
    setError("");
    try {
      setMfaSetup(await services.auth.beginMfaEnrollment());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Activation MFA impossible.",
      );
    } finally {
      setBusy(null);
    }
  };

  const confirmMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("mfa-confirm");
    setError("");
    try {
      await services.auth.confirmMfaEnrollment(mfaCode);
      setMfaSetup(null);
      setMfaCode("");
      await load();
      toast.success("Double authentification activée.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Code MFA invalide.");
    } finally {
      setBusy(null);
    }
  };

  const disableMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("mfa-disable");
    setError("");
    try {
      await services.auth.disableMfa(mfaCode);
      setMfaCode("");
      await load();
      toast.success("Double authentification désactivée.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Désactivation impossible.",
      );
    } finally {
      setBusy(null);
    }
  };

  if (loading && !overview) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="py-12 text-center text-sm text-stone-600"
      >
        {t("auth.security.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          <h1 className="text-xl font-black text-stone-950 sm:text-2xl">
            {t("auth.security.title")}
          </h1>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {t("auth.security.description")}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-card border border-danger-border bg-danger-surface p-3 text-xs font-semibold text-danger"
        >
          {error}
        </div>
      ) : null}

      {overview?.recentAuthenticationRequired && passwordMethod?.connected ? (
        <section
          className="rounded-card border border-warning-border bg-warning-surface p-4 sm:p-5"
          aria-labelledby="reauth-title"
        >
          <h2 id="reauth-title" className="text-sm font-black text-stone-950">
            {t("auth.security.confirmIdentity")}
          </h2>
          <p className="mt-1 text-xs text-stone-700">
            {t("auth.security.confirmDescription")}
          </p>
          <form
            onSubmit={reauthenticate}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <input
              id="security-reauth"
              type="password"
              required
              autoComplete="current-password"
              value={reauthPassword}
              onChange={(event) => setReauthPassword(event.target.value)}
              aria-label={t("auth.security.currentPassword")}
              className="h-control-touch min-w-0 flex-1 rounded-control border border-stone-300 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={busy === "reauth"}
            >
              {t("auth.security.confirm")}
            </Button>
          </form>
        </section>
      ) : null}

      {overview?.recentAuthenticationRequired && !passwordMethod?.connected
        ? (() => {
            const connectedProvider = overview.methods.find(
              (method) => method.provider !== "password" && method.connected,
            );
            if (!connectedProvider || connectedProvider.provider === "password")
              return null;
            return (
              <section
                className="rounded-card border border-warning-border bg-warning-surface p-4 sm:p-5"
                aria-labelledby="social-reauth-title"
              >
                <h2
                  id="social-reauth-title"
                  className="text-sm font-black text-stone-950"
                >
                  {t("auth.security.confirmIdentity")}
                </h2>
                <p className="mt-1 text-xs text-stone-700">
                  {t("auth.security.confirmDescription")}
                </p>
                <Button
                  className="mt-4"
                  variant="primary"
                  isLoading={busy === `reauth-${connectedProvider.provider}`}
                  onClick={() =>
                    void reauthenticateWithProvider(
                      connectedProvider.provider as SocialAuthProvider,
                    )
                  }
                >
                  {t(`auth.social.${connectedProvider.provider}`)}
                </Button>
              </section>
            );
          })()
        : null}

      <section
        className="rounded-card border border-border-base bg-white p-4 shadow-xs sm:p-5"
        aria-labelledby="methods-title"
      >
        <h2 id="methods-title" className="text-base font-black text-stone-950">
          {t("auth.security.methods")}
        </h2>
        <div className="mt-4 divide-y divide-border-subtle">
          {overview?.methods.map((method) => (
            <div
              key={method.provider}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-stone-100 text-stone-700">
                  {method.provider === "apple" ? (
                    <Apple className="h-4 w-4" />
                  ) : method.provider === "password" ? (
                    <KeyRound className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900">
                      {providerLabel(method.provider, passwordProviderLabel)}
                    </h3>
                    <Badge
                      variant={method.connected ? "success" : "neutral"}
                      size="sm"
                    >
                      {method.connected
                        ? t("auth.security.connected")
                        : t("auth.security.notConnected")}
                    </Badge>
                  </div>
                  {method.email ? (
                    <p className="mt-1 truncate text-xs text-stone-500">
                      {method.email}
                      {method.isPrivateRelay
                        ? ` · ${t("auth.security.privateRelay")}`
                        : ""}
                    </p>
                  ) : null}
                  {method.connected && method.linkedAt ? (
                    <p className="mt-1 text-xs text-stone-500">
                      {t("auth.security.linkedOn")}{" "}
                      {formatDate(method.linkedAt, locale)}
                      {method.lastUsedAt
                        ? ` · ${t("auth.security.lastUsed")} ${formatDate(method.lastUsedAt, locale)}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
              {method.provider !== "password" ? (
                method.connected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Unlink className="h-3.5 w-3.5" />}
                    isLoading={busy === `unlink-${method.provider}`}
                    onClick={() =>
                      void unlink(method.provider as SocialAuthProvider)
                    }
                  >
                    {t("auth.security.disconnect")}
                  </Button>
                ) : availability?.linking &&
                  availability[method.provider as SocialAuthProvider] ? (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Link2 className="h-3.5 w-3.5" />}
                    isLoading={busy === `link-${method.provider}`}
                    onClick={() =>
                      void startLink(method.provider as SocialAuthProvider)
                    }
                  >
                    {t("auth.security.connect")}
                  </Button>
                ) : (
                  <span className="text-xs text-stone-500">
                    {t("auth.security.unavailable")}
                  </span>
                )
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section
        className="rounded-card border border-border-base bg-white p-4 shadow-xs sm:p-5"
        aria-labelledby="mfa-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="mfa-title" className="text-base font-black text-stone-950">
              Double authentification
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Protégez les connexions avec une application TOTP et des codes de
              secours à usage unique.
            </p>
          </div>
          <Badge variant={mfaStatus?.enabled ? "success" : "neutral"} size="sm">
            {mfaStatus?.enabled ? "Activée" : "Désactivée"}
          </Badge>
        </div>

        {mfaStatus?.enabled ? (
          <form onSubmit={disableMfa} className="mt-4 space-y-3">
            <p className="text-xs text-stone-600">
              {mfaStatus.backupCodesRemaining} code(s) de secours restant(s).
              Une confirmation récente et un code valide sont nécessaires pour
              désactiver cette protection.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                aria-label="Code MFA pour désactiver"
                placeholder="Code TOTP ou code de secours"
                className="h-control-touch min-w-0 flex-1 rounded-control border border-stone-300 px-3 text-sm"
              />
              <Button
                type="submit"
                variant="danger"
                isLoading={busy === "mfa-disable"}
                disabled={mfaCode.trim().length < 6}
              >
                Désactiver
              </Button>
            </div>
          </form>
        ) : mfaSetup ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border-base bg-stone-50 p-4">
              <p className="text-xs font-bold text-stone-900">
                Clé à saisir dans votre application d’authentification
              </p>
              <code className="mt-2 block break-all rounded-lg bg-white p-2 text-xs font-bold">
                {mfaSetup.secret}
              </code>
              <a
                href={mfaSetup.otpauthUri}
                className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
              >
                Ouvrir dans une application compatible
              </a>
            </div>
            <div className="rounded-xl border border-warning-border bg-warning-surface p-4">
              <p className="text-xs font-bold text-stone-900">
                Codes de secours — copiez-les maintenant
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                {mfaSetup.backupCodes.map((backupCode) => (
                  <code
                    key={backupCode}
                    className="rounded bg-white px-2 py-1 text-center text-micro font-bold"
                  >
                    {backupCode}
                  </code>
                ))}
              </div>
            </div>
            <form
              onSubmit={confirmMfa}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={AUTH_CONSTRAINTS.verificationCodeLength}
                value={mfaCode}
                onChange={(event) =>
                  setMfaCode(event.target.value.replace(/\D/g, ""))
                }
                aria-label="Code MFA de confirmation"
                placeholder="000000"
                className="h-control-touch min-w-0 flex-1 rounded-control border border-stone-300 px-3 text-sm"
              />
              <Button
                type="submit"
                isLoading={busy === "mfa-confirm"}
                disabled={
                  mfaCode.length !== AUTH_CONSTRAINTS.verificationCodeLength
                }
              >
                Vérifier et activer
              </Button>
            </form>
          </div>
        ) : (
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void beginMfa()}
            isLoading={busy === "mfa-setup"}
          >
            Activer la double authentification
          </Button>
        )}
      </section>

      <section
        className="rounded-card border border-border-base bg-white p-4 shadow-xs sm:p-5"
        aria-labelledby="password-title"
      >
        <h2 id="password-title" className="text-base font-black text-stone-950">
          {passwordMethod?.connected
            ? t("auth.security.changePassword")
            : t("auth.security.addPassword")}
        </h2>
        <form
          onSubmit={savePassword}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          {passwordMethod?.connected ? (
            <PasswordField
              id="security-current-password"
              label={t("auth.security.currentPassword")}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          ) : null}
          <PasswordField
            id="security-new-password"
            label={t("auth.security.newPassword")}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            showStrength
            autoComplete="new-password"
          />
          <div className="sm:col-span-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={busy === "password"}
            >
              {t("auth.security.savePassword")}
            </Button>
          </div>
        </form>
      </section>

      <section
        className="rounded-card border border-border-base bg-white p-4 shadow-xs sm:p-5"
        aria-labelledby="sessions-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="sessions-title"
              className="text-base font-black text-stone-950"
            >
              {t("auth.security.devices")}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {t("auth.security.devicesDescription")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => void load()}
          >
            {t("auth.security.refresh")}
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border-subtle">
          {overview?.sessions.length ? (
            overview.sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <Laptop
                    className="mt-0.5 h-4 w-4 shrink-0 text-stone-500"
                    aria-hidden="true"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900">
                        {session.deviceLabel}
                      </h3>
                      {session.isCurrent ? (
                        <Badge variant="success" size="sm">
                          {t("auth.security.thisDevice")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {t("auth.security.lastActivity")} :{" "}
                      {formatDate(
                        session.lastUsedAt || session.issuedAt,
                        locale,
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant={session.isCurrent ? "outline" : "danger"}
                  size="sm"
                  leftIcon={<LogOut className="h-3.5 w-3.5" />}
                  isLoading={busy === `session-${session.id}`}
                  onClick={() =>
                    void revokeSession(session.id, session.isCurrent)
                  }
                >
                  {session.isCurrent
                    ? t("auth.security.signOut")
                    : t("auth.security.revoke")}
                </Button>
              </div>
            ))
          ) : (
            <p className="py-4 text-sm text-stone-500">
              {t("auth.security.noSessions")}
            </p>
          )}
        </div>
        {(overview?.sessions.length || 0) > 1 ? (
          <div className="mt-4 border-t border-border-subtle pt-4">
            <Button
              variant="danger"
              size="sm"
              isLoading={busy === "logout-others"}
              onClick={() => void logoutOtherSessions()}
            >
              {t("auth.security.signOutOthers")}
            </Button>
          </div>
        ) : null}
      </section>

      <p className="flex items-center gap-2 text-xs text-stone-500">
        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
        {t("auth.security.secretsNotice")}
      </p>
    </div>
  );
}
