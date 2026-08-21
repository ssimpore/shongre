import {
  OrdersServiceContract,
  CreateDirectPurchaseInput,
  CreateReservationInput,
} from "../../contracts/orders.contract";
import { httpClient } from "./http-client";
import { Transaction } from "../../../types";

export class HttpOrdersService implements OrdersServiceContract {
  async getOrderById(orderId: string): Promise<Transaction | null> {
    return httpClient.get<Transaction>(`/orders/${orderId}`);
  }

  async getPurchases(userId: string): Promise<Transaction[]> {
    return httpClient.get<Transaction[]>(`/orders/purchases/${userId}`);
  }

  async getSales(userId: string): Promise<Transaction[]> {
    return httpClient.get<Transaction[]>(`/orders/sales/${userId}`);
  }

  async createDirectPurchase(
    input: CreateDirectPurchaseInput,
  ): Promise<Transaction> {
    return httpClient.post<Transaction>("/orders/direct-purchase", input);
  }

  async createReservation(input: CreateReservationInput): Promise<Transaction> {
    return httpClient.post<Transaction>("/orders/reservation", input);
  }

  async confirmHandoverPIN(
    orderId: string,
    enteredPin: string,
  ): Promise<{ success: boolean; message: string }> {
    return httpClient.post<{ success: boolean; message: string }>(
      `/orders/${orderId}/confirm-pin`,
      { pin: enteredPin },
    );
  }

  async confirmDeliveryReceived(orderId: string): Promise<Transaction> {
    return httpClient.post<Transaction>(`/orders/${orderId}/confirm-delivery`);
  }

  async openDispute(
    orderId: string,
    reason: string,
    details: string,
  ): Promise<Transaction> {
    return httpClient.post<Transaction>(`/orders/${orderId}/dispute`, {
      reason,
      details,
    });
  }
}

export const httpOrdersService = new HttpOrdersService();
