import React, { useRef, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  RotateCw,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  ShieldCheck,
  Maximize2,
  Info,
} from 'lucide-react';
import {
  TimelineItem,
  UserTimelineMessage,
  SystemTimelineEvent,
  TypingState,
} from '../../../domains/messaging/messaging.types';
import { messagingService, TimelineDateGroup } from '../../../domains/messaging/messaging.service';
import { Button } from '../../../design-system/primitives/Button';
import { Badge } from '../../../design-system/primitives/Badge';
import { formatPrice } from '../../../utilities/formatters';
import { Image } from '../../../design-system/primitives/Image';

interface MessageTimelineProps {
  items: TimelineItem[];
  currentUserId: string;
  typingState?: TypingState | null;
  onOpenImage: (url: string) => void;
  onRetryMessage?: (msg: UserTimelineMessage) => void;
  onRespondOffer?: (accept: boolean, amount?: number) => void;
}

export const MessageTimeline: React.FC<MessageTimelineProps> = ({
  items,
  currentUserId,
  typingState,
  onOpenImage,
  onRetryMessage,
  onRespondOffer,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items, typingState]);

  const groups: TimelineDateGroup[] = messagingService.groupTimelineByDate(items);

  const formatTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-stone-50/50">
      {groups.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500 space-y-2">
          <Info className="w-8 h-8 text-stone-300" />
          <p className="text-xs font-bold text-stone-600">Début de la conversation</p>
          <p className="text-micro text-stone-500 max-w-xs">
            Posez vos questions au vendeur ou convenez d'un point de rencontre.
          </p>
        </div>
      ) : (
        groups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-4">
            {/* Date Separator Pill */}
            <div className="flex items-center justify-center">
              <span className="px-3 py-1 bg-stone-200/80 text-stone-600 text-micro font-extrabold uppercase tracking-wider rounded-full shadow-2xs">
                {group.dateLabel}
              </span>
            </div>

            {/* Messages & Events */}
            <div className="space-y-3">
              {group.items.map((item) => {
                if (item.itemType === 'system_event') {
                  const sys = item as SystemTimelineEvent;
                  return (
                    <div key={sys.id} className="my-3 flex justify-center">
                      <div className="max-w-md w-full bg-white border border-border-base rounded-2xl p-3.5 shadow-2xs text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-black text-stone-900">
                          <ShieldCheck className="w-4 h-4 text-primary" />
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
                const isOffer = msg.contentType === 'offer';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    {!isMe && (
                      <span className="text-micro font-bold text-stone-500 mb-1 ml-1">
                        {msg.senderName}
                      </span>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-2xs text-xs font-medium ${
                        isMe
                          ? 'bg-primary text-white rounded-br-xs'
                          : 'bg-white text-stone-900 border border-border-base rounded-bl-xs'
                      }`}
                    >
                      {/* Photo Attachment */}
                      {msg.attachment?.url && (
                        <div className="mb-2 relative group/img cursor-pointer overflow-hidden rounded-xl">
                          <Image
                            src={msg.attachment.url}
                            alt="Photo partagée"
                            className="max-h-60 w-full object-cover rounded-xl border border-white/20 hover:scale-102 transition-transform"
                            onClick={() => onOpenImage(msg.attachment!.url)}
                          />
                          <button
                            type="button"
                            onClick={() => onOpenImage(msg.attachment!.url)}
                            className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-opacity"
                            aria-label="Agrandir l'image"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Offer Card */}
                      {isOffer && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 mb-2 space-y-2">
                          <div className="flex items-center gap-1.5 font-extrabold text-xs">
                            <DollarSign className="w-4 h-4 text-amber-600" />
                            <span>Offre proposée : {formatPrice(msg.offerAmount || 0)}</span>
                          </div>
                          {!isMe && onRespondOffer && (
                            <div className="flex gap-2 pt-1">
                              <Button
                                variant="primary"
                                size="sm"
                                fullWidth
                                onClick={() => onRespondOffer(true, msg.offerAmount)}
                              >
                                Accepter
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                fullWidth
                                onClick={() => onRespondOffer(false, msg.offerAmount)}
                              >
                                Refuser
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Text content */}
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>

                      {/* Timestamp & Status Ticks */}
                      <div
                        className={`flex items-center justify-end gap-1 text-micro mt-1 ${
                          isMe ? 'text-white/75' : 'text-stone-500'
                        }`}
                      >
                        <span>{formatTime(msg.createdAt)}</span>

                        {isMe && (
                          <span className="inline-flex items-center">
                            {msg.status === 'sending' && <Clock className="w-3 h-3 animate-spin" />}
                            {msg.status === 'sent' && <Check className="w-3 h-3" />}
                            {msg.status === 'delivered' && <CheckCheck className="w-3 h-3 text-white/90" />}
                            {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-white" />}
                            {msg.status === 'failed' && (
                              <span className="flex items-center gap-1 text-red-200 font-bold">
                                <AlertCircle className="w-3 h-3" />
                                <span>Échec</span>
                                {onRetryMessage && (
                                  <button
                                    type="button"
                                    onClick={() => onRetryMessage(msg)}
                                    className="underline ml-0.5 hover:text-white"
                                  >
                                    Réessayer
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

      <div ref={bottomRef} />
    </div>
  );
};
