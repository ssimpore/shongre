import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Sparkles, MessageSquare, Search } from "lucide-react";
import { routes } from "../../configuration/routes";
import { services } from "../../api/client/service-registry";
import {
  ConversationPreview,
  InboxFilterTab,
  TimelineItem,
  UserTimelineMessage,
  TypingState,
  ListingConversationContext,
} from "../../domains/messaging/messaging.types";
import { messagingService } from "../../domains/messaging/messaging.service";
import { messagingCapabilitiesService } from "../../domains/messaging/messaging.capabilities";
import { messagingRealtimeClient } from "../../domains/messaging/messaging.realtime";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { storageService } from "../../services/storage.service";
import { Transaction } from "../../types";
import { DEMO_USERS } from "../../mocks/initialDemoData";

import { ConversationList } from "./components/ConversationList";
import { ConversationHeader } from "./components/ConversationHeader";
import { ConversationContextBar } from "./components/ConversationContextBar";
import { MessageTimeline } from "./components/MessageTimeline";
import { MessageComposer } from "./components/MessageComposer";
import { PickupSchedulerModal } from "./components/PickupSchedulerModal";
import { MakeOfferModal } from "./components/MakeOfferModal";
import { TransactionDetailModal } from "../transactions/components/TransactionDetailModal";
import { Modal } from "../../design-system/primitives/Modal";
import { useDialogBehavior } from "../../design-system/primitives/useDialogBehavior";
import { Button } from "../../design-system/primitives/Button";
import { Image } from "../../design-system/primitives/Image";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import type { MessageComposerOptions } from "../../api/contracts/messaging.contract";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

const EMPTY_COMPOSER_OPTIONS: MessageComposerOptions = {
  attachmentOptions: [],
  quickReplies: [],
};

