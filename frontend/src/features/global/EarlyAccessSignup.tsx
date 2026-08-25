"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { services } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";

export function EarlyAccessSignup({
  marketCode,
  locale,
}: {
  marketCode: string;
  locale: string;
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!consent) {
      setError(
        "Confirmez que vous souhaitez recevoir l’actualité du lancement.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await services.marketing.subscribePublic({
        email: email.trim(),
        marketCode,
        locale,
        topics: ["market_launch"],
        source: "FORM",
        consentGiven: true,
      });
      setIsComplete(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’enregistrer la demande pour le moment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div
        className="mx-auto mt-8 flex max-w-xl items-start gap-3 border-y border-success-border bg-success-surface px-4 py-4 text-left"
        role="status"
      >
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-success"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-black text-success">Demande enregistrée</p>
          <p className="mt-1 text-xs leading-relaxed text-success">
            Consultez votre messagerie pour confirmer votre inscription.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-8 max-w-xl border-y border-border-base py-6 text-left"
    >
      <h2 className="text-base font-black">Être informé du lancement</h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">
        Recevez uniquement les informations liées à l’ouverture de ce marché.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Adresse email</span>
          <Mail
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
            aria-hidden="true"
          />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="votre@email.com"
            disabled={isSubmitting}
            className="h-control-touch w-full rounded-control border border-border-base bg-white pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
        >
          Me prévenir
        </Button>
      </div>
      <label className="mt-3 flex min-h-6 cursor-pointer items-start gap-2 text-xs leading-relaxed text-stone-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong text-primary focus:ring-primary"
        />
        <span>
          J’accepte de recevoir par email les actualités du lancement. Je peux
          me désabonner à tout moment.
        </span>
      </label>
      {error && (
        <p className="mt-3 text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
