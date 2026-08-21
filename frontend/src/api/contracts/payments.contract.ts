export interface PaymentIntentResult {
  clientSecret: string;
  status: "succeeded" | "requires_action" | "pending" | "failed";
  amount: number;
  currency: string;
}

export interface PaymentsServiceContract {
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult>;
  requestSellerPayout(
    sellerId: string,
    amount: number,
    iban: string,
  ): Promise<{ payoutId: string; status: "completed" | "processing" }>;
  getSellerBalance(
    sellerId: string,
  ): Promise<{ available: number; pending: number; currency: string }>;
}
