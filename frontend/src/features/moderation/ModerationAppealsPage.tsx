import React, { useCallback, useEffect, useState } from "react";
import { Scale, ShieldAlert } from "lucide-react";
import { services } from "../../api/client/service-registry";
import type {
  ModerationAppeal,
  OwnModerationCase,
} from "../../api/contracts/moderation.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import {
  Badge,
  Button,
  FormField,
  Modal,
  Skeleton,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { MODERATION_CONSTRAINTS } from "@shongre/contracts";

const statusLabels: Record<string, string> = {
  open: "Ouvert",
  triaged: "Qualifié",
  under_review: "En cours d’examen",
  actioned: "Décision appliquée",
  dismissed: "Classé sans suite",
  appealed: "Recours en cours",
  closed: "Clôturé",
  submitted: "Transmis",
  upheld: "Décision confirmée",
  overturned: "Décision annulée",
  rejected: "Recours rejeté",
  withdrawn: "Retiré",
};

export const ModerationAppealsPage: React.FC = () => {
  usePageMeta({
    title: "Décisions et recours | Shongre",
    description: "Consultez les décisions de modération et déposez un recours.",
    canonicalPath: "/compte/recours",
    noIndex: true,
  });
  const { currentUser } = useAuth();
  const toast = useToast();
  const { currentLocale } = useMarketLocation();
  const userId = currentUser?.id || "user-thomas";
  const [cases, setCases] = useState<OwnModerationCase[]>([]);
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
  const [selectedCase, setSelectedCase] = useState<OwnModerationCase | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ownCases, ownAppeals] = await Promise.all([
        services.moderation.listOwnCases(userId),
        services.moderation.listOwnAppeals(userId),
      ]);
      setCases(ownCases);
      setAppeals(ownAppeals);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(currentLocale, { dateStyle: "medium" }).format(
      new Date(value),
    );

  const submitAppeal = async () => {
    if (!selectedCase || reason.trim().length < 20) {
      toast.info("Décrivez votre contestation en au moins 20 caractères.");
      return;
    }
    setIsSubmitting(true);
    try {
      await services.moderation.submitAppeal(
        selectedCase.id,
        userId,
        reason.trim(),
      );
      setSelectedCase(null);
      setReason("");
      toast.success(
        "Votre recours a été transmis pour un réexamen indépendant.",
      );
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2.5">
          <Scale
            className="w-icon-xl h-icon-xl text-primary"
            aria-hidden="true"
          />
          Décisions et recours
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Les recours sont examinés par une personne différente de celle ayant
          pris la décision initiale.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2].map((item) => (
            <Skeleton key={item} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-2xl border border-border-base bg-white p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-stone-400" />
          <h2 className="mt-3 text-base font-bold text-stone-900">
            Aucune décision de modération
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Les éventuelles décisions concernant votre compte ou vos annonces
            apparaîtront ici.
          </p>
        </div>
      ) : (
        <section aria-labelledby="moderation-cases-title" className="space-y-3">
          <h2
            id="moderation-cases-title"
            className="text-base font-black text-stone-900"
          >
            Vos dossiers
          </h2>
          {cases.map((item) => {
            const activeAppeal = appeals.find(
              (appeal) => appeal.caseId === item.id,
            );
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-border-base bg-white p-4 sm:p-5 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-stone-900">
                      {item.targetType === "listing"
                        ? "Décision concernant une annonce"
                        : "Décision concernant votre compte"}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Dossier ouvert le {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <Badge variant="neutral">
                    {statusLabels[activeAppeal?.status || item.status] ||
                      item.status}
                  </Badge>
                </div>
                {item.resolutionReason && (
                  <p className="mt-3 rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-700">
                    {item.resolutionReason}
                  </p>
                )}
                {activeAppeal?.decisionReason && (
                  <p className="mt-2 text-xs text-stone-600">
                    Motif du réexamen : {activeAppeal.decisionReason}
                  </p>
                )}
                {item.status === "actioned" && !activeAppeal && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setSelectedCase(item)}
                  >
                    Déposer un recours
                  </Button>
                )}
              </article>
            );
          })}
        </section>
      )}

      <Modal
        isOpen={Boolean(selectedCase)}
        onClose={() => {
          setSelectedCase(null);
          setReason("");
        }}
        title="Déposer un recours"
        description="Expliquez précisément pourquoi la décision doit être réexaminée. N’ajoutez aucune donnée de paiement ou d’identité sensible."
      >
        <div className="space-y-4">
          <FormField label="Motif du recours" required>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={MODERATION_CONSTRAINTS.appealReasonMinLength}
              maxLength={MODERATION_CONSTRAINTS.appealReasonMaxLength}
              rows={7}
              required
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedCase(null)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={submitAppeal}
            >
              Transmettre le recours
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
