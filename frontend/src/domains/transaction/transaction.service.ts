import {
  Transaction,
  TransactionStatus,
  DeliveryType,
  SellerType,
  UserProfile,
  SellerEarningsSummary,
  SellerPayoutRequest,
  TransactionDispute,
} from "../../types";
import { TRANSACTION_CONFIG } from "../../configuration/transaction.config";
import { storageService } from "../../services/storage.service";
import { auditService } from "../../security/audit.service";
import { marketService } from "../market/market.service";
import { OrderPricingSnapshot } from "./transaction.types";
import {
  getDemoDeliveryAmountMinor,
  getDemoTransactionCommercials,
} from "../monetization/demo-commercial-catalog";

export interface CreateReservationInput {
  listingId: string;
  buyer: UserProfile;
  deliveryMethod: DeliveryType;
  carrierName?: string;
  paymentMethod: "card" | "apple_pay" | "google_pay" | "sepa";
  cardLast4?: string;
  cardBrand?: string;
  deliveryAddress?: {
    fullName: string;
    street: string;
    postalCode: string;
    city: string;
    relayPointName?: string;
    relayPointId?: string;
  };
  pickupDetails?: {
    scheduledDate?: string;
    meetingPlace?: string;
    notes?: string;
    buyerPhone?: string;
  };
}

export interface AmountBreakdown {
  itemPrice: number;
  itemPriceCents: number;
  protectionFee: number;
  protectionFeeCents: number;
  shippingFee: number;
  shippingFeeCents: number;
  totalAmount: number;
  totalAmountCents: number;
  sellerPayoutAmount: number;
  sellerPayoutAmountCents: number;
  platformCommission: number;
  platformCommissionCents: number;
}

class TransactionService {
  /**
   * Authoritative minor units order pricing snapshot calculation
   */
  calculateOrderPricingSnapshot(
    itemPrice: number,
    quantity = 1,
    shippingFee = 0,
    sellerType: SellerType = "individual",
    marketCode = "FR",
  ): OrderPricingSnapshot {
    const itemPriceMinor = Math.round(itemPrice * 100);
    const itemSubtotalMinor = itemPriceMinor * quantity;
    const shippingFeeMinor = Math.round(shippingFee * 100);

    const config = marketService.getEffectiveConfig(marketCode);
    const commercials = getDemoTransactionCommercials(marketCode, sellerType);
    const rate = commercials.protectionRateBps / 10_000;
    const fixedMinor = commercials.protectionFixedMinor;

    const buyerProtectionFeeMinor =
      itemSubtotalMinor > 0
        ? Math.round(itemSubtotalMinor * rate) + fixedMinor
        : 0;

    const commissionRate = commercials.commissionRateBps / 10_000;
    const platformCommissionMinor = Math.round(
      itemSubtotalMinor * commissionRate,
    );
    const sellerPayoutAmountMinor = itemSubtotalMinor - platformCommissionMinor;
    const totalAmountMinor =
      itemSubtotalMinor + shippingFeeMinor + buyerProtectionFeeMinor;

    return {
      itemPriceMinor,
      quantity,
      itemSubtotalMinor,
      shippingFeeMinor,
      buyerProtectionFeeMinor,
      platformCommissionMinor,
      taxMinor: 0,
      discountMinor: 0,
      totalAmountMinor,
      sellerPayoutAmountMinor,
      currency: config.localization.defaultCurrency || "EUR",
    };
  }
  /**
   * Calculate exact prices in minor currency units (cents) to avoid floating point inaccuracies
   */
  calculateAmounts(
    itemPrice: number,
    deliveryMethod: DeliveryType,
    sellerType: SellerType = "individual",
    marketCode?: string,
  ): AmountBreakdown {
    const itemPriceCents = Math.round(itemPrice * 100);
    const mCode = marketCode || storageService.getActiveMarketCode() || "FR";
    // Buyer protection fee: rate + fixed fee from effective market config
    const commercials = getDemoTransactionCommercials(mCode, sellerType);
    const rate = commercials.protectionRateBps / 10_000;
    const fixedCents = commercials.protectionFixedMinor;

    const protectionFeeCents =
      itemPriceCents > 0 ? Math.round(itemPriceCents * rate) + fixedCents : 0;

    // Shipping fee based on delivery method
    let shippingFeeCents = 0;
    if (deliveryMethod === "relay_point") {
      shippingFeeCents = getDemoDeliveryAmountMinor("relay_point");
    } else if (
      deliveryMethod === "home_delivery" ||
      deliveryMethod === "custom_carrier"
    ) {
      shippingFeeCents = getDemoDeliveryAmountMinor("home");
    }

    const totalAmountCents =
      itemPriceCents + protectionFeeCents + shippingFeeCents;

    // Platform commission (only for pro sellers in marketplace mode)
    const commissionRate = commercials.commissionRateBps / 10_000;
    const platformCommissionCents = Math.round(itemPriceCents * commissionRate);
    const sellerPayoutAmountCents = itemPriceCents - platformCommissionCents;

    return {
      itemPrice: itemPriceCents / 100,
      itemPriceCents,
      protectionFee: protectionFeeCents / 100,
      protectionFeeCents,
      shippingFee: shippingFeeCents / 100,
      shippingFeeCents,
      totalAmount: totalAmountCents / 100,
      totalAmountCents,
      sellerPayoutAmount: sellerPayoutAmountCents / 100,
      sellerPayoutAmountCents,
      platformCommission: platformCommissionCents / 100,
      platformCommissionCents,
    };
  }

