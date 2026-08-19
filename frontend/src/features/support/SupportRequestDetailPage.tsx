import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Headphones,
  Send,
  CheckCircle2,
  Paperclip,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { Textarea } from '../../design-system/primitives/FormField';
import { SupportRequest, SupportAttachment } from '../../domains/support/support.types';
import { supportService } from '../../domains/support/support.service';
import { supportRepository } from '../../repositories/support.repository';
import { formatDate } from '../../utilities/formatters';
import { SupportContextCard } from './components/SupportContextCard';
import { Skeleton } from '../../design-system/primitives/UIComponents';
import { useTranslation } from '../../i18n/I18nProvider';

export const SupportRequestDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [request, setRequest] = useState<SupportRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const found = await supportRepository.getRequestById(id);
        setRequest(found);
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
      const updated = await supportRepository.addReply(
        request.id,
        replyText.trim(),
        {
          id: currentUser.id,
          name: currentUser.name,
          type: 'user',
        }
      );
      setRequest(updated);
      setReplyText('');
      toast.success('Votre message a été ajouté au dossier.', 'Réponse transmise');
    } catch (err: any) {
      toast.error(err.message || 'Impossible d\'envoyer votre réponse.', 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateAgentReply = async () => {
    if (!request) return;
    try {
      const updated = await supportRepository.simulateAgentReply(
        request.id,
        'Bonjour, merci pour ces précisions. Votre dossier a été mis à jour et validé par notre équipe. N\'hésitez pas si vous avez une autre question !'
      );
      setRequest(updated);
      toast.info('Une réponse du conseiller Hugo a été simulée.', 'Simulation Support');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMarkResolved = async () => {
    if (!request) return;
    try {
      const updated = await supportRepository.resolveRequest(request.id);
      setRequest(updated);
      toast.success('Le dossier est désormais marqué comme résolu.', 'Demande résolue');
    } catch (err: any) {
      console.error(err);
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
        <h3 className="text-base font-black text-stone-900">Dossier d'assistance introuvable</h3>
        <Button variant="outline" size="sm" onClick={() => navigate('/compte/support')}>{t('support.supportRequestDetailPage.retourAMesDemandes2')}</Button>
      </div>
    );
  }

  const statusInfo = supportService.getStatusInfo(request.status);
  const isClosedOrResolved = request.status === 'resolved' || request.status === 'closed';

  return (
    <div className="space-y-6">
      {/* 1. Back Navigation & Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/compte/support')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('support.supportRequestDetailPage.retourAMesDemandes')}</span>
        </button>

        {!isClosedOrResolved && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkResolved}
            className="font-bold flex items-center gap-1.5 text-success hover:text-success"
          >
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>{t('support.supportRequestDetailPage.marquerCommeResolu')}</span>
          </Button>
        )}
      </div>

      {/* 2. Request Header Card */}
      <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black font-mono text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
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
          <h1 className="text-lg sm:text-xl font-black text-stone-900">{request.subject}</h1>
          <p className="text-xs text-stone-500 mt-0.5">{statusInfo.description}</p>
        </div>

        {/* Linked Context Card if any */}
        {request.context && <SupportContextCard context={request.context} />}
      </div>

      {/* 3. Messages Timeline */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-stone-700 px-1">
          Historique des échanges ({request.messages.length})
        </h2>

        <div className="space-y-3">
          {request.messages.map((msg) => {
            const isAgent = msg.authorType === 'agent';

            return (
              <div
                key={msg.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isAgent
                    ? 'bg-primary/5 border-primary/20 mr-4 sm:mr-12'
                    : 'bg-white border-border-base ml-4 sm:ml-12'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isAgent
                          ? 'bg-primary text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {isAgent ? <Headphones className="w-3.5 h-3.5" /> : msg.authorName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-black text-stone-900 block leading-tight">
                        {msg.authorName}
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
                  {msg.content}
                </p>

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-3 pl-9 flex flex-wrap gap-2">
                    {msg.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-medium text-stone-800"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-stone-400" />
                        <span>{att.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Reply Composer or Closed Banner */}
      {isClosedOrResolved ? (
        <div className="p-4 bg-stone-100 border border-stone-200 rounded-2xl text-center text-xs text-stone-600 font-medium">
          Ce dossier est résolu ou clôturé. Si vous rencontrez un nouveau problème, veuillez{' '}
          <button
            type="button"
            onClick={() => navigate('/contact')}
            className="text-primary font-bold hover:underline"
          >{t('support.supportRequestDetailPage.ouvrirUneNouvelleDemande')}</button>
          .
        </div>
      ) : (
        <form
          onSubmit={handleSendReply}
          className="bg-white border border-border-base rounded-3xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-700">{t('support.supportRequestDetailPage.repondreANotreEquipe')}</h3>

            {/* Demo test button */}
            <button
              type="button"
              onClick={handleSimulateAgentReply}
              className="text-micro font-bold text-warning bg-warning-surface hover:bg-warning-surface border border-warning-border px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-warning" />
              <span>{t('support.supportRequestDetailPage.simulerReponseConseillerDemo')}</span>
            </button>
          </div>

          <Textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t('support.supportRequestDetailPage.ecrivezVotreMessageOuVos')}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !replyText.trim()}
              className="font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Envoi...' : 'Envoyer ma réponse'}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
