# Billing classification

Shongre primarily brokers physical goods and related local delivery/pickup. Payment for a physical item is classified separately from digital functionality and may use the marketplace payment processor, subject to current regional store rules.

Paid visibility (`Urgent`, `Remonter l’annonce`, `À la une`), subscriptions, credits, and any feature consumed in the app are digital products. The mobile app currently displays no purchase control for them. They must remain disabled until product/legal owners select and implement a compliant Apple/Google billing route per storefront and region, including server-authoritative receipts/entitlements, restore, refund, cancellation, price transparency, taxes, and account-deletion behavior.

`mobile/src/features/billing/billing.service.ts` is the classification boundary. UI code must not choose a payment rail. No external-payment link, steering text, or web checkout for digital goods may be added without a fresh policy review. Store-console product setup is manual and not represented as complete here.
