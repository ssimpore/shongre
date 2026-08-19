import React, { useState, useRef } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  Sparkles,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { ConversationCapabilities } from '../../../domains/messaging/messaging.types';
import { Button } from '../../../design-system/primitives/Button';
import { Image } from '../../../design-system/primitives/Image';
import { useTranslation } from '../../../i18n/I18nProvider';

interface MessageComposerProps {
  onSendMessage: (text: string, attachmentUrl?: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  capabilities: ConversationCapabilities;
  isPro?: boolean;
}

const SAMPLE_ATTACHMENTS = [
  { label: 'Photo état', url: 'https://images.unsplash.com/photo-1580481077195-c3a9927b74b7?auto=format&fit=crop&w=800&q=80' },
  { label: 'Facture / Garantie', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80' },
  { label: 'Accessoires inclus', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80' },
];

const PRO_QUICK_REPLIES = [
  'Bonjour, oui, l\'article est disponible en stock.',
  'Bonjour, expédition possible sous 24h avec suivi.',
  'Bonjour, nous pouvons convenir d\'un retrait en boutique.',
  'Bonjour, facture avec TVA fournie sur demande.',
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onTyping,
  capabilities,
  isPro = false,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Typing debounce
    if (onTyping) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if ((!text.trim() && !attachedPhoto) || isSending || !capabilities.canSend) return;

    setIsSending(true);
    try {
      if (onTyping) onTyping(false);
      await onSendMessage(text.trim(), attachedPhoto || undefined);
      setText('');
      setAttachedPhoto(null);
      setShowPhotoPicker(false);
    } finally {
      setIsSending(false);
    }
  };

  if (!capabilities.canSend) {
    return (
      <div className="p-4 bg-stone-100 border-t border-border-base text-center text-xs font-semibold text-stone-500 flex items-center justify-center gap-2 shrink-0">
        <ShieldAlert className="w-4 h-4 text-stone-400" />
        <span>{capabilities.disabledReason || 'Vous ne pouvez pas envoyer de message dans cette conversation.'}</span>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-border-base p-3 sm:p-4 shrink-0 space-y-2">
      {/* Attached Photo Preview Bubble */}
      {attachedPhoto && (
        <div className="flex items-center gap-2 p-2 bg-stone-50 border border-border-base rounded-xl w-fit">
          <Image src={attachedPhoto} alt={t('messaging.messageComposer.apercuPieceJointe')} sizes="48px"
  className="w-12 h-12 object-cover rounded-lg" />
          <div className="text-xs">
            <span className="font-bold text-stone-800 block">{t('messaging.messageComposer.photoPreteAEtreEnvoyee')}</span>
            <span className="text-micro text-stone-500">{t('messaging.messageComposer.seraTransmiseAvecVotreMessage')}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedPhoto(null)}
            className="p-1 text-stone-500 hover:text-stone-700 rounded-lg hover:bg-stone-200"
            aria-label={t('messaging.messageComposer.supprimerLaPhoto')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Photo Picker Popover */}
      {showPhotoPicker && (
        <div className="p-3 bg-stone-50 border border-border-base rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-800">{t('messaging.messageComposer.ajouterUnePhotoALa')}</span>
            <button
              type="button"
              onClick={() => setShowPhotoPicker(false)}
              className="text-stone-500 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE_ATTACHMENTS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAttachedPhoto(s.url);
                  setShowPhotoPicker(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border-base bg-white hover:border-primary hover:shadow-2xs transition-all text-center"
              >
                <Image src={s.url} alt={s.label} sizes="40px"
  className="w-10 h-10 object-cover rounded" />
                <span className="text-micro font-semibold text-stone-700 truncate w-full">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pro Quick Replies */}
      {isPro && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {PRO_QUICK_REPLIES.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setText(reply)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-micro font-semibold shrink-0 transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setShowPhotoPicker(!showPhotoPicker)}
          className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
            attachedPhoto || showPhotoPicker
              ? 'bg-primary text-white border-primary'
              : 'border-border-base text-stone-500 hover:text-stone-900 hover:bg-stone-100'
          }`}
          title={t('messaging.messageComposer.joindreUnePhoto')}
          aria-label={t('messaging.messageComposer.joindreUnePhoto')}
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={t('messaging.messageComposer.ecrivezVotreMessageEntreePour')}
            className="w-full min-h-[42px] max-h-32 px-3.5 py-2.5 text-xs font-semibold bg-stone-50 border border-border-base rounded-xl focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-stone-400 resize-none"
          />
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={(!text.trim() && !attachedPhoto) || isSending}
          isLoading={isSending}
          leftIcon={<Send className="w-4 h-4" />}
          className="h-[42px] px-4"
        >
          <span className="hidden sm:inline">Envoyer</span>
        </Button>
      </div>
    </div>
  );
};
