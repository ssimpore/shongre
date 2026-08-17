import { OrdersServiceContract, CreateDirectPurchaseInput, CreateReservationInput } from '../../contracts/orders.contract';
import { transactionRepository } from '../../../repositories/transaction.repository';
import { transactionService } from '../../../domains/transaction/transaction.service';
import { listingRepository } from '../../../repositories/listing.repository';
import { storageService } from '../../../services/storage.service';
import { Transaction } from '../../../types';
import { simulateNetworkDelay } from '../../client/api-client.config';

export class DemoOrdersService implements OrdersServiceContract {
  async getOrderById(orderId: string): Promise<Transaction | null> {
    await simulateNetworkDelay();
    return transactionRepository.getTransactionById(orderId);
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    await simulateNetworkDelay();
    return transactionRepository.getPurchases(userId);
  }

  async getSales(userId: string): Promise<Transaction[]> {
    await simulateNetworkDelay();
    return transactionRepository.getSales(userId);
  }

  async createDirectPurchase(input: CreateDirectPurchaseInput): Promise<Transaction> {
    await simulateNetworkDelay();
    const listing = await listingRepository.getListingById(input.listingId);
    if (!listing) throw new Error('Annonce introuvable');

    const pricing = transactionService.calculateOrderPricingSnapshot(
      listing.price,
      1,
      4.99,
      listing.sellerType,
      listing.marketCodes?.[0] || 'FR'
    );

    const tx = await transactionRepository.createTransaction({
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      listingPhotoUrl: listing.coverImageUrl,
      buyerId: input.buyerId,
      buyerName: storageService.getCurrentUser()?.name || 'Acheteur',
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      amount: pricing.itemSubtotalMinor / 100,
      totalAmount: pricing.totalAmountMinor / 100,
      protectionFee: pricing.buyerProtectionFeeMinor / 100,
      shippingFee: pricing.shippingFeeMinor / 100,
      currency: pricing.currency,
      status: 'payment_escrowed',
      deliveryMethod: input.deliveryMethod,
    });

    return tx;
  }

  async createReservation(input: CreateReservationInput): Promise<Transaction> {
    await simulateNetworkDelay();
    const listing = await listingRepository.getListingById(input.listingId);
    if (!listing) throw new Error('Annonce introuvable');

    const tx = await transactionRepository.createTransaction({
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      listingPhotoUrl: listing.coverImageUrl,
      buyerId: input.buyerId,
      buyerName: storageService.getCurrentUser()?.name || 'Acheteur',
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      amount: input.depositAmount,
      totalAmount: input.depositAmount + 0.99,
      protectionFee: 0.99,
      shippingFee: 0,
      currency: listing.currency,
      status: 'payment_escrowed',
      deliveryMethod: 'hand_delivery',
    });

    return tx;
  }

  async confirmHandoverPIN(orderId: string, enteredPin: string): Promise<{ success: boolean; message: string }> {
    await simulateNetworkDelay();
    const success = await transactionRepository.confirmHandoverPin(orderId, enteredPin);
    if (success) {
      return { success: true, message: 'Code PIN validé avec succès ! Fonds débloqués.' };
    }
    return { success: false, message: 'Code PIN incorrect ou transaction non valide.' };
  }

  async confirmDeliveryReceived(orderId: string): Promise<Transaction> {
    await simulateNetworkDelay();
    return transactionRepository.updateTransactionStatus(orderId, 'completed');
  }

  async openDispute(orderId: string, reason: string, details: string): Promise<Transaction> {
    await simulateNetworkDelay();
    const user = storageService.getCurrentUser();
    return transactionRepository.openDispute(orderId, {
      openedBy: user?.id || 'buyer',
      openedByName: user?.name || 'Acheteur',
      role: 'buyer',
      reason,
      description: details,
      status: 'open',
    });
  }
}

export const demoOrdersService = new DemoOrdersService();