  /**
   * Return a deterministic demo confirmation PIN.
   */
  generateVerificationPin(): string {
    return "482731";
  }

  /**
   * Generate human-readable transaction reference code
   */
  generateReferenceCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "SHG-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Initiate a reservation with secure provider escrow hold
   */
  async createReservation(input: CreateReservationInput): Promise<Transaction> {
    const listing = storageService
      .getListings()
      .find((l) => l.id === input.listingId);
    if (!listing) {
      throw new Error("Annonce introuvable.");
    }

    if (listing.status === "sold") {
      throw new Error("Cet article a déjà été vendu.");
    }

    if (listing.status === "reserved" && listing.activeReservationId) {
      throw new Error(
        "Cet article est déjà en cours de réservation par un autre acheteur.",
      );
    }

    const marketCode =
      (listing as any).marketCode ||
      storageService.getActiveMarketCode() ||
      "FR";
    const marketConfig = marketService.getEffectiveConfig(marketCode);
    const amounts = this.calculateAmounts(
      listing.price,
      input.deliveryMethod,
      listing.sellerType,
      marketCode,
    );
    const now = new Date();
    const nowIso = now.toISOString();

    // Deadline for seller to confirm: from effective market config
    const timeoutHours =
      marketConfig.reservation.sellerConfirmationTimeoutHours ||
      TRANSACTION_CONFIG.sellerConfirmationTimeoutHours;
    const sellerConfirmationDeadline = new Date(
      now.getTime() + timeoutHours * 60 * 60 * 1000,
    ).toISOString();

    const verificationCode = this.generateVerificationPin();
    const referenceCode = this.generateReferenceCode();
    const txId = `tx-${Date.now()}`;

    // Determine initial transaction status
    const isInstant = listing.reservationType === "instant";
    const initialStatus: TransactionStatus = isInstant
      ? input.deliveryMethod === "hand_delivery"
        ? "ready_for_pickup"
        : "seller_confirmed"
      : "pending_seller_confirmation";

    const transaction: Transaction = {
      id: txId,
      code: referenceCode,
      marketCode,
      currency: marketConfig.localization.defaultCurrency,
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      listingPhotoUrl: listing.coverImageUrl,
      listingCoverImageUrl: listing.coverImageUrl,
      categorySlug: listing.categorySlug,
      buyerId: input.buyer.id,
      buyerName: input.buyer.name,
      buyerAvatarUrl: input.buyer.avatarUrl,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      sellerAvatarUrl: listing.sellerAvatarUrl,
      sellerType: listing.sellerType,
      amount: amounts.itemPrice,
      protectionFee: amounts.protectionFee,
      shippingFee: amounts.shippingFee,
      totalAmount: amounts.totalAmount,
      sellerPayoutAmount: amounts.sellerPayoutAmount,
      platformCommission: amounts.platformCommission,
      deliveryMethod: input.deliveryMethod,
      carrierName:
        input.carrierName ||
        (input.deliveryMethod === "relay_point"
          ? "Mondial Relay"
          : input.deliveryMethod === "home_delivery"
            ? "Colissimo"
            : "Remise directe"),
      deliveryAddress: input.deliveryAddress,
      pickupDetails: input.pickupDetails,
      verificationCode,
      verificationCodeStatus: "pending",
      status: initialStatus,
      sellerConfirmationDeadline: isInstant
        ? undefined
        : sellerConfirmationDeadline,
      payment: {
        intentId: `pi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        provider: "mangopay_escrow",
        paymentMethod: input.paymentMethod,
        cardBrand: input.cardBrand || "Visa",
        cardLast4: input.cardLast4 || "4242",
        escrowStatus: "held",
        authorizedAt: nowIso,
        capturedAt: nowIso,
      },
      statusHistory: [
        {
          status: initialStatus,
          timestamp: nowIso,
          actorId: input.buyer.id,
          actorName: input.buyer.name,
          note: `Réservation initiée avec paiement sous séquestre sécurisé (${amounts.totalAmount.toFixed(2)} €).`,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Update listing to 'reserved'
    listing.status = "reserved";
    listing.activeReservationId = txId;
    storageService.saveListing(listing);

    // Save transaction
    storageService.saveTransaction(transaction);

    // Create notifications
    const notifications = storageService.getNotifications();

    // Notification for Seller
    notifications.unshift({
      id: `notif-${Date.now()}-seller`,
      userId: listing.sellerId,
      title: isInstant
        ? "Article réservé & payé !"
        : "Nouvelle demande de réservation !",
      message: `${input.buyer.name} a réservé "${listing.title}" avec paiement sécurisé Shongre (${amounts.totalAmount.toFixed(2)} €).`,
      type: "offer",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: nowIso,
    });

    // Notification for Buyer
    notifications.unshift({
      id: `notif-${Date.now()}-buyer`,
      userId: input.buyer.id,
      title: "Paiement sécurisé sous séquestre",
      message: `Votre réservation pour "${listing.title}" est validée. Les fonds sont sécurisés jusqu'à la remise conforme.`,
      type: "system",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: nowIso,
    });

    storageService.saveNotifications(notifications);

    // Log security audit
    auditService.logEvent({
      actorId: input.buyer.id,
      actorName: input.buyer.name,
      actorRole: input.buyer.role || "buyer",
      targetId: txId,
      targetName: listing.title,
      action: "listing_moderated",
      details: `Réservation [${referenceCode}] créée avec séquestre Mangopay de ${amounts.totalAmount.toFixed(2)} €.`,
    });

    return transaction;
  }

