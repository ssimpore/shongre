import { Principal } from "../../../shared/auth/principal.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { hasStaffOverride } from "../../../shared/auth/has-permission.js";

export function assertOrderParticipant<
  T extends { buyerId: string; sellerId: string } | null,
>(principal: Principal, order: T): T {
  if (!order) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Commande introuvable.",
    });
  }
  if (
    order.buyerId !== principal.userId &&
    order.sellerId !== principal.userId &&
    !hasStaffOverride(principal, "order.refund")
  ) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Commande introuvable.",
    });
  }
  return order;
}
