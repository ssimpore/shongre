import type { MessageCatalogue } from "./messages.fr";

/**
 * Small service-facing projection of the draft English catalogue.
 *
 * English is not a shipped UI locale yet, but messaging contracts can still be
 * requested in English by integration consumers. Keeping this projection
 * separate preserves that contract without pulling the full draft catalogue
 * into the application shell.
 */
export const messagingCatalogueEn = {
  "messaging.messageComposer.demoAttachmentCondition": "Condition photo",
  "messaging.messageComposer.demoAttachmentInvoice": "Invoice / warranty",
  "messaging.messageComposer.demoAttachmentAccessories":
    "Included accessories",
  "messaging.messageComposer.quickReplyAvailable":
    "Hello, yes, the item is in stock.",
  "messaging.messageComposer.quickReplyShipping":
    "Hello, tracked shipping is available within 24 hours.",
  "messaging.messageComposer.quickReplyPickup":
    "Hello, we can arrange collection from the store.",
  "messaging.messageComposer.quickReplyInvoice":
    "Hello, a VAT invoice is available on request.",
} satisfies MessageCatalogue;
