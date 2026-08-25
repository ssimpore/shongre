import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { services } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";
import { useToast } from "../../app/providers/ToastProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

export const NewsletterUnsubscribePage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.newsletterUnsubscribe.title"),
    description: t("meta.newsletterUnsubscribe.description"),
    canonicalPath: "/newsletter/desabonnement",
    noIndex: true,
  });
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState<"ready" | "submitting" | "done" | "error">(token ? "ready" : "error");

  const unsubscribe = async () => {
    setState("submitting");
    try {
      await services.marketing.unsubscribePublic(token);
      setState("done");
      toast.info("Vous êtes désabonné des communications marketing.", "Désinscription confirmée");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="space-y-6 rounded-3xl border border-border-base bg-white p-8 shadow-xs sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
          <Mail className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-stone-900">Désabonnement newsletter</h1>
          <p className="text-xs text-stone-500 sm:text-sm">Le lien sécurisé ne modifie que vos communications marketing.</p>
        </div>

        {state === "done" ? (
          <div className="space-y-5" role="status">
            <div className="rounded-2xl border border-success-border bg-success-surface p-4 text-left text-xs text-success">
              <span className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Désabonnement pris en compte</span>
              <p className="mt-1 leading-relaxed">Vous ne recevrez plus nos campagnes promotionnelles.</p>
            </div>
            <div className="flex items-start gap-2.5 rounded-2xl border border-border-base bg-stone-50 p-4 text-left text-micro text-stone-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span>Les emails de sécurité, de transaction et de service indispensables restent séparés.</span>
            </div>
          </div>
        ) : state === "error" ? (
          <div className="rounded-2xl border border-danger-border bg-danger-surface p-4 text-left text-xs text-danger" role="alert">
            <span className="flex items-center gap-2 font-bold"><AlertCircle className="h-4 w-4" aria-hidden="true" />Lien invalide ou expiré</span>
            <p className="mt-1">Aucune préférence n’a été modifiée. Utilisez le lien du dernier email reçu.</p>
          </div>
        ) : (
          <Button variant="primary" fullWidth size="lg" onClick={unsubscribe} disabled={state === "submitting"}>
            {state === "submitting" ? "Désinscription…" : "Confirmer le désabonnement"}
          </Button>
        )}

        <Button variant="outline" fullWidth onClick={() => navigate("/")}>Retour à l’accueil</Button>
      </div>
    </div>
  );
};
