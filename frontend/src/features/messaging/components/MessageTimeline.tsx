import React, { useRef, useEffect } from "react";
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Image as DollarSign,
  ShieldCheck,
  Maximize2,
  Info,
} from "lucide-react";
import {
  TimelineItem,
  UserTimelineMessage,
  SystemTimelineEvent,
  TypingState,
} from "../../../domains/messaging/messaging.types";
import {
  messagingService,
  TimelineDateGroup,
} from "../../../domains/messaging/messaging.service";
import { Button } from "../../../design-system/primitives/Button";
import { Image } from "../../../design-system/primitives/Image";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useRegionalFormatters } from "../../../hooks/useRegionalFormatters";

interface MessageTimelineProps {
  items: TimelineItem[];
  currentUserId: string;
  typingState?: TypingState | null;
  onOpenImage: (url: string) => void;
  onRetryMessage?: (msg: UserTimelineMessage) => void;
  onRespondOffer?: (offerId: string, accept: boolean, amount?: number) => void;
  onWithdrawOffer?: (offerId: string) => void;
}

export const MessageTimeline: React.FC<MessageTimelineProps> = ({
  items,
  currentUserId,
  typingState,
  onOpenImage,
  onRetryMessage,
  onRespondOffer,
  onWithdrawOffer,
}) => {
  const { t } = useTranslation();
  const { currentLocale, formatMoney } = useRegionalFormatters();
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll the message list, not the page.
   *
   * This was `bottomRef.current?.scrollIntoView()`. That method walks *every*
   * scrollable ancestor, and the thread lives inside the ordinary page shell —
   * so bringing the last message into view also scrolled the document. The
   * inbox opened at `scrollY = 615` of a 1703px page: the header gone, the
   * conversation off-screen, and the footer filling half the viewport. The user
   * had to scroll up to see the conversation they had just opened.
   *
   * Setting `scrollTop` on the list itself cannot move anything outside it.
   * `scrollHeight` is read after paint via the effect, so it already accounts
   * for the message that triggered it.
   */
  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [items, typingState]);

  const groups: TimelineDateGroup[] = messagingService.groupTimelineByDate(
    items,
    currentLocale,
  );

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString(currentLocale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    /* A scrollable region needs to be reachable by keyboard, otherwise a
       keyboard-only user can read only the messages that happen to fit. The
       role/label pair keeps it announced as the message history rather than as
       an unnamed scroll box. */
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-stone-50/50"
      tabIndex={0}
      role="log"
      aria-label={t("messaging.messageTimeline.historiqueDeLaConversation")}
    >
      {groups.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500 space-y-2">
          <Info className="w-8 h-8 text-stone-300" />
          <p className="text-xs font-bold text-stone-600">
            {t("messaging.messageTimeline.debutDeLaConversation")}
          </p>
          <p className="text-micro text-stone-500 max-w-xs">
            {t("messaging.messageTimeline.posezVosQuestionsAuVendeur")}
          </p>
        </div>
      ) : (
        groups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-4">
            {/* Date Separator Pill */}
            <div className="flex items-center justify-center">
              <span className="px-3 py-1 bg-stone-200/80 text-stone-600 text-micro font-bold uppercase tracking-wider rounded-full shadow-2xs">
                {group.dateLabel}
              </span>
            </div>

            {/* Messages & Events */}
            <div className="space-y-3">
              {group.items.map((item) => {
                if (item.itemType === "system_event") {
                  const sys = item as SystemTimelineEvent;
                  return (
                    <div key={sys.id} className="my-3 flex justify-center">
                      <div className="max-w-md w-full bg-white border border-border-base rounded-2xl p-3.5 shadow-2xs text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-900">
                          <ShieldCheck className="w-icon-md h-icon-md text-primary" />
                          <span>{sys.title}</span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed font-medium">
                          {sys.description}
                        </p>
                        <span className="text-micro text-stone-500 font-semibold block pt-0.5">
                          {formatTime(sys.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Regular User Message
                const msg = item as UserTimelineMessage;
                const isMe = msg.senderId === currentUserId;
                const isOffer = msg.contentType === "offer";
                const offerId = msg.offerId || msg.id;
                const offerStatus =
                  msg.offerStatus === "pending" &&
                  msg.offerExpiresAt &&
                  msg.offerExpiresAt <= new Date().toISOString()
                    ? "expired"
                    : msg.offerStatus || "pending";
                const offerLabel = formatMoney({
                  amountMinor:
                    msg.offerAmountMinor ??
                    Math.round((msg.offerAmount || 0) * 100),
                  currency: msg.offerCurrency || "EUR",
                });
                const offerStatusLabel = {
                  pending: "En attente",
                  accepted: "Acceptée",
                  declined: "Refusée",
                  countered: "Remplacée par une contre-offre",
                  withdrawn: "Retirée",
                  expired: "Expirée",
                }[offerStatus];

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} group`}
                  >
                    {!isMe && (
                      <span className="text-micro font-bold text-stone-500 mb-1 ml-1">
                        {msg.senderName}
                      </span>
                    )}

                    <div
                      className={`max-w-message-bubble sm:max-w-message-bubble-wide rounded-2xl px-4 py-2.5 shadow-2xs text-xs font-medium ${
                        isMe
                          ? "bg-primary text-white rounded-br-xs"
                          : "bg-white text-stone-900 border border-border-base rounded-bl-xs"
                      }`}
                    >
                      {/* Photo Attachment */}
                      {msg.attachment?.url && (
                        <button
                          type="button"
                          onClick={() => onOpenImage(msg.attachment!.url)}
                          className="mb-2 relative block w-full group/img cursor-pointer overflow-hidden rounded-xl text-left"
                          aria-label="Agrandir l’image partagée"
                        >
                          <Image
                            src={msg.attachment.url}
                            alt={t("messaging.messageTimeline.photoPartagee")}
                            sizes="(max-width: 640px) 75vw, 320px"
                            className="max-h-60 w-full object-cover rounded-xl border border-white/20 hover:scale-102 transition-transform"
                          />
                          <span className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover/img:opacity-100 group-focus-visible/img:opacity-100 transition-opacity">
                            <Maximize2 className="w-icon-sm h-icon-sm" />
                          </span>
                        </button>
                      )}

                      {/* Offer Card */}
                      {isOffer && (
                        <div className="p-2.5 rounded-xl bg-warning-surface border border-warning-border text-warning mb-2 space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <DollarSign className="w-icon-md h-icon-md text-warning" />
                            <span>Offre proposée : {offerLabel}</span>
                          </div>
                          <p className="text-micro font-bold" role="status">
                            {offerStatusLabel}
                          </p>
                          {offerStatus === "pending" &&
                            !isMe &&
                            onRespondOffer && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  fullWidth
                                  onClick={() =>
                                    onRespondOffer(
                                      offerId,
                                      true,
                                      msg.offerAmount,
                                    )
                                  }
                                >
                                  Accepter
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  fullWidth
                                  onClick={() =>
                                    onRespondOffer(
                                      offerId,
                                      false,
                                      msg.offerAmount,
                                    )
                                  }
                                >
                                  Refuser
                                </Button>
                              </div>
                            )}
                          {offerStatus === "pending" &&
                            isMe &&
                            onWithdrawOffer && (
                              <Button
                                variant="outline"
                                size="sm"
                                fullWidth
                                onClick={() => onWithdrawOffer(offerId)}
                              >
                                Retirer l’offre
                              </Button>
                            )}
                        </div>
                      )}

                      {/* Text content */}
                      <p className="leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>

                      {/* Timestamp & Status Ticks */}
                      <div
                        /* `text-white/75` on the terracotta bubble measured
                           3.48:1 — the timestamp and read receipt are real
                           content, so they take the full-strength white the
                           message body already uses. */
                        className={`flex items-center justify-end gap-1 text-micro mt-1 ${
                          isMe ? "text-white" : "text-stone-500"
                        }`}
                      >
                        <span>{formatTime(msg.createdAt)}</span>

                        {isMe && (
                          <span className="inline-flex items-center">
                            {msg.status === "sending" && (
                              <Clock className="w-icon-xs h-icon-xs animate-spin" />
                            )}
                            {msg.status === "sent" && (
                              <Check className="w-icon-xs h-icon-xs" />
                            )}
                            {msg.status === "delivered" && (
                              <CheckCheck className="w-icon-xs h-icon-xs text-white/90" />
                            )}
                            {msg.status === "read" && (
                              <CheckCheck className="w-icon-xs h-icon-xs text-white" />
                            )}
                            {msg.status === "failed" && (
                              <span className="flex items-center gap-1 text-red-200 font-bold">
                                <AlertCircle className="w-icon-xs h-icon-xs" />
                                <span>
                                  {t("messaging.messageTimeline.echec")}
                                </span>
                                {onRetryMessage && (
                                  <button
                                    type="button"
                                    onClick={() => onRetryMessage(msg)}
                                    className="underline ml-0.5 hover:text-white"
                                  >
                                    {t("messaging.messageTimeline.reessayer")}
                                  </button>
                                )}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Real-time Typing Indicator */}
      {typingState?.isTyping && (
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 bg-white border border-border-base px-3 py-1.5 rounded-full w-fit shadow-2xs animate-fade-in">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
          </span>
          <span>{typingState.userName} est en train d'écrire...</span>
        </div>
      )}

      {/* Sentinel kept as the visual end-of-list spacer; scrolling is done on
          the list container above, not by scrolling this into view. */}
      <div aria-hidden="true" />
    </div>
  );
};
