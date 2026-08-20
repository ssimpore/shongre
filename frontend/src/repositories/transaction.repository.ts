import { Transaction, TransactionStatus, TransactionDispute, SellerPayoutRequest } from '../types';
import { storageService } from '../services/storage.service';
import { transactionService } from '../domains/transaction/transaction.service';

export interface ITransactionRepository {
  getTransactions(userId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  getPurchases(buyerId: string): Promise<Transaction[]>;
  getSales(sellerId: string): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | null>;
  createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  updateTransactionStatus(id: string, status: TransactionStatus, note?: string): Promise<Transaction>;
  updateShipmentStatus(id: string, trackingNumber: string, carrierName?: string): Promise<Transaction>;
  confirmHandoverPin(id: string, pinCode: string): Promise<boolean>;
  confirmReceipt(id: string): Promise<Transaction>;
  openDispute(id: string, dispute: Omit<TransactionDispute, 'id' | 'createdAt'>): Promise<Transaction>;
  resolveDispute(id: string, action: 'full_refund' | 'partial_refund' | 'seller_payout', note?: string): Promise<Transaction>;
  requestSellerPayout(sellerId: string, amount: number, instant?: boolean): Promise<SellerPayoutRequest>;
}

export class MockTransactionRepository implements ITransactionRepository {
  async getTransactions(userId: string): Promise<Transaction[]> {
    const all = storageService.getTransactions();
    return all.filter((t) => t.buyerId === userId || t.sellerId === userId);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return storageService.getTransactions();
  }

  async getPurchases(buyerId: string): Promise<Transaction[]> {
    const all = storageService.getTransactions();
    return all.filter((t) => t.buyerId === buyerId);
  }

  async getSales(sellerId: string): Promise<Transaction[]> {
    const all = storageService.getTransactions();
    return all.filter((t) => t.sellerId === sellerId);
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const all = storageService.getTransactions();
    return all.find((t) => t.id === id || t.code === id) || null;
  }

  async createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const now = new Date().toISOString();
    const tx: Transaction = {
      ...data,
      id: `tx-${Date.now()}`,
      code: data.code || transactionService.generateReferenceCode(),
      createdAt: now,
      updatedAt: now,
    };
    storageService.saveTransaction(tx);
    return tx;
  }

  async updateTransactionStatus(id: string, status: TransactionStatus, note?: string): Promise<Transaction> {
    const tx = await this.getTransactionById(id);
    if (!tx) throw new Error('Transaction non trouvée');

    const currentUser = storageService.getCurrentUser();
    const now = new Date().toISOString();

    tx.status = status;
    tx.updatedAt = now;

    if (!tx.statusHistory) {
      tx.statusHistory = [];
    }

    tx.statusHistory.push({
      status,
      timestamp: now,
      actorId: currentUser?.id || 'system',
      actorName: currentUser?.name || 'Système Shongre',
      note,
    });

    storageService.saveTransaction(tx);
    return tx;
  }

  async updateShipmentStatus(id: string, trackingNumber: string, carrierName?: string): Promise<Transaction> {
    const tx = await this.getTransactionById(id);
    if (!tx) throw new Error('Transaction non trouvée');

    const now = new Date().toISOString();
    tx.status = 'shipped';
    tx.trackingNumber = trackingNumber;
    if (carrierName) tx.carrierName = carrierName;
    tx.shippedAt = now;
    tx.updatedAt = now;

    if (!tx.statusHistory) tx.statusHistory = [];
    tx.statusHistory.push({
      status: 'shipped',
      timestamp: now,
      actorId: tx.sellerId,
      actorName: tx.sellerName,
      note: `Colis expédié via ${carrierName || tx.carrierName || 'Transporteur'}. N° de suivi : ${trackingNumber}`,
    });

    storageService.saveTransaction(tx);
    return tx;
  }

