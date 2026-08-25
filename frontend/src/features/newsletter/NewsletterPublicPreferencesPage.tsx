import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { MarketingSubscriptionView } from "@shongre/contracts";
import { services } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";
import type { NewsletterTopic } from "../../domains/newsletter/newsletter.types";
import { newsletterTopicsService } from "../../domains/newsletter/newsletter.topics";
import { usePageMeta } from "../../hooks/usePageMeta";
import { NewsletterTopicSelector } from "./components/NewsletterTopicSelector";

export const NewsletterPublicPreferencesPage: React.FC = () => {
  usePageMeta({
    title: "Préférences newsletter — Shongre",
    description: "Gérez les thèmes de votre newsletter Shongre.",
    canonicalPath: "/newsletter/preferences",
    noIndex: true,
  });
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [subscription, setSubscription] =
    useState<MarketingSubscriptionView | null>(null);
  const [topics, setTopics] = useState<NewsletterTopic[]>([]);
  const [state, setState] = useState<
    "loading" | "ready" | "saving" | "saved" | "error"
  >("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    services.marketing
      .getPublicPreferences(token)
      .then((value) => {
        setSubscription(value);
        setTopics(value.topics as NewsletterTopic[]);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [token]);

  const save = async () => {
    setState("saving");
    try {
      const value = await services.marketing.updatePublicPreferences({
        token,
        topics,
      });
      setSubscription(value);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  if (state === "loading")
    return (
      <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-24 text-stone-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        Chargement des préférences…
      </div>
    );
  if (state === "error" || !subscription)
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div
          className="flex gap-3 rounded-2xl border border-danger-border bg-danger-surface p-5 text-danger"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h1 className="font-bold">Lien invalide ou expiré</h1>
            <p className="mt-1 text-sm">
              Aucune préférence n’a été modifiée. Utilisez le lien de votre
              dernier email.
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          Newsletter Shongre
        </p>
        <h1 className="mt-1 text-2xl font-black text-stone-900">
          Vos préférences
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Choisissez les contenus adressés à{" "}
          <strong>{subscription.email}</strong>.
        </p>
      </header>
      {state === "saved" && (
        <div
          className="flex items-center gap-2 rounded-2xl border border-success-border bg-success-surface p-4 text-sm text-success"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Préférences enregistrées.
        </div>
      )}
      <section className="rounded-3xl border border-border-base bg-white p-5 sm:p-7">
        <NewsletterTopicSelector
          topics={newsletterTopicsService.getAllTopics()}
          selectedTopicIds={topics}
          onChange={setTopics}
        />
      </section>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={save}
        disabled={state === "saving"}
      >
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        {state === "saving" ? "Enregistrement…" : "Enregistrer mes préférences"}
      </Button>
    </main>
  );
};
