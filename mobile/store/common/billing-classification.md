# Billing classification

Shongre primarily brokers physical goods and related local delivery/pickup. Payment for a physical item is classified separately from digital functionality and may use the marketplace payment processor, subject to current regional store rules.

Paid visibility (`Urgent`, `Remonter l’annonce`, `À la une`), subscriptions, credits, and any feature consumed in the app are digital products. The mobile app currently displays no purchase control for them. They must remain disabled until product/legal owners select and implement a compliant Apple/Google billing route per storefront and region, including server-authoritative receipts/entitlements, restore, refund, cancellation, price transparency, taxes, and account-deletion behavior.

The mobile release gate enforces the current boundary by failing when a digital checkout endpoint or checkout implementation becomes reachable from `mobile/app` or `mobile/src`. UI code must not choose a payment rail. No external-payment link, steering text, or web checkout for digital goods may be added without a fresh policy review and a server-authoritative store-billing implementation. Store-console product setup is manual and is not represented as complete here.

`commercial-fr-v4-draft` does not change this classification. Its subscriptions, visibility products, promotion credits and additional digital listing capacity remain unavailable for purchase in the mobile app. The draft may be displayed only through a future catalog projection after the store-compliant billing and restore/refund flows are approved; catalog publication alone is not authorization to expose mobile checkout.