  /**
   * Execute an immediate direct purchase with online payment hold and 0 reservation requirement.
   */
  async createDirectPurchase(
    input: CreateReservationInput,
  ): Promise<Transaction> {
    const listing = storageService
      .getListings()
      .find((l) => l.id === input.listingId);
    if (!listing) {
      throw new Error("Annonce introuvable.");
    }

    if (listing.status === "sold") {
      throw new Error("Cet article a déjà été vendu.");
    }

    const marketCode =
      (listing as any).marketCode ||
      storageService.getActiveMarketCode() ||
      "FR";
    const marketConfig = marketService.getEffectiveConfig(marketCode);
    const amounts = this.calculateAmounts(
      listing.price,
      input.deliveryMethod,
      listing.sellerType,
      marketCode,
    );
    const now = new Date();
    const nowIso = now.toISOString();

    const verificationCode = this.generateVerificationPin();
    const referenceCode = this.generateReferenceCode();
    const txId = `tx-${Date.now()}`;

    const initialStatus: TransactionStatus =
      input.deliveryMethod === "hand_delivery"
        ? "ready_for_pickup"
        : "seller_confirmed";

    const transaction: Transaction = {
      id: txId,
      code: referenceCode,
      marketCode,
      currency: marketConfig.localization.defaultCurrency,
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      listingPhotoUrl: listing.coverImageUrl,
      listingCoverImageUrl: listing.coverImageUrl,
      categorySlug: listing.categorySlug,
      buyerId: input.buyer.id,
      buyerName: input.buyer.name,
      buyerAvatarUrl: input.buyer.avatarUrl,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      sellerAvatarUrl: listing.sellerAvatarUrl,
      sellerType: listing.sellerType,
      amount: amounts.itemPrice,
      protectionFee: amounts.protectionFee,
      shippingFee: amounts.shippingFee,
      totalAmount: amounts.totalAmount,
      sellerPayoutAmount: amounts.sellerPayoutAmount,
      platformCommission: amounts.platformCommission,
      status: initialStatus,
      deliveryMethod: input.deliveryMethod,
      carrierName:
        input.carrierName ||
        (input.deliveryMethod === "hand_delivery"
          ? "Remise en main propre"
          : "Colissimo"),
      deliveryAddress: input.deliveryAddress,
      pickupDetails: input.pickupDetails,
      verificationCode,
      verificationCodeStatus: "pending",
      payment: {
        intentId: `pi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        provider: "mangopay_escrow",
        paymentMethod: input.paymentMethod,
        cardBrand: input.cardBrand || "Visa",
        cardLast4: input.cardLast4 || "4242",
        escrowStatus: "held",
        authorizedAt: nowIso,
        capturedAt: nowIso,
      },
      statusHistory: [
        {
          status: initialStatus,
          timestamp: nowIso,
          actorId: input.buyer.id,
          actorName: input.buyer.name,
          note: `Achat direct en ligne avec séquestre Mangopay (${amounts.totalAmount.toFixed(2)} €).`,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save transaction
    storageService.saveTransaction(transaction);

    // Update listing state to sold (for unique item)
    storageService.updateListingStatus(listing.id, "sold");

    return transaction;
  }

  /**
   * Seller accepts a pending reservation
   */
  async sellerAcceptReservation(
    transactionId: string,
    seller: UserProfile,
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");

    if (
      tx.sellerId !== seller.id &&
      seller.role !== "admin" &&
      seller.role !== "super_admin"
    ) {
      throw new Error("Vous n'êtes pas autorisé à accepter cette réservation.");
    }

    const now = new Date().toISOString();
    const nextStatus: TransactionStatus =
      tx.deliveryMethod === "hand_delivery"
        ? "ready_for_pickup"
        : "seller_confirmed";

    tx.status = nextStatus;
    tx.sellerConfirmedAt = now;
    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: nextStatus,
      timestamp: now,
      actorId: seller.id,
      actorName: seller.name,
      note: "Réservation acceptée par le vendeur. Préparation de la remise/expédition en cours.",
    });

    storageService.saveTransaction(tx);

    // Notify Buyer
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: tx.buyerId,
      title: "Réservation confirmée par le vendeur !",
      message: `${seller.name} a accepté votre réservation pour "${tx.listingTitle}". Vous pouvez convenir du lieu de rendez-vous ou suivre l'envoi.`,
      type: "offer",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return tx;
  }

  /**
   * Seller rejects a pending reservation -> triggers full automatic escrow refund
   */
  async sellerRejectReservation(
    transactionId: string,
    seller: UserProfile,
    reason?: string,
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");

    const now = new Date().toISOString();

    tx.status = "seller_rejected";
    tx.sellerRejectedAt = now;
    tx.rejectionReason = reason || "Indisponibilité de l'article ou du vendeur";
    if (tx.payment) {
      tx.payment.escrowStatus = "refunded";
      tx.payment.refundedAt = now;
    }
    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: "seller_rejected",
      timestamp: now,
      actorId: seller.id,
      actorName: seller.name,
      note: `Réservation refusée par le vendeur. Motif : ${tx.rejectionReason}. Remboursement intégral de ${tx.totalAmount.toFixed(2)} € exécuté.`,
    });

    storageService.saveTransaction(tx);

    // Revert listing back to 'active'
    const listing = storageService
      .getListings()
      .find((l) => l.id === tx.listingId);
    if (listing) {
      listing.status = "active";
      listing.activeReservationId = undefined;
      storageService.saveListing(listing);
    }

    // Notify Buyer
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: tx.buyerId,
      title: "Réservation refusée - Remboursement intégral",
      message: `Le vendeur a décliné la réservation pour "${tx.listingTitle}". Les ${tx.totalAmount.toFixed(2)} € ont été automatiquement recrédités sur votre moyen de paiement.`,
      type: "system",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return tx;
  }

