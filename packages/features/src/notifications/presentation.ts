export type NotificationTone = "info" | "success" | "warning" | "error";
export const notificationToneByType: Record<string, NotificationTone> = {
  listing_published: "success",
  listing_rejected: "error",
  message_received: "info",
  payment_required: "warning",
  verification_required: "warning",
};
export const resolveNotificationTone = (type: string): NotificationTone =>
  notificationToneByType[type] ?? "info";
