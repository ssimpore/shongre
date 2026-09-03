import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Headphones, Send } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { Badge } from "../../design-system/primitives/Badge";
import { Textarea } from "../../design-system/primitives/FormField";
import type { SupportCase, SupportCaseNote } from "@shongre/contracts/support";
import { supportService } from "../../domains/support/support.service";
import { services } from "../../api/client/service-registry";
import { formatDate } from "../../utilities/formatters";
import { Skeleton } from "../../design-system";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

export const SupportRequestDetailPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.supportRequestDetail.title"),
    description: t("meta.supportRequestDetail.description"),
    noIndex: true,
  });

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [request, setRequest] = useState<SupportCase | null>(null);
  const [notes, setNotes] = useState<SupportCaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const found = await services.support.getCase(id);
        setRequest(found.case);
        setNotes(found.notes);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !replyText.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      await services.support.addNote(request.id, {
        visibility: "customer",
        body: replyText.trim(),
      });
      const updated = await services.support.getCase(request.id);
      setRequest(updated.case);
      setNotes(updated.notes);
      setReplyText("");
      toast.success(
        "Votre message a été ajouté au dossier.",
        "Réponse transmise",
      );
    } catch (err: any) {
      toast.error(
        err.message || "Impossible d'envoyer votre réponse.",
        "Erreur",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-white border border-border-base rounded-3xl p-10 text-center space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-stone-900">
          Dossier d'assistance introuvable
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/compte/support")}
        >
          {t("support.supportRequestDetailPage.retourAMesDemandes2")}
        </Button>
      </div>
    );
  }

  const statusInfo = supportService.getStatusInfo(request.status);
  const isClosedOrResolved =
    request.status === "resolved" || request.status === "closed";

  return (
    <div className="space-y-6">
      {/* 1. Back Navigation & Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate("/compte/support")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-icon-md h-icon-md" />
          <span>
            {t("support.supportRequestDetailPage.retourAMesDemandes")}
          </span>
        </button>
      </div>

      {/* 2. Request Header Card */}
      <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold font-mono text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
              {request.reference}
            </span>
            <Badge variant={statusInfo.variant} size="md">
              {statusInfo.label}
            </Badge>
          </div>

          <span className="text-xs text-stone-500 font-medium">
            Ouvert le {formatDate(request.createdAt)}
          </span>
        </div>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900">
            {request.subject}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {statusInfo.description}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-stone-700">
          {request.description}
        </p>
      </div>

      {/* 3. Messages Timeline */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 px-1">
          Historique des échanges ({notes.length})
        </h2>

        <div className="space-y-3">
          {notes.map((msg) => {
            const isAgent = msg.authorId !== request.requesterId;

            return (
              <div
                key={msg.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isAgent
                    ? "bg-primary/5 border-primary/20 mr-4 sm:mr-12"
                    : "bg-white border-border-base ml-4 sm:ml-12"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isAgent
                          ? "bg-primary text-white"
                          : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {isAgent ? (
                        <Headphones className="w-icon-sm h-icon-sm" />
                      ) : (
                        currentUser?.name?.charAt(0) || "V"
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-900 block leading-tight">
                        {isAgent
                          ? "Équipe Support Shongre"
                          : currentUser?.name || "Vous"}
                      </span>
                      {isAgent && (
                        <span className="text-micro font-bold text-primary block">
                          Conseiller Support Shongre
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-micro text-stone-500 font-medium">
                    {formatDate(msg.createdAt)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-line pl-9">
                  {msg.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Reply Composer or Closed Banner */}
      {isClosedOrResolved ? (
        <div className="p-4 bg-stone-100 border border-stone-200 rounded-2xl text-center text-xs text-stone-600 font-medium">
          Ce dossier est résolu ou clôturé. Si vous rencontrez un nouveau
          problème, veuillez{" "}
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="text-primary font-semibold hover:underline"
          >
            {t("support.supportRequestDetailPage.ouvrirUneNouvelleDemande")}
          </button>
          .
        </div>
      ) : (
        <form
          onSubmit={handleSendReply}
          className="bg-white border border-border-base rounded-3xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              {t("support.supportRequestDetailPage.repondreANotreEquipe")}
            </h3>
          </div>

          <Textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t(
              "support.supportRequestDetailPage.ecrivezVotreMessageOuVos",
            )}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !replyText.trim()}
              className="font-semibold flex items-center gap-2"
            >
              <Send className="w-icon-md h-icon-md" />
              <span>{isSubmitting ? "Envoi..." : "Envoyer ma réponse"}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
