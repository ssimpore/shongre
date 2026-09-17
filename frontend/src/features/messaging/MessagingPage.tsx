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
  ListingConversationContext,
} from "../../domains/messaging/messaging.types";
import { messagingService } from "../../domains/messaging/messaging.service";
import { messagingCapabilitiesService } from "../../domains/messaging/messaging.capabilities";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Transaction } from "../../types";

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
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { analyticsService } from "../../services/analytics.service";
import { useConversationPresence } from "./useConversationPresence";

export const MessagingPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useMarketLocation();
  usePageMeta({
    title: t("meta.messaging.title"),
    description: t("meta.messaging.description"),
    canonicalPath: "/compte/messages",
    noIndex: true,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const toast = useToast();

  const currentUserId = currentUser?.id ?? "";

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

  // Modals & Popovers
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [blockModalTarget, setBlockModalTarget] = useState<string | null>(null);
  const [reportModalTarget, setReportModalTarget] = useState<string | null>(
    null,
  );

  // Blocked users set
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const presence = useConversationPresence(
    conversations.map((conversation) => conversation.id),
    blockedUsers.join(","),
  );

  // 1. Load User's Conversations
  const loadConversations = useCallback(async () => {
    if (!currentUserId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [rawList, blocked] = await Promise.all([
        services.messaging.getUserConversations(),
        services.messaging.getBlockedUserIds(),
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
            name: counterpartName,
            avatarUrl: counterpartAvatar,
            accountType:
              c.sellerType === "pro" && isBuyer ? "pro" : "individual",
            awayUntil: isBuyer ? c.sellerAwayUntil : c.buyerAwayUntil,
            awayMessage: isBuyer ? c.sellerAwayMessage : c.buyerAwayMessage,
          },
          context: {
            type: "listing",
            listingId: c.listingId,
            listingTitle: c.listingTitle,
            listingPrice: c.listingPrice,
            listingPhotoUrl: c.listingPhotoUrl,
            listingStatus: c.listingStatus,
            sellerId: c.sellerId,
            sellerName: c.sellerName,
          },
          lastMessageText: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unreadCount: c.unreadCount,
          isBlocked,
          status: isBlocked ? "blocked" : "active",
          createdAt: c.lastMessageAt,
          updatedAt: c.lastMessageAt,
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
        services.messaging.markAsRead(activeConvId);
      }
    });
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
    if (!activeConvId || !currentUser) return;

    const clientMsgId = `msg-opt-${Date.now()}`;
    const optimisticMsg: UserTimelineMessage = {
      itemType: "message",
      id: clientMsgId,
      conversationId: activeConvId,
      senderId: currentUserId,
      senderName: currentUser.name,
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
        text: text || (attachmentUrl ? "Photo partagée" : ""),
        attachments: attachmentUrl ? [attachmentUrl] : undefined,
      });
      analyticsService.track("message_sent", {
        conversationId: activeConvId,
        attachmentCount: attachmentUrl ? 1 : 0,
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

  const handleBlockToggle = async () => {
    if (!activeConversationPreview) return;
    const counterpart = activeConversationPreview.counterpart;
    const isCurrentlyBlocked = blockedUsers.includes(counterpart.id);

    if (isCurrentlyBlocked) {
      await services.messaging.unblockUser(counterpart.id);
      setBlockedUsers((prev) => prev.filter((id) => id !== counterpart.id));
      toast.success(`${counterpart.name} a été débloqué.`);
    } else {
      setBlockModalTarget(counterpart.id);
    }
  };

  const confirmBlock = async () => {
    if (!blockModalTarget) return;
    await services.messaging.blockUser(blockModalTarget);
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
    if (!activeConvId || !currentUser) return;
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
    if (!activeConvId || !currentUser) return;
    const offer = await services.messaging.makeOffer(activeConvId, amount);
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
    if (!activeConvId || !currentUser) return;
    const updated = await services.messaging.respondToOffer(offerId, accept);
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
    const updated = await services.messaging.withdrawOffer(offerId);
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
        listingTitle: activeRawConv.listingTitle,
        listingPrice: activeRawConv.listingPrice,
        listingPhotoUrl: activeRawConv.listingPhotoUrl,
        listingStatus: activeRawConv.listingStatus,
        sellerId: activeRawConv.sellerId,
        sellerName: activeRawConv.sellerName,
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
    // opens, which keeps the composer on screen. The mobile route deliberately
    // owns the remaining viewport after the global header; account navigation,
    // footer and the global bottom bar are removed by their owning layouts.
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
            <h2 className="text-base font-bold text-text-strong">
              {t("messaging.messagingPage.aucunMessagePourLeMoment")}
            </h2>
            <p className="text-xs text-text-tertiary max-w-sm leading-relaxed">
              {t("messaging.messagingPage.vosEchangesAvecLesAcheteurs")}
            </p>
          </div>
          <Button
            to={routes.search()}
            variant="primary"
            size="md"
            leftIcon={<Search className="w-icon-md h-icon-md" />}
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
              presence={presence}
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
            className={`flex-1 h-full flex flex-col min-w-0 bg-bg-surface ${
              !activeConvId ? "hidden md:flex" : "flex"
            }`}
          >
            {activeConversationPreview ? (
              <>
                {/* Conversation Header */}
                <ConversationHeader
                  presence={
                    capabilities.isBlockedByViewer ||
                    capabilities.isBlockedByCounterpart
                      ? undefined
                      : presence[activeConversationPreview.id]
                  }
                  counterpart={activeConversationPreview.counterpart}
                  capabilities={capabilities}
                  publicProfileSlug={activeConversationPreview.counterpart.id}
                  onBack={handleBackToInbox}
                  onBlockToggle={handleBlockToggle}
                  onReport={() =>
                    setReportModalTarget(activeConversationPreview.id)
                  }
                />

                {/* Contextual Listing Banner */}
                <ConversationContextBar
                  listingContext={activeListingContext}
                  onMakeOffer={() => setIsOfferModalOpen(true)}
                  onSchedulePickup={() => setIsPickupModalOpen(true)}
                  onViewTransaction={() => {
                    if (activeRawConv?.transactionId) {
                      void services.orders
                        .getOrderById(activeRawConv.transactionId)
                        .then(setSelectedTx)
                        .catch(() =>
                          toast.error("La transaction est indisponible."),
                        );
                    }
                  }}
                />

                {/* Message Timeline */}
                <MessageTimeline
                  items={timelineItems}
                  currentUserId={currentUserId}
                  onOpenImage={(url) => setLightboxImageUrl(url)}
                  onRetryMessage={handleRetryMessage}
                  onRespondOffer={handleRespondOffer}
                  onWithdrawOffer={handleWithdrawOffer}
                />

                {/* Message Composer */}
                <MessageComposer
                  onSendMessage={handleSendMessage}
                  capabilities={capabilities}
                />
              </>
            ) : (
              /* Nothing selected, but conversations do exist — so pointing at the
             list is genuinely actionable here. */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-text-tertiary">
                <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center text-text-inverse-subtle">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-text-strong">
                    {t("messaging.messagingPage.selectionnezUneConversation")}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1 max-w-sm">
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
      {selectedTx && currentUser && (
        <TransactionDetailModal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          transaction={selectedTx}
          currentUser={currentUser}
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
            <p className="text-text-supporting leading-relaxed font-medium">
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
            <p className="text-text-supporting leading-relaxed">
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
          className="fixed inset-0 z-modal bg-surface-overlay-deep/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImageUrl(null)}
        >
          <h2 id={lightboxTitleId} className="sr-only">
            {t("messaging.messagingPage.pieceJointeEnPleinEcran")}
          </h2>
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-4 right-4 p-3 rounded-full bg-bg-surface/10 text-text-inverse hover:bg-bg-surface/20 transition-colors"
            aria-label={t("messaging.messagingPage.fermerLaVuePleinEcran")}
          >
            <X className="w-icon-xl h-icon-xl" />
          </button>
          <Image
            src={lightboxImageUrl}
            alt={t("messaging.messagingPage.vuePleinEcran")}
            sizes="90vw"
            className="max-h-dialog-viewport-max-height max-w-dialog-viewport-max-width object-contain rounded-2xl shadow-2xl border border-border-on-inverse/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
