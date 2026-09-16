import React, { useEffect, useId, useRef, useState } from "react";
import { Send, ShieldAlert } from "lucide-react";
import { ConversationCapabilities } from "../../../domains/messaging/messaging.types";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";
import { MESSAGE_INPUT_CONSTRAINTS } from "../../../api/contracts/messaging.contract";

interface MessageComposerProps {
  onSendMessage: (text: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  capabilities: ConversationCapabilities;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onTyping,
  capabilities,
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (!text.trim() || isSending || !capabilities.canSend) return;

    setIsSending(true);
    try {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      if (onTyping) onTyping(false);
      await onSendMessage(text.trim());
      setText("");
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const canSubmit = Boolean(text.trim()) && !isSending;

  if (!capabilities.canSend) {
    return (
      <div className="p-4 bg-surface-muted border-t border-border-base text-center text-xs font-semibold text-text-tertiary flex items-center justify-center gap-2 shrink-0">
        <ShieldAlert className="w-icon-md h-icon-md text-text-inverse-subtle" />
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
      {/* Input Box */}
      <div className="flex min-w-0 items-end gap-2">
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
            className="block min-h-control-touch max-h-28 w-full resize-none overflow-y-hidden rounded-control border border-border-base bg-bg-base px-3.5 py-2.5 text-sm font-medium leading-5 text-text-main placeholder:text-text-muted focus:border-primary focus:bg-bg-surface focus:outline-none focus:ring-2 focus:ring-focus"
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
          className="w-control-md shrink-0 !px-0 xl:!w-auto xl:!px-4"
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
