import React, { useEffect, useId, useRef, useState } from "react";
import { Send, Image as ImageIcon, X, ShieldAlert } from "lucide-react";
import { ConversationCapabilities } from "../../../domains/messaging/messaging.types";
import { Button } from "../../../design-system/primitives/Button";
import { IconButton } from "../../../design-system/primitives/IconButton";
import { Image } from "../../../design-system/primitives/Image";
import { useTranslation } from "../../../i18n/I18nProvider";
import {
  MESSAGE_INPUT_CONSTRAINTS,
  type MessageAttachmentOption,
} from "../../../api/contracts/messaging.contract";

interface MessageComposerProps {
  onSendMessage: (text: string, attachmentUrl?: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  capabilities: ConversationCapabilities;
  attachmentOptions?: MessageAttachmentOption[];
  quickReplies?: string[];
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onTyping,
  capabilities,
  attachmentOptions = [],
  quickReplies = [],
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoPickerId = useId();
  const keyboardHintId = useId();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "44px";
    const scrollHeight = textarea.scrollHeight;
    const measuredHeight = text ? scrollHeight : 44;
    const nextHeight = Math.min(Math.max(measuredHeight, 44), 112);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = scrollHeight > 112 ? "auto" : "hidden";
  }, [text]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    },
    [],
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Typing debounce
    if (onTyping) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
        typingTimerRef.current = null;
      }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if ((!text.trim() && !attachedPhoto) || isSending || !capabilities.canSend)
      return;

    setIsSending(true);
    try {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      if (onTyping) onTyping(false);
      await onSendMessage(text.trim(), attachedPhoto || undefined);
      setText("");
      setAttachedPhoto(null);
      setShowPhotoPicker(false);
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const canSubmit = Boolean(text.trim() || attachedPhoto) && !isSending;

  if (!capabilities.canSend) {
    return (
      <div className="p-4 bg-stone-100 border-t border-border-base text-center text-xs font-semibold text-stone-500 flex items-center justify-center gap-2 shrink-0">
        <ShieldAlert className="w-icon-md h-icon-md text-stone-400" />
        <span>
          {capabilities.disabledReason ||
            "Vous ne pouvez pas envoyer de message dans cette conversation."}
        </span>
      </div>
    );
  }

  return (
    <form
      data-message-composer
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      className="shrink-0 space-y-2 border-t border-border-base bg-bg-surface p-2.5 sm:p-3"
    >
      {/* Attached Photo Preview Bubble */}
      {attachedPhoto && (
        <div className="flex max-w-full items-center gap-2 rounded-control border border-border-base bg-bg-base p-2">
          <Image
            src={attachedPhoto}
            alt={t("messaging.messageComposer.apercuPieceJointe")}
            sizes="48px"
            className="w-12 h-12 object-cover rounded-lg"
          />
          <div className="min-w-0 flex-1 text-xs">
            <span className="font-bold text-stone-800 block">
              {t("messaging.messageComposer.photoPreteAEtreEnvoyee")}
            </span>
            <span className="block truncate text-micro text-stone-500">
              {t("messaging.messageComposer.seraTransmiseAvecVotreMessage")}
            </span>
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            ariaLabel={t("messaging.messageComposer.supprimerLaPhoto")}
            onClick={() => setAttachedPhoto(null)}
            className="touch-square shrink-0"
          >
            <X className="h-icon-sm w-icon-sm" aria-hidden="true" />
          </IconButton>
        </div>
      )}

      {/* Photo Picker Popover */}
      {showPhotoPicker && (
        <div
          id={photoPickerId}
          className="space-y-2 rounded-control border border-border-base bg-bg-base p-3 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-800">
              {t("messaging.messageComposer.ajouterUnePhotoALa")}
            </span>
            <IconButton
              size="sm"
              variant="ghost"
              ariaLabel={t("common.close")}
              onClick={() => setShowPhotoPicker(false)}
            >
              <X className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </IconButton>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {attachmentOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setAttachedPhoto(option.url);
                  setShowPhotoPicker(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border-base bg-white hover:border-primary hover:shadow-2xs transition-all text-center"
              >
                <Image
                  src={option.url}
                  alt={option.label}
                  sizes="40px"
                  className="w-10 h-10 object-cover rounded"
                />
                <span className="text-micro font-semibold text-stone-700 truncate w-full">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pro Quick Replies */}
      {quickReplies.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickReplies.map((reply) => (
            <button
              key={reply}
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
      <div className="flex min-w-0 items-end gap-2">
        <IconButton
          size="md"
          variant={attachedPhoto || showPhotoPicker ? "primary" : "outline"}
          ariaLabel={t("messaging.messageComposer.joindreUnePhoto")}
          onClick={() => setShowPhotoPicker(!showPhotoPicker)}
          aria-expanded={showPhotoPicker}
          aria-controls={showPhotoPicker ? photoPickerId : undefined}
          className="!h-control-touch !w-control-touch shrink-0"
        >
          <ImageIcon className="h-icon-sm w-icon-sm" aria-hidden="true" />
        </IconButton>

        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            maxLength={MESSAGE_INPUT_CONSTRAINTS.maxLength}
            enterKeyHint="send"
            autoComplete="off"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={t(
              "messaging.messageComposer.ecrivezVotreMessageEntreePour",
            )}
            aria-label={t("messaging.messageComposer.votreMessage")}
            aria-describedby={keyboardHintId}
            className="block min-h-control-touch max-h-28 w-full resize-none overflow-y-hidden rounded-control border border-border-base bg-bg-base px-3.5 py-2.5 text-sm font-medium leading-5 text-text-main placeholder:text-text-muted focus:border-primary focus:bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
          <span id={keyboardHintId} className="sr-only">
            {t("messaging.messageComposer.keyboardHint")}
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          aria-label={t("messaging.messageComposer.envoyer")}
          title={t("messaging.messageComposer.envoyer")}
          disabled={!canSubmit}
          isLoading={isSending}
          className="!h-control-touch !w-control-touch shrink-0 !px-0 xl:!w-auto xl:!px-4"
        >
          {!isSending && (
            <Send className="h-icon-sm w-icon-sm shrink-0" aria-hidden="true" />
          )}
          <span className="sr-only xl:not-sr-only">
            {t("messaging.messageComposer.envoyer")}
          </span>
        </Button>
      </div>
    </form>
  );
};
