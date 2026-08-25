import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "../../design-system/primitives/Button";
import { newsletterRepository } from "../../repositories/newsletter.repository";
import { useToast } from "../../app/providers/ToastProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

export const NewsletterConfirmPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.newsletterConfirm.title"),
    description: t("meta.newsletterConfirm.description"),
    canonicalPath: "/newsletter/confirmer",
    noIndex: true,
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"loading" | "confirmed" | "error">(
    "loading",
  );
  const [confirmedEmail, setConfirmedEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    newsletterRepository
      .confirmSubscription(token)
      .then((subscription) => {
        setConfirmedEmail(subscription.email);
        setState("confirmed");
        toast.success(
          "Votre adresse a bien été validée.",
          "Inscription confirmée",
        );
      })
      .catch(() => setState("error"));
  }, [token]);

  if (state === "loading") {
    return (
      <div className="mx-auto flex max-w-md items-center justify-center px-4 py-24 text-stone-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        Validation en cours…
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-white border border-border-base rounded-3xl p-8 sm:p-10 shadow-xs space-y-6">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${state === "confirmed" ? "bg-success-surface text-success" : "bg-danger-surface text-danger"}`}
        >
          {state === "confirmed" ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <AlertCircle className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-stone-900">
            {state === "confirmed"
              ? t("newsletter.newsletterConfirmPage.abonnementConfirme")
              : "Lien invalide ou expiré"}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            {state === "confirmed" ? (
              <>
                L'adresse{" "}
                <strong className="text-stone-900 font-mono">
                  {confirmedEmail}
                </strong>{" "}
                est désormais inscrite à la newsletter Shongre.
              </>
            ) : (
              "Demandez une nouvelle inscription depuis la page Newsletter. Aucun abonnement n’a été modifié."
            )}
          </p>
        </div>

        {state === "confirmed" && (
          <div className="p-4 bg-stone-50 border border-border-base rounded-2xl text-xs text-stone-500 text-left flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <span>
              {t(
                "newsletter.newsletterConfirmPage.vousRecevrezChaqueSemaineLes",
              )}
            </span>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate("/")}
            className="font-bold"
          >
            {t("newsletter.newsletterConfirmPage.explorerLesAnnonces")}
          </Button>
          <Button
            to="/compte/newsletter"
            variant="outline"
            fullWidth
            size="sm"
            className="font-semibold"
          >
            {t("newsletter.newsletterConfirmPage.gererMesThematiques")}
          </Button>
        </div>
      </div>
    </div>
  );
};
