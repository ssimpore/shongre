# Shongre REST API v1 Specification

Base URL: `http://localhost:4000/api/v1`

---

## 1. Authentication (`/api/v1/auth`)

- `POST /auth/login`: Authenticate with email/password.
- `POST /auth/register`: Create a new user account.
- `GET /auth/me`: Get current authenticated user profile.
- `POST /auth/logout`: Invalidate session.
- `POST /auth/switch-role`: Switch active platform role.
- `POST /auth/verify-phone`: Verify phone OTP.
- `POST /auth/verify-email`: Verify email confirmation token.

---

## 2. Listings & Search (`/api/v1/listings`, `/api/v1/search`)

- `GET /listings`: Paginated search with filtering query params.
- `GET /listings/:id`: Detailed listing info.
- `POST /listings/search`: Advanced structured search payload.
- `POST /listings/publish`: Publish a draft listing after AI safety screening.
- `PUT /listings/:id`: Update listing fields.
- `DELETE /listings/:id`: Delete a listing.
- `POST /listings/:id/favorite`: Toggle favorite listing for active user.
- `GET /favorites`: Get favorite listing IDs.

---

## 3. Orders & Escrow (`/api/v1/orders`)

- `GET /orders/:id`: Order details and escrow state.
- `POST /orders/direct-purchase`: Create direct purchase with full escrow calculation.
- `POST /orders/reservation`: Create reservation with deposit escrow hold.
- `POST /orders/:id/confirm-pin`: Verify 4-digit handover PIN to release escrow funds.
- `POST /orders/:id/confirm-delivery`: Confirm delivery receipt.
- `POST /orders/:id/dispute`: Open an order dispute.

---

## 4. Monetization & Boosts (`/api/v1/promotions`)

- `GET /promotions/boosts`: Available boosts (`urgent`, `search_bump`, `featured`).
- `GET /promotions/pro-plans`: Pro subscription plans (`starter`, `pro`, `enterprise`).
- `POST /promotions/apply-boost`: Apply boost to a listing.
- `POST /promotions/subscribe-pro`: Subscribe to a Pro plan.

---

## 5. Verification & KYB/KYC (`/api/v1/verification`)

- `GET /verification/status/:userId`: Progressive verification tier summary.
- `POST /verification/identity`: Submit identity document.
- `GET /verification/siret-lookup/:siret`: Validate French SIRET / EU company.
- `POST /verification/business-registration`: Submit professional registration.
- `POST /verification/bank-coordinates`: Submit IBAN/BIC payout information.