  async confirmHandoverPin(id: string, pinCode: string): Promise<boolean> {
    const tx = await this.getTransactionById(id);
    if (!tx) throw new Error('Transaction non trouvée');

    if (!tx.verificationCode || tx.verificationCode.trim() !== pinCode.trim()) {
      return false;
    }

    const now = new Date().toISOString();
    tx.verificationCodeStatus = 'verified';
    tx.status = 'completed';
    tx.handoverConfirmedAt = now;
    tx.completedAt = now;
    tx.updatedAt = now;

    if (tx.payment) {
      tx.payment.escrowStatus = 'released';
      tx.payment.releasedAt = now;
    }

    if (!tx.statusHistory) tx.statusHistory = [];
    tx.statusHistory.push({
      status: 'completed',
      timestamp: now,
      actorId: tx.sellerId,
      actorName: tx.sellerName,
      note: 'Code PIN validé avec succès. Remise en main propre effectuée et fonds libérés.',
    });

    storageService.saveTransaction(tx);
    return true;
  }

  async confirmReceipt(id: string): Promise<Transaction> {
    const tx = await this.getTransactionById(id);
    if (!tx) throw new Error('Transaction non trouvée');

    const now = new Date().toISOString();
    tx.status = 'completed';
    tx.deliveredAt = now;
    tx.completedAt = now;
    tx.updatedAt = now;

    if (tx.payment) {
      tx.payment.escrowStatus = 'released';
      tx.payment.releasedAt = now;
    }

    if (!tx.statusHistory) tx.statusHistory = [];
    tx.statusHistory.push({
      status: 'completed',
      timestamp: now,
      actorId: tx.buyerId,
      actorName: tx.buyerName,
      note: 'Réception confirmée par l\'acheteur. Transaction finalisée et fonds débloqués.',
    });

    storageService.saveTransaction(tx);
    return tx;
  }

  async openDispute(id: string, dispute: Omit<TransactionDispute, 'id' | 'createdAt'>): Promise<Transaction> {
    const tx = await this.getTransactionById(id);
    if (!tx) throw new Error('Transaction non trouvée');

    const now = new Date().toISOString();
    const newDispute: TransactionDispute = {
      ...dispute,
      id: `disp-${Date.now()}`,
      createdAt: now,
      status: 'open',
    };

    tx.status = 'disputed';
    tx.dispute = newDispute;
    tx.updatedAt = now;

    if (!tx.statusHistory) tx.statusHistory = [];
    tx.statusHistory.push({
      status: 'disputed',
      timestamp: now,
      actorId: dispute.openedBy,
      actorName: dispute.openedByName,
      note: `Litige ouvert : "${dispute.reason}". Les fonds restent bloqués sous séquestre.`,
    });

    storageService.saveTransaction(tx);
    return tx;
  }

  async resolveDispute(
    id: string,
    action: 'full_refund' | 'partial_refund' | 'seller_payout',
    note?: string
  ): Promise<Transaction> {
    const tx = await this.getTransactionById(id);
    if (!tx) throw new Error('Transaction non trouvée');

    const now = new Date().toISOString();

    if (action === 'full_refund') {
      tx.status = 'refunded';
      if (tx.payment) {
        tx.payment.escrowStatus = 'refunded';
        tx.payment.refundedAt = now;
      }
      if (tx.dispute) {
        tx.dispute.status = 'resolved_refund';
        tx.dispute.resolvedAt = now;
        tx.dispute.resolutionNote = note || 'Remboursement intégral accordé à l\'acheteur.';
      }
    } else {
      tx.status = 'completed';
      if (tx.payment) {
        tx.payment.escrowStatus = 'released';
        tx.payment.releasedAt = now;
      }
      if (tx.dispute) {
        tx.dispute.status = 'resolved_payout';
        tx.dispute.resolvedAt = now;
        tx.dispute.resolutionNote = note || 'Litige clôturé en faveur du vendeur.';
      }
    }

    tx.updatedAt = now;
    storageService.saveTransaction(tx);
    return tx;
  }

  async requestSellerPayout(sellerId: string, amount: number, instant = false): Promise<SellerPayoutRequest> {
    const now = new Date().toISOString();
    const currentUser = storageService.getCurrentUser();
    const fee = instant ? 0.90 : 0.00;

    const req: SellerPayoutRequest = {
      id: `payout-${Date.now()}`,
      sellerId,
      sellerName: currentUser?.name || 'Vendeur Shongre',
      amount,
      fee,
      netAmount: amount - fee,
      payoutType: instant ? 'instant' : 'standard',
      ibanLast4: '4892',
      bankName: 'BNP Paribas',
      status: 'processing',
      requestedAt: now,
    };

    return req;
  }
}

export const transactionRepository: ITransactionRepository = new MockTransactionRepository();
