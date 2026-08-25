import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, KeyRound, ShieldCheck } from "lucide-react";
import type {
  MfaSetupView,
  MfaStatusView,
} from "../../api/contracts/auth.contract";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import { Button, Notice } from "../../design-system";
import { FormField, Input } from "../../design-system/primitives/FormField";
import { usePageMeta } from "../../hooks/usePageMeta";
import { AUTH_CONSTRAINTS } from "@shongre/contracts/auth";

export const StaffMfaPage: React.FC = () => {
  usePageMeta({
    title: "Sécurité du compte interne — Shongre",
    description: "Validation MFA obligatoire pour les outils internes.",
    canonicalPath: "/securite-interne",
    noIndex: true,
  });
  const toast = useToast();
  const [status, setStatus] = useState<MfaStatusView | null>(null);
  const [setup, setSetup] = useState<MfaSetupView | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await services.auth.getMfaStatus());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "État de sécurité indisponible.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const beginSetup = async () => {
    setBusy(true);
    setError("");
    try {
      setSetup(await services.auth.beginMfaEnrollment());
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Activation impossible.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (status?.enabled) await services.auth.verifySessionMfa(code);
      else await services.auth.confirmMfaEnrollment(code);
      toast.success("Double authentification validée.");
      await load();
      window.location.assign("/admin");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Code de sécurité invalide.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        className="mx-auto max-w-xl py-16 text-center text-sm text-stone-600"
      >
        Vérification de la sécurité du compte…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-border-base bg-white p-6 shadow-sm sm:p-8">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-stone-950">
            Sécurité de l’espace interne
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
            Les outils Support, Modération, Finance et Administration exigent
            une preuve MFA pour chaque session.
          </p>
        </header>

        {error && (
          <Notice variant="error" className="mt-5">
            {error}
          </Notice>
        )}

        {status?.enabled && status.sessionVerified ? (
          <div className="mt-6 rounded-2xl border border-success-border bg-success-surface p-5 text-center">
            <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
            <p className="mt-2 text-sm font-bold text-stone-900">
              Cette session est vérifiée.
            </p>
            <Button to="/admin" size="sm" className="mt-4">
              Ouvrir la console interne
            </Button>
          </div>
        ) : status?.enabled ? (
          <form onSubmit={confirm} className="mt-6 space-y-4">
            <Notice variant="info">
              Saisissez le code de votre application d’authentification ou un
              code de secours à usage unique.
            </Notice>
            <FormField label="Code de sécurité" required>
              <Input
                autoComplete="one-time-code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="000000"
              />
            </FormField>
            <Button
              type="submit"
              className="w-full"
              disabled={
                busy ||
                code.trim().length < AUTH_CONSTRAINTS.verificationCodeLength
              }
            >
              {busy ? "Vérification…" : "Vérifier cette session"}
            </Button>
          </form>
        ) : !setup ? (
          <div className="mt-6 space-y-4">
            <Notice variant="warning">
              La double authentification est obligatoire pour votre rôle. Vous
              devez l’activer avant d’accéder aux données opérationnelles.
            </Notice>
            <Button className="w-full" onClick={beginSetup} disabled={busy}>
              <KeyRound className="h-4 w-4" />
              {busy ? "Préparation…" : "Configurer mon authentificateur"}
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <section className="rounded-2xl border border-border-base bg-stone-50 p-4">
              <h2 className="text-sm font-black text-stone-900">
                1. Ajoutez Shongre à votre application
              </h2>
              <p className="mt-1 text-xs text-stone-600">
                Saisissez cette clé dans votre gestionnaire TOTP. Elle ne sera
                plus affichée après l’activation.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg border border-border-base bg-white p-3 text-xs font-bold">
                  {setup.secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Copier la clé MFA"
                  onClick={() =>
                    void navigator.clipboard.writeText(setup.secret)
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <a
                href={setup.otpauthUri}
                className="mt-3 inline-block text-xs font-bold text-primary hover:underline"
              >
                Ouvrir dans une application compatible
              </a>
            </section>

            <section className="rounded-2xl border border-warning-border bg-warning-surface p-4">
              <h2 className="text-sm font-black text-stone-900">
                2. Conservez vos codes de secours
              </h2>
              <p className="mt-1 text-xs text-stone-600">
                Chaque code ne fonctionne qu’une fois. Stockez-les hors de cet
                appareil avant de continuer.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {setup.backupCodes.map((backupCode) => (
                  <code
                    key={backupCode}
                    className="rounded-md bg-white px-2 py-1.5 text-center text-micro font-bold"
                  >
                    {backupCode}
                  </code>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() =>
                  void navigator.clipboard.writeText(
                    setup.backupCodes.join("\n"),
                  )
                }
              >
                <Copy className="h-4 w-4" /> Copier les codes
              </Button>
            </section>

            <form onSubmit={confirm} className="space-y-3">
              <FormField label="3. Code affiché par l’application" required>
                <Input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={AUTH_CONSTRAINTS.verificationCodeLength}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                />
              </FormField>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  busy ||
                  code.length !== AUTH_CONSTRAINTS.verificationCodeLength
                }
              >
                {busy ? "Activation…" : "Activer et ouvrir la console"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