export const MessagingPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const { formatPrice } = useMarketLocation();
  usePageMeta({
    title: t("meta.messaging.title"),
    description: t("meta.messaging.description"),
    canonicalPath: "/compte/messages",
    noIndex: true,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, isPro } = useAuth();
  const toast = useToast();

  const currentUserId = currentUser ? currentUser.id : "user-thomas";

  // State
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    searchParams.get("convId"),
  );
  const [activeRawConv, setActiveRawConv] = useState<any | null>(null);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<InboxFilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [composerOptions, setComposerOptions] =
    useState<MessageComposerOptions>(EMPTY_COMPOSER_OPTIONS);

  // Modals & Popovers
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [blockModalTarget, setBlockModalTarget] = useState<string | null>(null);
  const [reportModalTarget, setReportModalTarget] = useState<string | null>(
    null,
  );

  // Real-time typing state
  const [typingState, setTypingState] = useState<TypingState | null>(null);

  // Blocked users set
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  // 1. Load User's Conversations
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rawList, blocked] = await Promise.all([
        services.messaging.getUserConversations(currentUserId),
        services.messaging.getBlockedUserIds(currentUserId),
      ]);
      setBlockedUsers(blocked);

      const previews: ConversationPreview[] = rawList.map((c) => {
        const isBuyer = c.buyerId === currentUserId;
        const counterpartName = isBuyer ? c.sellerName : c.buyerName;
        const counterpartId = isBuyer ? c.sellerId : c.buyerId;
        const counterpartAvatar = isBuyer
          ? c.sellerAvatarUrl
          : c.buyerAvatarUrl;
        const isBlocked = blocked.includes(counterpartId);

        return {
          id: c.id,
          type: "listing",
          counterpart: {
            id: counterpartId,
            name: counterpartName || "Utilisateur Shongre",
            avatarUrl: counterpartAvatar,
            accountType:
              c.sellerType === "pro" && !isBuyer ? "pro" : "individual",
            isVerified: true,
            rating: 4.9,
            reviewCount: 12,
          },
          context: {
            type: "listing",
            listingId: c.listingId,
            listingTitle: c.listingTitle || "Annonce",
            listingPrice: c.listingPrice || 0,
            listingPhotoUrl: c.listingPhotoUrl,
            listingStatus: c.listingStatus || "active",
            sellerId: c.sellerId,
            sellerName: c.sellerName || "Vendeur",
          },
          lastMessageText: c.lastMessage || "Nouvelle conversation",
          lastMessageAt:
            c.lastMessageAt || (c as any).updatedAt || new Date().toISOString(),
          unreadCount: c.unreadCount || 0,
          isBlocked,
          status: isBlocked ? "blocked" : "active",
          createdAt: (c as any).createdAt || new Date().toISOString(),
          updatedAt: c.lastMessageAt || new Date().toISOString(),
        };
      });

      setConversations(previews);

      // Auto-select first conversation on desktop if none selected
      if (!activeConvId && previews.length > 0 && window.innerWidth >= 768) {
        setActiveConvId(previews[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, activeConvId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Load Active Conversation Detail & Messages
  useEffect(() => {
    if (!activeConvId) {
      setActiveRawConv(null);
      setTimelineItems([]);
      return;
    }

    services.messaging.getConversationById(activeConvId).then((conv) => {
      if (conv) {
        setActiveRawConv(conv);
        const mappedItems = (conv.messages || []).map((m) =>
          messagingService.mapMessageToTimelineItem(m),
        );
        setTimelineItems(mappedItems);
        services.messaging.markAsRead(activeConvId, currentUserId);
      }
    });
  }, [activeConvId, currentUserId]);

  useEffect(() => {
    if (!activeConvId) {
      setComposerOptions(EMPTY_COMPOSER_OPTIONS);
      return;
    }

    let cancelled = false;
    services.messaging
      .getComposerOptions({
        conversationId: activeConvId,
        userId: currentUserId,
        isProfessional: isPro,
        locale,
      })
      .then((options) => {
        if (!cancelled) setComposerOptions(options);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConvId, currentUserId, isPro, locale]);

  // 3. Real-time Subscription to Active Conversation
  useEffect(() => {
    if (!activeConvId) return;

    const unsubscribe = messagingRealtimeClient.subscribeToConversation(
      activeConvId,
      (event) => {
        if (event.type === "new_message") {
          const incomingMsg = event.payload as UserTimelineMessage;
          setTimelineItems((prev) => {
            if (prev.some((m) => m.id === incomingMsg.id)) return prev;
            return [...prev, incomingMsg];
          });
        } else if (event.type === "system_event") {
          const sysEvent = event.payload;
          setTimelineItems((prev) => [...prev, sysEvent]);
        } else if (event.type === "typing") {
          const typing = event.payload as TypingState;
          if (typing.userId !== currentUserId) {
            setTypingState(typing.isTyping ? typing : null);
          }
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [activeConvId, currentUserId]);

  // Derive active counterpart and capabilities
  const activeConversationPreview = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || null;
  }, [conversations, activeConvId]);

  const capabilities = useMemo(() => {
    const counterpartId = activeConversationPreview?.counterpart.id || "";
    const isBlocked = blockedUsers.includes(counterpartId);

    return messagingCapabilitiesService.resolve({
      viewer: currentUser,
      counterpartId,
      isBlockedByViewer: isBlocked,
      conversationStatus: isBlocked ? "blocked" : "active",
      isViewerSuspended: currentUser?.status === "suspended",
    });
  }, [currentUser, activeConversationPreview, blockedUsers]);

  // Handlers
  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
    setSearchParams({ convId: id });
  };

  const handleBackToInbox = () => {
    setActiveConvId(null);
    setSearchParams({});
  };

  const handleSendMessage = async (text: string, attachmentUrl?: string) => {
    if (!activeConvId) return;

    const clientMsgId = `msg-opt-${Date.now()}`;
    const optimisticMsg: UserTimelineMessage = {
      itemType: "message",
      id: clientMsgId,
      conversationId: activeConvId,
      senderId: currentUserId,
      senderName: currentUser?.name || "Moi",
      content: text || (attachmentUrl ? "Photo partagée" : ""),
      contentType: attachmentUrl ? "image" : "text",
      status: "sending",
      isRead: false,
      attachment: attachmentUrl
        ? { id: `att-${Date.now()}`, type: "image", url: attachmentUrl }
        : undefined,
      createdAt: new Date().toISOString(),
    };

    // Optimistic insert
    setTimelineItems((prev) => [...prev, optimisticMsg]);

    try {
      const savedMsg = await services.messaging.sendMessage({
        conversationId: activeConvId,
        senderId: currentUserId,
        text: text || (attachmentUrl ? "Photo partagée" : ""),
        attachments: attachmentUrl ? [attachmentUrl] : undefined,
      });

      // Upgrade status to delivered
      setTimelineItems((prev) =>
        prev.map((m) =>
          m.id === clientMsgId
            ? { ...m, id: savedMsg.id, status: "delivered" }
            : m,
        ),
      );

      // Refresh list previews
      loadConversations();
    } catch {
      // Mark failed
      setTimelineItems((prev) =>
        prev.map((m) =>
          m.id === clientMsgId ? { ...m, status: "failed" } : m,
        ),
      );
      toast.error(t("messaging.messagingPage.sendFailed"));
    }
  };

  const handleRetryMessage = async (msg: UserTimelineMessage) => {
    setTimelineItems((prev) => prev.filter((m) => m.id !== msg.id));
    await handleSendMessage(msg.content, msg.attachment?.url);
  };

  const handleTyping = (isTyping: boolean) => {
    if (!activeConvId) return;
    messagingRealtimeClient.sendTyping(
      activeConvId,
      currentUserId,
      currentUser?.name || "Moi",
      isTyping,
    );
  };

  const handleSimulateReply = () => {
    if (!activeConvId || !activeConversationPreview) return;
    const counterpart = activeConversationPreview.counterpart;
    messagingRealtimeClient.simulateSellerAutoReply(
      activeConvId,
      counterpart.id,
      counterpart.name,
      "Bonjour, je confirme que la disponibilité et le créneau conviennent parfaitement !",
    );
  };

  const handleBlockToggle = async () => {
    if (!activeConversationPreview) return;
    const counterpart = activeConversationPreview.counterpart;
    const isCurrentlyBlocked = blockedUsers.includes(counterpart.id);

    if (isCurrentlyBlocked) {
      await services.messaging.unblockUser(currentUserId, counterpart.id);
      setBlockedUsers((prev) => prev.filter((id) => id !== counterpart.id));
      toast.success(`${counterpart.name} a été débloqué.`);
    } else {
      setBlockModalTarget(counterpart.id);
    }
  };

  const confirmBlock = async () => {
    if (!blockModalTarget) return;
    await services.messaging.blockUser(currentUserId, blockModalTarget);
    setBlockedUsers((prev) => [...prev, blockModalTarget]);
    setBlockModalTarget(null);
    toast.info(
      "Utilisateur bloqué. Vous ne recevrez plus de messages de sa part.",
    );
  };

  const handleConfirmPickup = async (
    date: string,
    timeSlot: string,
    address: string,
  ) => {
    if (!activeConvId) return;
    await services.messaging.schedulePickup(
      activeConvId,
      date,
      timeSlot,
      address,
    );
    toast.success("Rendez-vous planifié et partagé dans la conversation.");
    loadConversations();
  };

  const handleSendOffer = async (amount: number) => {
    if (!activeConvId) return;
    const offer = await services.messaging.makeOffer(
      activeConvId,
      currentUserId,
      currentUser?.name || "Moi",
      amount,
    );
    const timelineOffer = messagingService.mapMessageToTimelineItem(offer);
    setTimelineItems((previous) =>
      previous.some((item) => item.id === offer.id)
        ? previous
        : [...previous, timelineOffer],
    );
    toast.success(
      t("messaging.messagingPage.offerSent", { price: formatPrice(amount) }),
    );
    loadConversations();
  };

  const handleRespondOffer = async (
    offerId: string,
    accept: boolean,
    amount?: number,
  ) => {
    if (!activeConvId) return;
    const updated = await services.messaging.respondToOffer(
      offerId,
      currentUserId,
      currentUser?.name || "Moi",
      accept,
    );
    setTimelineItems((previous) =>
      previous.map((item) =>
        item.id === offerId
          ? messagingService.mapMessageToTimelineItem(updated)
          : item,
      ),
    );
    const messages = await services.messaging.getMessages(activeConvId);
    setTimelineItems(
      messages.map((message) =>
        messagingService.mapMessageToTimelineItem(message),
      ),
    );
    toast.success(
      accept
        ? amount !== undefined
          ? t("messaging.messagingPage.offerAccepted", {
              price: formatPrice(amount),
            })
          : t("messaging.messagingPage.offerAcceptedGeneric")
        : t("messaging.messagingPage.offerDeclined"),
    );
    loadConversations();
  };

  const handleWithdrawOffer = async (offerId: string) => {
    if (!activeConvId) return;
    const updated = await services.messaging.withdrawOffer(
      offerId,
      currentUserId,
    );
    setTimelineItems((previous) =>
      previous.map((item) =>
        item.id === offerId
          ? messagingService.mapMessageToTimelineItem(updated)
          : item,
      ),
    );
    const messages = await services.messaging.getMessages(activeConvId);
    setTimelineItems(
      messages.map((message) =>
        messagingService.mapMessageToTimelineItem(message),
      ),
    );
    toast.info("Offre retirée.");
    loadConversations();
  };

  const filteredConversations = useMemo(() => {
    return messagingService.filterConversations(
      conversations,
      selectedFilter,
      searchQuery,
      currentUserId,
    );
  }, [conversations, selectedFilter, searchQuery, currentUserId]);

  // Distinct from "filtered to nothing": the filters and search are still useful
  // in that case, so they stay on screen and the list shows its own no-match copy.
  const hasNoConversations = !isLoading && conversations.length === 0;

  const activeListingContext: ListingConversationContext | null =
    useMemo(() => {
      if (!activeRawConv) return null;
      return {
        type: "listing",
        listingId: activeRawConv.listingId,
        listingTitle: activeRawConv.listingTitle || "Annonce",
        listingPrice: activeRawConv.listingPrice || 0,
        listingPhotoUrl: activeRawConv.listingPhotoUrl,
        listingStatus: activeRawConv.listingStatus || "active",
        sellerId: activeRawConv.sellerId,
        sellerName: activeRawConv.sellerName || "Vendeur",
      };
    }, [activeRawConv]);

  // The attachment lightbox closed on backdrop click only — no Escape, no focus
  // trap, and focus was never returned to the thumbnail that opened it.
  const { containerRef: lightboxRef, titleId: lightboxTitleId } =
    useDialogBehavior(Boolean(lightboxImageUrl), () =>
      setLightboxImageUrl(null),
    );
  return (
    // `dvh`, not `vh`: the dynamic viewport shrinks when the mobile keyboard
    // opens, which keeps the composer on screen. With `100vh` plus a 600px floor
    // the thread stayed full height and pushed the input behind the keyboard, so
    // the user could not see what they were typing. The minimum height only
    // applies from `md` up, where there is no virtual keyboard.
    <div
      data-messaging-shell
      className="relative flex h-messaging-shell-height-mobile max-h-messaging-shell-max min-h-0 flex-col overflow-hidden rounded-overlay border border-border-base bg-bg-surface shadow-xs md:h-messaging-shell-height-desktop md:min-h-messaging-shell-min md:flex-row"
    >
      {/* Inbox with nothing in it at all — not merely filtered to nothing.
          Splitting this across two panes produced a list saying "Aucune
          conversation trouvée" beside a pane saying "choisissez une conversation
          dans la liste de gauche", i.e. an instruction to pick from an empty
          list. One panel, one message, one way forward. */}
      {hasNoConversations ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
          {/* The visible H1 lives in `ConversationList`, which this branch does
              not render — so an inbox with nothing in it produced a route with
              no H1 at all, and the empty-state message was a `<p>`. A screen
              reader jumping by heading found nothing on the page. The heading is
              visually hidden because the empty state is its own composition and
              a second large title above the message would just be noise. */}
          <h1 className="sr-only">
            {t("messaging.conversationList.messagerie")}
          </h1>
          <div
            className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center text-primary"
            aria-hidden="true"
          >
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-black text-stone-800">
              {t("messaging.messagingPage.aucunMessagePourLeMoment")}
            </h2>
            <p className="text-xs text-stone-500 max-w-sm leading-relaxed">
              {t("messaging.messagingPage.vosEchangesAvecLesAcheteurs")}
            </p>
          </div>
          <Button
            to={routes.search()}
            variant="primary"
            size="md"
            leftIcon={<Search className="w-4 h-4" />}
          >
            {t("messaging.messagingPage.parcourirLesAnnonces")}
          </Button>
        </div>
      ) : (
        <>
          {/* 1. Left Inbox Sidebar */}
          <div
            className={`w-full md:w-80 lg:w-96 shrink-0 h-full flex flex-col ${
              activeConvId ? "hidden md:flex" : "flex"
            }`}
          >
            <ConversationList
              conversations={filteredConversations}
              activeConversationId={activeConvId}
              onSelectConversation={handleSelectConversation}
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isLoading={isLoading}
            />
          </div>

          {/* 2. Right Conversation Pane */}
          <div
            className={`flex-1 h-full flex flex-col min-w-0 bg-white ${
              !activeConvId ? "hidden md:flex" : "flex"
            }`}
          >
            {activeConversationPreview ? (
              <>
                {/* Conversation Header */}
                <ConversationHeader
                  counterpart={activeConversationPreview.counterpart}
                  capabilities={capabilities}
                  onBack={handleBackToInbox}
                  onBlockToggle={handleBlockToggle}
                  onReport={() =>
                    setReportModalTarget(activeConversationPreview.id)
                  }
                  onSimulateReply={handleSimulateReply}
                />

                {/* Contextual Listing Banner */}
                <ConversationContextBar
                  listingContext={activeListingContext}
                  onMakeOffer={() => setIsOfferModalOpen(true)}
                  onSchedulePickup={() => setIsPickupModalOpen(true)}
                  onViewTransaction={() => {
                    if (activeRawConv?.transactionId) {
                      const foundTx = storageService
                        .getTransactions()
                        .find((t) => t.id === activeRawConv.transactionId);
                      if (foundTx) setSelectedTx(foundTx);
                    }
                  }}
                />

                {/* Message Timeline */}
                <MessageTimeline
                  items={timelineItems}
                  currentUserId={currentUserId}
                  typingState={typingState}
                  onOpenImage={(url) => setLightboxImageUrl(url)}
                  onRetryMessage={handleRetryMessage}
                  onRespondOffer={handleRespondOffer}
                  onWithdrawOffer={handleWithdrawOffer}
                />

                {/* Message Composer */}
                <MessageComposer
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                  capabilities={capabilities}
                  attachmentOptions={composerOptions.attachmentOptions}
                  quickReplies={composerOptions.quickReplies}
                />
              </>
            ) : (
              /* Nothing selected, but conversations do exist — so pointing at the
             list is genuinely actionable here. */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-stone-500">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-black text-stone-800">
                    {t("messaging.messagingPage.selectionnezUneConversation")}
                  </p>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm">
                    {t(
                      "messaging.messagingPage.choisissezUneConversationDansLa",
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Schedule Pickup Modal */}
      {isPickupModalOpen && (
        <PickupSchedulerModal
          isOpen={isPickupModalOpen}
          onClose={() => setIsPickupModalOpen(false)}
          onConfirm={handleConfirmPickup}
        />
      )}

      {/* 2. Make Offer Modal */}
      {isOfferModalOpen && activeListingContext && (
        <MakeOfferModal
          isOpen={isOfferModalOpen}
          onClose={() => setIsOfferModalOpen(false)}
          currentPrice={activeListingContext.listingPrice}
          onSendOffer={handleSendOffer}
        />
      )}

      {/* 3. Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailModal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          transaction={selectedTx}
          currentUser={currentUser || DEMO_USERS.buyer_thomas}
          onUpdate={(_updatedTx) => {
            loadConversations();
          }}
        />
      )}

      {/* 4. Block Confirmation Modal */}
      {blockModalTarget && (
        <Modal
          isOpen={!!blockModalTarget}
          onClose={() => setBlockModalTarget(null)}
          title="Bloquer cet utilisateur"
          description={t("messaging.messagingPage.cetUtilisateurNePourraPlus")}
        >
          <div className="space-y-4 text-xs">
            <p className="text-stone-600 leading-relaxed font-medium">
              {t("messaging.messagingPage.etesVousSurDeVouloir")}
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setBlockModalTarget(null)}
              >
                Annuler
              </Button>
              <Button variant="danger" fullWidth onClick={confirmBlock}>
                {t("messaging.messagingPage.confirmerLeBlocage")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Report Conversation Modal */}
      {reportModalTarget && (
        <Modal
          isOpen={!!reportModalTarget}
          onClose={() => setReportModalTarget(null)}
          title={t("messaging.messagingPage.signalerLaConversation")}
          description={t("messaging.messagingPage.aidezLEquipeDeModeration")}
        >
          <div className="space-y-4 text-xs">
            <p className="text-stone-600 leading-relaxed">
              {t("messaging.messagingPage.votreSignalementSeraExamineEn")}
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setReportModalTarget(null)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  setReportModalTarget(null);
                  toast.success(
                    "Votre signalement a été transmis à la modération.",
                  );
                }}
              >
                {t("messaging.messagingPage.envoyerLeSignalement")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Image Lightbox Modal */}
      {lightboxImageUrl && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={lightboxTitleId}
          tabIndex={-1}
          className="fixed inset-0 z-modal bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImageUrl(null)}
        >
          <h2 id={lightboxTitleId} className="sr-only">
            {t("messaging.messagingPage.pieceJointeEnPleinEcran")}
          </h2>
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label={t("messaging.messagingPage.fermerLaVuePleinEcran")}
          >
            <X className="w-6 h-6" />
          </button>
          <Image
            src={lightboxImageUrl}
            alt={t("messaging.messagingPage.vuePleinEcran")}
            sizes="90vw"
            className="max-h-dialog-viewport-max-height max-w-dialog-viewport-max-width object-contain rounded-2xl shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
