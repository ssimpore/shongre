import { majorToMinorAmount } from "@shongre/shared/money";
import { apiOperation } from "@/api/generated-api-operation";

/** One exchange as its participant sees it: enough for a history row. */
export interface MobileOrderSummary {
  id: string;
  orderNumber: string;
  listingId: string;
  listingTitle: string;
  listingPhotoUrl?: string;
  counterpartName: string;
  role: "buyer" | "seller";
  status: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
}

interface BackendOrder {
  id: string;
  orderNumber: string;
  listingId: string;
  listing?: {
    title?: string;
    images?: { url?: string }[];
    seller?: { name?: string };
  };
  buyer?: { name?: string };
  seller?: { name?: string };
  status: string;
  totalChargedMinor?: number;
  totalCharged?: number;
  currency?: string;
  createdAt: string;
}

function record(value: unknown): BackendOrder[] {
  return Array.isArray(value) ? (value as BackendOrder[]) : [];
}

function mapOrder(
  order: BackendOrder,
  role: "buyer" | "seller",
): MobileOrderSummary {
  const currency = order.currency || "EUR";
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    listingId: order.listingId,
    listingTitle: order.listing?.title || `Commande ${order.orderNumber}`,
    listingPhotoUrl: order.listing?.images?.[0]?.url,
    counterpartName:
      (role === "buyer"
        ? order.seller?.name || order.listing?.seller?.name
        : order.buyer?.name) || (role === "buyer" ? "Vendeur" : "Acheteur"),
    role,
    status: order.status,
    totalMinor:
      order.totalChargedMinor ??
      majorToMinorAmount(order.totalCharged ?? 0, currency),
    currency,
    createdAt: order.createdAt,
  };
}

export interface OrdersService {
  purchases(marketCode: string): Promise<MobileOrderSummary[]>;
  sales(marketCode: string): Promise<MobileOrderSummary[]>;
}

export class HttpOrdersService implements OrdersService {
  async purchases(marketCode: string): Promise<MobileOrderSummary[]> {
    return record(await apiOperation("getOrdersPurchases", {}, marketCode)).map(
      (order) => mapOrder(order, "buyer"),
    );
  }

  async sales(marketCode: string): Promise<MobileOrderSummary[]> {
    return record(await apiOperation("getOrdersSales", {}, marketCode)).map(
      (order) => mapOrder(order, "seller"),
    );
  }
}

export const ordersService: OrdersService = new HttpOrdersService();

/** The status vocabulary of the order lifecycle, in the participant's words. */
export const ORDER_STATUS_LABELS: Readonly<Record<string, string>> = {
  initiated: "Commande créée",
  payment_pending: "Paiement en attente",
  escrow_funded: "Paiement sécurisé",
  pending_seller_confirmation: "En attente du vendeur",
  ready_for_pickup: "Prête pour la remise",
  pin_pending: "Code de remise à valider",
  shipped: "Expédiée",
  completed: "Terminée",
  disputed: "Litige en cours",
  refund_pending: "Remboursement en cours",
  refunded: "Remboursée",
  cancelled: "Annulée",
};