  /**
   * Schedule or update hand-delivery pickup rendezvous
   */
  async updatePickupSchedule(
    transactionId: string,
    user: UserProfile,
    details: {
      scheduledDate: string;
      meetingPlace: string;
      notes?: string;
      phone?: string;
    },
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");

    const now = new Date().toISOString();
    tx.pickupDetails = {
      ...tx.pickupDetails,
      scheduledDate: details.scheduledDate,
      meetingPlace: details.meetingPlace,
      notes: details.notes,
      ...(user.id === tx.sellerId
        ? { sellerPhone: details.phone }
        : { buyerPhone: details.phone }),
    };
    tx.status = "pickup_scheduled";
    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: "pickup_scheduled",
      timestamp: now,
      actorId: user.id,
      actorName: user.name,
      note: `Rendez-vous fixé pour le ${details.scheduledDate} à ${details.meetingPlace}.`,
    });

    storageService.saveTransaction(tx);

    // Notify counterpart
    const targetUserId = user.id === tx.sellerId ? tx.buyerId : tx.sellerId;
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: targetUserId,
      title: "Rendez-vous de remise convenu",
      message: `${user.name} a programmé la remise en main propre pour "${tx.listingTitle}" le ${details.scheduledDate} à ${details.meetingPlace}.`,
      type: "message",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return tx;
  }

  /**
   * Validate 6-digit confirmation PIN during hand delivery
   */
  async confirmHandoverWithPin(
    transactionId: string,
    actor: UserProfile,
    pinCode: string,
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");

    const cleanPin = pinCode.trim().replace(/\s/g, "");
    if (cleanPin !== tx.verificationCode) {
      throw new Error(
        "Code de confirmation incorrect. Veuillez vérifier les 6 chiffres transmis par l'acheteur.",
      );
    }

    const now = new Date().toISOString();

    // Mark handover verified & complete transaction
    tx.verificationCodeStatus = "verified";
    tx.handoverConfirmedAt = now;
    tx.completedAt = now;
    tx.status = "completed";
    if (tx.payment) {
      tx.payment.escrowStatus = "released";
      tx.payment.releasedAt = now;
    }
    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: "completed",
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      note: `Code secret vérifié avec succès. Remise validée en main propre. Fonds libérés au vendeur (${(tx.sellerPayoutAmount || tx.amount).toFixed(2)} €).`,
    });

    storageService.saveTransaction(tx);

    // Mark listing as 'sold'
    const listing = storageService
      .getListings()
      .find((l) => l.id === tx.listingId);
    if (listing) {
      listing.status = "sold";
      listing.activeReservationId = undefined;
      storageService.saveListing(listing);
    }

    // Credit Seller Available Balance
    this.creditSellerBalance(tx.sellerId, tx.sellerPayoutAmount || tx.amount);

    // Notify Buyer
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}-b`,
      userId: tx.buyerId,
      title: "Achat finalisé avec succès !",
      message: `Votre achat de "${tx.listingTitle}" a été confirmé en main propre. N'hésitez pas à laisser un avis au vendeur !`,
      type: "system",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });

    // Notify Seller
    notifs.unshift({
      id: `notif-${Date.now()}-s`,
      userId: tx.sellerId,
      title: "Vente validée - Fonds disponibles !",
      message: `La remise de "${tx.listingTitle}" est confirmée. ${(tx.sellerPayoutAmount || tx.amount).toFixed(2)} € ont été crédités sur votre solde disponible.`,
      type: "system",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return tx;
  }

  /**
   * Buyer confirms conforming direct receipt (releases escrow immediately)
   */
  async confirmBuyerReceipt(
    transactionId: string,
    buyer: UserProfile,
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");

    if (
      tx.buyerId !== buyer.id &&
      buyer.role !== "admin" &&
      buyer.role !== "super_admin"
    ) {
      throw new Error(
        "Seul l'acheteur peut confirmer la bonne réception de la commande.",
      );
    }

    const now = new Date().toISOString();

    tx.status = "completed";
    tx.completedAt = now;
    if (tx.payment) {
      tx.payment.escrowStatus = "released";
      tx.payment.releasedAt = now;
    }
    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: "completed",
      timestamp: now,
      actorId: buyer.id,
      actorName: buyer.name,
      note: `Réception conforme confirmée par l'acheteur. Séquestre débloqué en faveur du vendeur (${(tx.sellerPayoutAmount || tx.amount).toFixed(2)} €).`,
    });

    storageService.saveTransaction(tx);

    // Mark listing as sold
    const listing = storageService
      .getListings()
      .find((l) => l.id === tx.listingId);
    if (listing) {
      listing.status = "sold";
      listing.activeReservationId = undefined;
      storageService.saveListing(listing);
    }

    // Credit Seller Available Balance
    this.creditSellerBalance(tx.sellerId, tx.sellerPayoutAmount || tx.amount);

    // Notify Seller
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: tx.sellerId,
      title: "Paiement débloqué !",
      message: `${buyer.name} a validé la réception conforme de "${tx.listingTitle}". ${(tx.sellerPayoutAmount || tx.amount).toFixed(2)} € sont maintenant disponibles pour virement.`,
      type: "system",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return tx;
  }

  /**
   * Seller provides carrier tracking number for shipped orders
   */
  async shipOrder(
    transactionId: string,
    seller: UserProfile,
    trackingNumber: string,
    carrierName?: string,
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");

    const now = new Date().toISOString();
    tx.status = "shipped";
    tx.trackingNumber = trackingNumber.trim();
    if (carrierName) tx.carrierName = carrierName;
    tx.shippedAt = now;
    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: "shipped",
      timestamp: now,
      actorId: seller.id,
      actorName: seller.name,
      note: `Colis expédié avec le transporteur ${tx.carrierName || "Mondial Relay"}. Numéro de suivi : ${tx.trackingNumber}.`,
    });

    storageService.saveTransaction(tx);

    // Notify Buyer
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: tx.buyerId,
      title: "Votre colis a été expédié !",
      message: `${seller.name} a envoyé "${tx.listingTitle}". Suivi colis : ${tx.trackingNumber}.`,
      type: "system",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return tx;
  }

  /**
   * Open a formal dispute
   */
  async openDispute(
    transactionId: string,
    actor: UserProfile,
    disputeData: {
      reason: string;
      description: string;
      evidenceUrls?: string[];
    },
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");

    const now = new Date().toISOString();
    const disputeId = `disp-${Date.now()}`;
    const dispute: TransactionDispute = {
      id: disputeId,
      openedBy: actor.id,
      openedByName: actor.name,
      role: actor.id === tx.buyerId ? "buyer" : "seller",
      reason: disputeData.reason,
      description: disputeData.description,
      evidenceUrls: disputeData.evidenceUrls || [],
      status: "open",
      createdAt: now,
    };

    tx.dispute = dispute;
    tx.status = "disputed";
    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: "disputed",
      timestamp: now,
      actorId: actor.id,
      actorName: actor.name,
      note: `Litige ouvert : "${disputeData.reason}". Les fonds sous séquestre restent gelés jusqu'à résolution.`,
    });

    storageService.saveTransaction(tx);

    // Notify Support and Counterpart
    const targetUserId = actor.id === tx.buyerId ? tx.sellerId : tx.buyerId;
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: targetUserId,
      title: "Un litige a été ouvert",
      message: `${actor.name} a signalé un problème concernant "${tx.listingTitle}". Les fonds sont sécurisés par notre service d'arbitrage.`,
      type: "system",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return tx;
  }

  /**
   * Resolve dispute (Support / Admin action)
   */
  async resolveDispute(
    transactionId: string,
    admin: UserProfile,
    resolution: {
      action: "full_refund" | "partial_refund" | "seller_payout" | "closed";
      note: string;
      refundAmount?: number;
    },
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");
    if (!tx.dispute)
      throw new Error("Aucun litige en cours sur cette transaction.");

    const now = new Date().toISOString();
    tx.dispute.status =
      resolution.action === "seller_payout"
        ? "resolved_payout"
        : resolution.action === "closed"
          ? "closed"
          : "resolved_refund";
    tx.dispute.resolvedAt = now;
    tx.dispute.resolutionNote = resolution.note;
    tx.dispute.resolutionAction = resolution.action;
    tx.dispute.refundAmount = resolution.refundAmount;

    if (resolution.action === "full_refund") {
      tx.status = "refunded";
      if (tx.payment) {
        tx.payment.escrowStatus = "refunded";
        tx.payment.refundedAt = now;
      }
      // Revert listing to active
      const listing = storageService
        .getListings()
        .find((l) => l.id === tx.listingId);
      if (listing) {
        listing.status = "active";
        listing.activeReservationId = undefined;
        storageService.saveListing(listing);
      }
    } else if (resolution.action === "seller_payout") {
      tx.status = "completed";
      tx.completedAt = now;
      if (tx.payment) {
        tx.payment.escrowStatus = "released";
        tx.payment.releasedAt = now;
      }
      this.creditSellerBalance(tx.sellerId, tx.sellerPayoutAmount || tx.amount);
    }

    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: tx.status,
      timestamp: now,
      actorId: admin.id,
      actorName: admin.name,
      note: `Arbitrage rendu : ${resolution.action.toUpperCase()}. Note : ${resolution.note}`,
    });

    storageService.saveTransaction(tx);

    auditService.logEvent({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: admin.role || "support",
      targetId: tx.id,
      targetName: tx.listingTitle,
      action: "listing_moderated",
      details: `Litige résolu par l'administrateur avec l'action "${resolution.action}".`,
    });

    return tx;
  }

  /**
   * Buyer cancels reservation before seller confirmation
   */
  async cancelReservationByBuyer(
    transactionId: string,
    buyer: UserProfile,
    reason?: string,
  ): Promise<Transaction> {
    const tx = storageService
      .getTransactions()
      .find((t) => t.id === transactionId);
    if (!tx) throw new Error("Transaction introuvable.");

    if (
      tx.buyerId !== buyer.id &&
      buyer.role !== "admin" &&
      buyer.role !== "super_admin"
    ) {
      throw new Error("Action non autorisée.");
    }

    if (
      tx.status !== "pending_seller_confirmation" &&
      tx.status !== "ready_for_pickup"
    ) {
      throw new Error(
        "Cette transaction ne peut plus être annulée directement sans arbitrage.",
      );
    }

    const now = new Date().toISOString();
    tx.status = "cancelled_by_buyer";
    if (tx.payment) {
      tx.payment.escrowStatus = "refunded";
      tx.payment.refundedAt = now;
    }
    tx.updatedAt = now;
    tx.statusHistory = tx.statusHistory || [];
    tx.statusHistory.push({
      status: "cancelled_by_buyer",
      timestamp: now,
      actorId: buyer.id,
      actorName: buyer.name,
      note: `Réservation annulée par l'acheteur (${reason || "Demande d'annulation avant confirmation"}). Remboursement intégral exécuté.`,
    });

    storageService.saveTransaction(tx);

    // Revert listing to active
    const listing = storageService
      .getListings()
      .find((l) => l.id === tx.listingId);
    if (listing) {
      listing.status = "active";
      listing.activeReservationId = undefined;
      storageService.saveListing(listing);
    }

    // Notify seller
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: tx.sellerId,
      title: "Réservation annulée par l'acheteur",
      message: `${buyer.name} a annulé sa réservation pour "${tx.listingTitle}". Votre annonce est à nouveau active et disponible.`,
      type: "system",
      linkUrl: "/compte/achats",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return tx;
  }

  /**
   * Get earnings and escrow metrics for a seller
   */
  getSellerEarningsSummary(sellerId: string): SellerEarningsSummary {
    const allTransactions = storageService
      .getTransactions()
      .filter((t) => t.sellerId === sellerId);

    // Escrow held (transactions in progress)
    const escrowHeldTransactions = allTransactions.filter(
      (t) =>
        t.payment?.escrowStatus === "held" &&
        (t.status === "pending_seller_confirmation" ||
          t.status === "seller_confirmed" ||
          t.status === "ready_for_pickup" ||
          t.status === "pickup_scheduled" ||
          t.status === "shipped" ||
          t.status === "delivered"),
    );
    const escrowHeldBalance = escrowHeldTransactions.reduce(
      (sum, t) => sum + (t.sellerPayoutAmount || t.amount),
      0,
    );

    // Stored wallet balance
    const walletBalance = this.getSellerAvailableBalance(sellerId);

    // Completed lifetime total
    const completedTransactions = allTransactions.filter(
      (t) => t.status === "completed",
    );
    const totalEarnings = completedTransactions.reduce(
      (sum, t) => sum + (t.sellerPayoutAmount || t.amount),
      0,
    );

    return {
      availableBalance: walletBalance,
      escrowHeldBalance,
      totalEarnings,
      pendingPayoutsCount: escrowHeldTransactions.length,
      completedTransactionsCount: completedTransactions.length,
    };
  }

  getSellerAvailableBalance(sellerId: string): number {
    const wallets = storageService.getByKey<Record<string, number>>(
      "shongre_seller_wallets_v1",
      {
        user_pro_atelier: 1450.0,
        user_camille: 320.0,
        user_thomas: 85.0,
      },
    );
    return wallets[sellerId] ?? 0;
  }

  creditSellerBalance(sellerId: string, amount: number): void {
    const wallets = storageService.getByKey<Record<string, number>>(
      "shongre_seller_wallets_v1",
      {
        user_pro_atelier: 1450.0,
        user_camille: 320.0,
        user_thomas: 85.0,
      },
    );
    wallets[sellerId] = (wallets[sellerId] || 0) + amount;
    storageService.setByKey("shongre_seller_wallets_v1", wallets);
  }

  debitSellerBalance(sellerId: string, amount: number): void {
    const wallets = storageService.getByKey<Record<string, number>>(
      "shongre_seller_wallets_v1",
      {
        user_pro_atelier: 1450.0,
        user_camille: 320.0,
        user_thomas: 85.0,
      },
    );
    wallets[sellerId] = Math.max(0, (wallets[sellerId] || 0) - amount);
    storageService.setByKey("shongre_seller_wallets_v1", wallets);
  }

  /**
   * Request payout to bank account
   */
  async requestPayout(
    seller: UserProfile,
    amount: number,
    payoutType: "standard" | "instant" = "standard",
    ibanLast4 = "8921",
    bankName = "BNP Paribas",
  ): Promise<SellerPayoutRequest> {
    const currentBalance = this.getSellerAvailableBalance(seller.id);
    if (amount <= 0 || amount > currentBalance) {
      throw new Error("Montant invalide ou solde disponible insuffisant.");
    }

    const payoutCommercials = getDemoTransactionCommercials(
      storageService.getActiveMarketCode() || "FR",
      "pro",
    );
    const fee =
      payoutType === "instant"
        ? Math.round(
            amount * 100 * (payoutCommercials.instantPayoutRateBps / 10_000) +
              payoutCommercials.instantPayoutFixedMinor,
          ) / 100
        : 0;
    const netAmount = amount - fee;

    this.debitSellerBalance(seller.id, amount);

    const now = new Date().toISOString();
    const payout: SellerPayoutRequest = {
      id: `payout-${Date.now()}`,
      sellerId: seller.id,
      sellerName: seller.name,
      amount,
      fee,
      netAmount,
      payoutType,
      ibanLast4,
      bankName,
      status: "completed",
      requestedAt: now,
      completedAt: now,
    };

    const payouts = storageService.getByKey<SellerPayoutRequest[]>(
      "shongre_seller_payouts_v1",
      [],
    );
    payouts.unshift(payout);
    storageService.setByKey("shongre_seller_payouts_v1", payouts);

    // Notify seller
    const notifs = storageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      userId: seller.id,
      title: "Virement bancaire initié",
      message: `Votre virement de ${netAmount.toFixed(2)} € vers votre compte ${bankName} (****${ibanLast4}) est en cours de transfert.`,
      type: "system",
      linkUrl: "/compte",
      isRead: false,
      createdAt: now,
    });
    storageService.saveNotifications(notifs);

    return payout;
  }

  getSellerPayouts(sellerId: string): SellerPayoutRequest[] {
    const payouts = storageService.getByKey<SellerPayoutRequest[]>(
      "shongre_seller_payouts_v1",
      [
        {
          id: "payout-init-1",
          sellerId: "user_pro_atelier",
          sellerName: "Atelier Nordique Mobilier",
          amount: 850.0,
          fee: 0,
          netAmount: 850.0,
          payoutType: "standard",
          ibanLast4: "4019",
          bankName: "Crédit Agricole Aquitaine",
          status: "completed",
          requestedAt: "2026-08-10T11:00:00Z",
          completedAt: "2026-08-11T09:30:00Z",
        },
      ],
    );
    return payouts.filter((p) => p.sellerId === sellerId);
  }
}

export const transactionService = new TransactionService();
