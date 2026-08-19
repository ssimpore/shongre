# AGENTS.md — Shongre Engineering Rules

## 1. Purpose

This file defines the mandatory engineering rules for **Shongre**.

Shongre is a multi-country classifieds marketplace for:

* **Particuliers**
* **Professionnels**
* buyers
* sellers
* professional organizations
* professional team members
* moderators
* Trust & Safety
* support
* finance
* administrators

The platform includes or will include:

* listings
* hierarchical taxonomy
* multi-market publication
* geographic search
* seller profiles
* professional stores
* messaging
* favorites
* saved searches
* notifications
* reservations
* local pickup
* orders
* payments
* payouts
* reviews
* moderation
* fraud prevention
* progressive KYC/KYB
* subscriptions
* entitlements
* paid listing visibility
* administration
* analytics
* future AI capabilities

All coding agents must follow this file before modifying the repository.

---

# 2. Golden rule

The goal is **not to rewrite Shongre from scratch**.

Always:

1. inspect the existing implementation;
2. understand the current architecture;
3. identify what already works;
4. reuse good existing code;
5. improve weak implementations;
6. consolidate duplicated implementations;
7. implement missing functionality;
8. remove obsolete code only after verifying that it is no longer used.

Treat the current working application as the baseline.

Prefer incremental improvement over unnecessary rewrites.

---

# 3. Repository structure

The canonical repository architecture is:

```text
shongre/
│
├── frontend/
│
├── backend/
│
└── repository-level tooling
```

Application implementation must not drift back into miscellaneous root directories.

---

# 4. Mandatory frontend boundary

**All frontend application code must live under:**

```text
frontend/
```

This includes:

* application routes
* pages
* layouts
* components
* modules
* styles
* design system
* hooks
* contexts
* frontend utilities
* API contracts
* demo adapters
* HTTP adapters
* frontend fixtures
* frontend tests
* frontend E2E tests
* public frontend assets
* frontend scripts
* frontend documentation
* frontend configuration

Do not create frontend implementation at root under:

```text
src/
app/
pages/
components/
styles/
public/
hooks/
contexts/
design-system/
```

If such legacy frontend files already exist:

1. determine whether they are still used;
2. migrate/consolidate them safely;
3. update imports and tooling;
4. validate the application;
5. remove obsolete duplicates.

Do not copy files and leave both implementations active.

---

# 5. Mandatory backend boundary

**All backend implementation must live under:**

```text
backend/
```

This includes:

* API code
* domain services
* repositories
* authorization
* validation
* Supabase infrastructure
* PostgreSQL migrations
* database functions
* RLS policies
* Supabase Edge Functions
* Supabase Queues
* cron jobs
* workers
* payment integrations
* Stripe integrations
* KYC/KYB integrations
* fraud logic
* search implementation
* storage administration
* webhooks
* backend tests
* backend scripts
* generated DB types
* backend documentation
* backend environment configuration

Do not create backend logic under:

```text
frontend/
src/server/
src/api/
lib/server/
api/
server/
functions/
```

outside `backend/`.

---

# 6. Supabase location

The canonical Supabase directory is:

```text
backend/supabase/
```

Use:

```text
backend/supabase/
├── config.toml
├── migrations/
├── functions/
├── seed/
├── policies/
└── tests/
```

Do not maintain a second root-level:

```text
/supabase
```

directory.

All database schema changes must be migration-driven.

---

# 7. Frontend/backend dependency direction

The mandatory dependency flow is:

```text
User
 │
 ▼
frontend/
 │
 │ typed public contract
 ▼
backend/
 │
 ▼
Supabase / external integrations
```

The frontend must never import backend implementation directly.

Forbidden:

```ts
import { listingRepository } from "../../backend/...";
import { supabaseAdmin } from "../../backend/...";
import { stripe } from "../../backend/...";
```

Frontend and backend communicate through explicit public contracts.

---

# 8. Critical current frontend constraint

## The frontend must NOT connect to the real backend yet

At the current stage, the frontend must operate independently.

Current runtime architecture:

```text
frontend/
    │
    ▼
frontend service contracts
    │
    ▼
demo adapters
    │
    ▼
deterministic local data
```

Future architecture:

```text
frontend/
    │
    ▼
same service contracts
    │
    ▼
HTTP adapters
    │
    ▼
backend/
    │
    ▼
Supabase
```

Do not connect the frontend to the real backend until explicitly requested.

---

# 9. No current production API calls from frontend

During normal frontend execution, do not call:

```text
backend/
production /api/v1/*
Supabase business tables
Supabase RPCs
Supabase Edge Functions
Stripe APIs
Stripe Connect
Stripe Identity
KYC providers
business registry providers
production search services
```

The entire frontend must be testable with the backend stopped.

This should work:

```bash
cd frontend
npm install
npm run dev
```

without starting:

```text
backend
Supabase
Stripe CLI
KYC services
```

---

# 10. Frontend data mode

Frontend data access must be adapter-based.

Conceptually support:

```text
demo
api
```

Current mode must be:

```text
demo
```

Use centralized configuration, for example:

```env
NEXT_PUBLIC_DATA_MODE=demo
```

Reserve future configuration such as:

```env
NEXT_PUBLIC_API_URL=
```

but do not contact it in demo mode.

Never silently fall back to a backend or Supabase instance.

---

# 11. No demo conditionals throughout UI

Do not write:

```ts
if (isDemoMode) {
  // fake implementation
} else {
  // production implementation
}
```

inside pages and components.

Instead:

```text
Component
   ↓
Hook / controller
   ↓
Service interface
   ↓
Adapter
```

Current:

```text
Service
   ↓
DemoAdapter
```

Future:

```text
Service
   ↓
HttpAdapter
```

UI code should remain unchanged.

---

# 12. Frontend service architecture

Backend-facing functionality must use centralized service contracts.

Use or adapt services such as:

```text
AuthService
ProfileService
UsersService
SellersService
OrganizationsService
StoresService

MarketsService
LocationsService
TaxonomyService

ListingsService
PublicationService
SearchService
FavoritesService
SavedSearchesService

MessagingService
NotificationsService

BookingsService
OrdersService
PaymentsService
PayoutsService

PlansService
SubscriptionsService
EntitlementsService
PromotionsService

VerificationService
TrustService

ReviewsService
ReportsService

WorkspaceService
ProWorkspaceService
AdminService
```

Do not create a service simply because it appears in this list if equivalent functionality already exists.

---

# 13. Demo adapters

Demo adapters must be deterministic and asynchronous.

Examples:

```text
DemoAuthService
DemoListingsService
DemoSearchService
DemoMarketsService
DemoTaxonomyService
DemoMessagingService
DemoPaymentsService
DemoPromotionsService
DemoVerificationService
DemoAdminService
```

Methods should return:

```ts
Promise<T>
```

even if the underlying data is local.

This keeps demo and future HTTP implementations compatible.

---

# 14. No fake backend logic inside components

Forbidden:

```ts
setTimeout(() => {
  setPaymentSucceeded(true);
}, 1000);
```

inside a checkout component.

Forbidden:

```ts
const urgentPrice = 2.99;
```

inside a listing card.

Forbidden:

```ts
if (listing.price > 5000) {
  requireKyc();
}
```

inside publication UI.

Use services:

```ts
const result = await paymentsService.confirm(...);
```

or:

```ts
const offers = await promotionsService.getOffers(listingId);
```

Demo behavior belongs in demo adapters.

---

# 15. Demo determinism

Do not use uncontrolled:

```ts
Math.random()
```

for important demo behavior.

Payment, KYC, moderation, listing eligibility, subscription state, and fraud scenarios must be reproducible.

Support deterministic scenarios such as:

```text
default
empty_search
search_error

payment_success
payment_pending
payment_failed
payment_requires_action

kyc_required
kyc_pending
kyc_failed
kyc_verified
reverification_required

featured_unavailable

subscription_expired
listing_under_review
seller_restricted
conversation_blocked
```

---

# 16. Demo personas

Demo mode should support realistic personas where relevant:

```text
guest

individual_new
individual_verified
individual_seller
individual_kyc_required
individual_payment_required

pro_new
pro_unverified
pro_verified
pro_owner
pro_employee

moderator
trust_safety
support
finance
admin
```

Role switching should use the existing demo infrastructure where possible.

Do not duplicate a second demo-mode system.

---

# 17. Central demo store

If demo mutations need temporary persistence, use one controlled store such as:

```text
DemoDataStore
```

Responsibilities may include:

```text
read
update
reset
initialize scenario
```

Do not let individual React components mutate independent fixture arrays.

---

# 18. Frontend contracts must not mirror raw database rows

Avoid making UI components depend directly on:

```ts
Database["public"]["Tables"]["listings"]["Row"]
```

Use public API/view models.

Example:

```ts
interface ListingCardView {
  id: string;
  title: string;
  price: Money;
  image: ListingImage;
  location: LocationSummary;
  seller: SellerSummary;
  promotion: PromotionPresentation;
}
```

Database schema is a backend implementation detail.

---

# 19. Future HTTP adapters

Reserve an explicit location such as:

```text
frontend/src/api/adapters/http/
```

The future backend connection should primarily require:

```text
implement HTTP adapters
configure API URL
configure authentication/session transport
map backend DTOs
run contract tests
```

It must not require rewriting pages or components.

---

# 20. No privileged Supabase usage in frontend

The frontend must never contain:

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
Stripe secret keys
KYC secret keys
SMTP secrets
SMS secrets
private registry credentials
```

Forbidden:

```env
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_SECRET_KEY=
NEXT_PUBLIC_DATABASE_URL=
```

Anything privileged belongs in:

```text
backend/
```

---

# 21. Supabase Auth exception

If existing frontend functionality already relies on Supabase Auth and removing it would create unnecessary breakage:

* isolate it behind `AuthService`;
* do not spread Supabase calls through UI components;
* provide a complete demo auth adapter;
* standalone demo mode must not require Supabase.

Do not use this exception to access business tables directly.

---

# 22. Backend architecture

Backend should be a **modular monolith first**.

Do not prematurely introduce microservices.

Conceptual domains include:

```text
auth
users
profiles
sellers
organizations
stores

markets
locations
taxonomy
attributes

listings
media
search
favorites
saved-searches

messaging
notifications

bookings
orders
payments
payouts
refunds

monetization
plans
subscriptions
entitlements
promotions

verification
kyc
kyb
trust
fraud

reviews
reports
moderation

analytics
audit
admin
```

---

# 23. Backend business logic

Critical business operations belong in backend domain/application services.

Examples:

```text
publishListing()
reserveListing()
markListingSold()

createOrder()
cancelOrder()
refundOrder()

purchasePromotion()
activateUrgent()
bumpListing()
activateFeatured()

createPayment()
processPaymentWebhook()

resolveEntitlements()

evaluateVerificationRequirements()
evaluateRisk()

moderateListing()
```

Do not put authoritative implementations in frontend.

---

# 24. Supabase principle

Use:

> **Supabase as infrastructure and PostgreSQL as the source of truth; Shongre domain services own marketplace business logic.**

Do not turn the architecture into:

```text
browser
  ↓
supabase.from(...)
```

for critical marketplace operations.

---

# 25. Database principles

Prefer relational PostgreSQL modeling for important data.

Use:

* primary keys
* foreign keys
* unique constraints
* check constraints
* proper defaults
* explicit timestamps
* appropriate indexes
* explicit cascading rules

Use JSONB only when the data is genuinely dynamic or sparse.

Do not hide core business entities inside generic JSON blobs.

---

# 26. Migrations

All production schema changes must be represented in:

```text
backend/supabase/migrations/
```

Do not rely on manually changing production through the Supabase dashboard without a migration.

For risky schema changes prefer:

```text
expand
→ backfill/migrate
→ verify
→ contract
```

Avoid destructive one-step migrations on important production data.

---

# 27. RLS

Use Row Level Security for Supabase-exposed tables.

Default philosophy:

> **Deny by default. Explicitly grant required access.**

Test RLS independently.

Never treat frontend filtering as authorization.

---

# 28. Service-role key

The Supabase service-role key must:

* only exist server-side;
* never enter browser bundles;
* never be logged;
* never be committed;
* never be stored in public runtime configuration.

Audit changes for accidental leakage.

---

# 29. Multi-country architecture

Shongre is multi-market from the start.

France is the first/default market, but do not hardcode France throughout the platform.

Core market-aware context includes:

```text
market
country
locale
currency
timezone
location
```

Different markets may have different:

* taxonomy
* available categories
* publication rules
* pricing
* monetization
* legal content
* KYC/KYB requirements
* currencies
* languages

---

# 30. Market terminology

Use **market** for Shongre operational/geographic marketplace configuration.

Avoid mixing:

```text
country
market
region
site
locale
```

when they represent different domain concepts.

Use consistent terminology in code and UI.

---

# 31. Multi-market listing publication

A seller may publish the same listing into one or more eligible markets.

Frontend should support backend-shaped concepts such as:

```text
Listing
   ├── France
   ├── Belgique
   └── Luxembourg
```

Do not duplicate the entire listing client-side per market.

Eligibility must ultimately be backend-controlled.

---

# 32. Taxonomy

Taxonomy must support hierarchical classification and dynamic attributes.

Conceptually:

```text
Category
  ↓
Subcategory
  ↓
Type
  ↓
Subtype
  ↓
Attributes
```

Do not assume every branch has identical depth.

Taxonomy must support:

* dynamic publication forms
* category-specific filters
* listing details
* cards where useful
* market-specific availability

---

# 33. Taxonomy-driven frontend

Do not build giant condition trees such as:

```ts
if (category === "vehicle") ...
if (category === "real_estate") ...
if (category === "electronics") ...
```

for fields that can be driven from taxonomy metadata.

Support reusable field types such as:

```text
text
number
boolean
single select
multi select
range
date
dependent select
```

---

# 34. Money

Never use floating-point arithmetic for authoritative financial values.

Frontend/backend contracts should conceptually use:

```text
amountMinor
currency
```

Example:

```text
299
EUR
```

represents:

```text
2,99 €
```

Format using locale-aware APIs.

---

# 35. Time

Store authoritative backend timestamps as timezone-aware values.

Frontend should localize for display.

Use explicit semantics:

```text
createdAt
publishedAt
startsAt
endsAt
completedAt
```

Do not reinterpret a search bump as actual listing creation.

---

# 36. Listing lifecycle

Use a coherent state model.

Conceptually:

```text
DRAFT
PENDING_REVIEW
PUBLISHED
RESERVED
SOLD
EXPIRED
SUSPENDED
REJECTED
REMOVED
ARCHIVED
```

Avoid unrelated boolean combinations such as:

```text
is_active
is_sold
is_reserved
is_deleted
```

when one domain state can represent lifecycle more clearly.

Frontend consumes normalized state.

Backend owns transitions.

---

# 37. Publication journey

The frontend should support a progressive journey such as:

```text
Category
   ↓
Details
   ↓
Attributes
   ↓
Photos
   ↓
Price
   ↓
Location
   ↓
Delivery / pickup
   ↓
Payment options
   ↓
Markets
   ↓
Preview
   ↓
Verification if required
   ↓
Optional paid visibility
   ↓
Publish
```

Do not overwhelm users by putting every field on one screen.

---

# 38. Draft preservation

Publication state should survive expected interruptions including:

```text
authentication
email verification
phone verification
KYC
payment flow
promotion flow
navigation
refresh
temporary network issues
```

Do not lose:

* photos
* title
* description
* category
* attributes
* price
* location
* market selection
* delivery settings

Do not store sensitive KYC/payment information in localStorage.

---

# 39. Progressive KYC/KYB

KYC must be progressive and contextual.

Do not force every new account through full identity verification.

Conceptual progression:

```text
Account
 ↓
Email
 ↓
Phone
 ↓
Seller information
 ↓
Identity/payment verification when needed
 ↓
Business/KYB for Pro
 ↓
Enhanced verification when required
```

Frontend must consume requirements from `VerificationService`.

Do not hardcode KYC thresholds in components.

---

# 40. Verification dimensions

Do not reduce trust to:

```text
verified = true
```

Keep distinct concepts such as:

```text
email
phone
identity
business
representative
payment
payout
bank
tax
professional status
```

Public badges should expose only appropriate user-safe information.

---

# 41. Fraud

Fraud/risk logic belongs in the backend.

Possible risk domains include:

```text
user
seller
listing
device
conversation
transaction
payment
```

Never expose internal risk scores or fraud-rule identifiers to normal users.

Frontend uses neutral states such as:

```text
Action requise
Vérification supplémentaire nécessaire
En cours d'examen
Fonction temporairement indisponible
```

---

# 42. Monetization

Monetization must be centralized.

Core capabilities may include:

```text
plans
subscriptions
entitlements
listing limits
commissions

Urgent
Search Bump
Featured / À la une
```

Pricing must ultimately come from the backend/admin configuration.

Frontend demo adapters should simulate the same contracts.

---

# 43. Urgent

Use one consistent treatment for:

```text
Urgent
```

Do not create independent styles on each page.

Support:

```text
active
scheduled
expiring
expired
```

Do not rely only on a stale boolean if an end date exists.

---

# 44. Search bump

User-facing French terminology should generally be:

```text
Remonter l'annonce
```

Do not overwrite or misrepresent original publication history.

Keep concepts separate:

```text
createdAt
sortDate
```

Where appropriate, display:

```text
Remontée aujourd'hui
```

not falsely:

```text
Publiée aujourd'hui
```

for an old listing.

---

# 45. Featured placement

Use one canonical public terminology such as:

```text
À la une
```

Avoid random mixing of:

```text
Featured
Top
Premium
Top Placement
À la une
```

Support market/category/location-specific placement through service contracts.

---

# 46. Paid placement transparency

Paid prominence should be identifiable and non-deceptive.

Do not use dark patterns:

* fake countdowns;
* false scarcity;
* preselected paid purchases;
* misleading performance claims;
* hidden prices;
* accidental subscriptions.

Do not promise specific uplift without validated data.

---

# 47. Subscription entitlements

Do not scatter:

```ts
if (plan === "gold") ...
```

through UI.

Use centralized entitlements such as:

```text
maxActiveListings
featuredCredits
bumpCredits
storeEnabled
analyticsLevel
teamMembers
bulkPublish
```

---

# 48. Particulier vs Professionnel

The platform must clearly distinguish:

```text
Particulier
Professionnel
```

without duplicating the entire application.

Differences should emerge where relevant:

* onboarding
* publication limits
* organization/business data
* store
* team
* billing
* analytics
* KYB
* subscriptions
* bulk tools

---

# 49. Professional organizations

Do not assume:

```text
one user = one professional business
```

Architecture should support:

```text
Organization
   ├── Owner
   ├── Admin
   ├── Manager
   ├── Seller
   └── Support
```

Frontend demo capabilities should reflect organization membership and permissions.

---

# 50. Seller workspaces

Particulier workspace may include:

```text
overview
listings
favorites
messages
purchases
sales
orders
payments
promotions
reviews
verification
settings
```

Pro workspace may include:

```text
dashboard
listings
bulk actions
store
orders
messages
analytics
team
subscriptions
billing
invoices
promotions
KYB
business profile
settings
```

Do not expose irrelevant Pro complexity to Particuliers.

---

# 51. Admin

Admin must be domain-oriented, not just raw table editing.

Important areas may include:

```text
users
professional sellers
listings
moderation
reports
markets
taxonomy
monetization
subscriptions
promotions
orders
payments
refunds
KYC/KYB
fraud
notifications
analytics
configuration
```

Admin capabilities must remain explicit.

---

# 52. Frontend design system

Use the existing Shongre design system before inventing new treatments.

Prefer existing primitives such as:

```text
Button
ActionLink
BackLink
IconButton
Badge
Notice
FormField
Modal
Sheet
StatePanel
Skeleton
Tabs
Tooltip
Popover
Dropdown
```

where they exist.

Do not create duplicates unnecessarily.

---

# 53. Design tokens

UI values should derive from centralized tokens for:

```text
colors
typography
spacing
radius
border
shadow
motion
breakpoints
z-index
icon sizes
component sizing
```

Avoid arbitrary repeated values where a token exists.

Do not scatter hardcoded colors and radii throughout CSS.

If the current project has a canonical design-token entrypoint, use it consistently.

---

# 54. Component variants

Add a component variant only when there is a genuine recurring use case.

Avoid one-off variants for one screen.

Prefer composable APIs.

Example listing card variants should remain limited to genuinely useful forms such as:

```text
grid
list
compact
```

rather than dozens of nearly identical cards.

---

# 55. No oversized UI

Audit all screens for oversized:

* typography
* buttons
* inputs
* cards
* banners
* radius
* icons
* whitespace
* modals

especially on:

```text
mobile
tablet
desktop
```

Components should feel polished and proportional on every screen.

---

# 56. Responsive breakpoints

Validate representative layouts around at least:

```text
320
375
390
430
768
1024
1280
1440+
```

Do not merely shrink desktop UI.

Use appropriate responsive patterns.

Example:

```text
desktop filter sidebar
        ↓
mobile filter sheet
```

---

# 57. Cross-platform UI

Ensure consistent quality across:

```text
Chrome
Firefox
Safari/WebKit
macOS
Windows
iOS-style viewport
Android-style viewport
```

Avoid assumptions based on one operating system's font rendering.

---

# 58. Accessibility

Target **WCAG 2.2 AA**.

Check:

* semantic landmarks
* heading hierarchy
* labels
* descriptions
* field errors
* keyboard navigation
* focus visibility
* focus traps
* focus restoration
* modals
* menus
* tabs
* carousels
* tables
* contrast
* reduced motion
* screen-reader announcements

Never use color as the only status indicator.

Every icon-only interactive control needs an accessible name.

---

# 59. Motion

Use motion only when it improves interaction.

Appropriate uses include:

```text
modal
sheet
dropdown
toast
favorite
filter transitions
```

Avoid excessive decorative animation.

Respect:

```css
prefers-reduced-motion
```

---

# 60. Header

Header should be coherent, compact, and responsive.

Potential elements:

```text
logo
search
categories
market/location
publish
messages
favorites
notifications
account
language
```

Avoid duplicated search experiences.

Do not let mobile header consume excessive viewport height.

---

# 61. Footer

Keep footer useful and relatively compact.

Possible content:

```text
help
safety
Pro
pricing
legal
privacy
cookies
apps
social
language
market
```

Avoid enormous sitemap-style footers unless clearly justified.

## "Gestion des cookies" must change something

The footer entry opens the real preference panel (`useConsent().openPreferences`),
not a policy page. It used to link to `/cookies`, which rendered the privacy
policy — a page that explains the cookies without letting anyone change them.
Withdrawing consent has to be as easy as giving it.

---

# 61b. Cookie consent

Consent lives in `src/domains/consent/`, is exposed by `ConsentProvider`, and is
rendered once by `CookieConsent` in the app shell.

Non-negotiable properties, each of them a legal requirement rather than a design
preference:

* **Opt-in.** Optional categories default to `false`. "Not asked yet" and
  "refused" must be indistinguishable downstream, or the gap between them becomes
  a tracking window.
* **Refusing is a first-layer button** with the same weight as accepting. An
  "Accept / Settings" pair is the pattern the CNIL sanctions.
* **No dismiss affordance** — no cross, no Escape, no click-away. Dismissing
  without choosing would have to be read as consent, and silence is not consent.
* **Reopening never re-consents.** The panel opens pre-filled with what is
  currently permitted.
* **Consent expires** (`CONSENT_LIFETIME_DAYS`) and a `CONSENT_VERSION` bump
  re-prompts everyone, because consent is given for a stated purpose.

The banner is a `role="region"` landmark, not a `role="dialog"`: it has no focus
trap and no Escape handler, and the dialog role would promise assistive
technology both.

Nothing in the product reads a tracker today, and the gate is deliberately built
first. `hasConsent(category)` is what any future analytics or advertising
integration has to pass — wiring it afterwards ships a period where data is
collected without a legal basis.

---

# 62. Mobile navigation

Mobile primary navigation should remain simple and reachable.

A structure such as:

```text
Accueil
Publier
Annonces
Messages
Compte
```

may be used if consistent with existing product behavior.

Ensure mobile bottom navigation does not cover:

* forms
* checkout controls
* message composer
* modal content

Respect safe areas.

## Clearance is measured from the raised publish button, not the bar

The publish control is offset above the bar, so the navigation paints roughly
20px outside the `<nav>` box. Anything that reserves space for the navigation —
page padding, pinned action bars, the toast stack — must clear that overhang too,
or it reserves a band the navigation still covers.

Three tokens carry it:

```text
--mobile-nav-h          the bar itself
--mobile-nav-fab-rise   how far the publish button sits above the bar
--mobile-nav-total-h    what anything pinned above or laid out before must clear
```

`MobileBottomNav` offsets the button from `--mobile-nav-fab-rise` rather than a
literal value, so the button and the clearance cannot drift apart.

This is invisible to the overflow and axe suites — nothing overflows and nothing
is hidden, the disc simply paints over what is beneath it and swallows the tap.
`e2e/bottom-nav-clearance.spec.ts` measures it instead.

---

# 63. Search

Search is a primary Shongre product surface.

Support frontend contracts for:

```text
query
market
category
subcategory
dynamic attributes
price
condition
seller type
location
radius
delivery
payment
sort
pagination
```

Search state should use URL parameters where appropriate.

---

# 64. Search ranking

Frontend must not implement authoritative marketplace ranking.

Do not manually reorder production-like results to simulate:

* Featured
* Urgent
* Bumps

outside the adapter layer.

Future backend owns ranking.

Demo SearchService may simulate representative ranking.

---

# 65. Pagination

Design components against scalable pagination.

Do not assume all listings exist in memory.

Support backend-shaped responses such as:

```ts
{
  items,
  pageInfo: {
    hasNextPage,
    nextCursor
  }
}
```

Avoid duplicates when loading additional pages.

---

# 66. Listing cards

Use one coherent listing-card system.

Standardize:

```text
image
favorite
status/premium badges
title
price
essential attributes
location
publication/bump date
seller/trust
delivery/payment indication
```

Avoid visual overload.

---

# 67. Listing details

Listing detail should support relevant:

```text
media gallery
title
price
characteristics
dynamic attributes
description
location
seller
store
trust
payment
delivery
pickup
messaging
reservation
purchase
report
safety
similar listings
```

Owner view should adapt to seller management needs.

---

# 68. Favorites

Favorites must handle:

```text
favorite
unfavorite
guest
login continuation
favorites page
optimistic UI
rollback
```

Do not leave dead favorite actions for unauthenticated users.

## Favorites belong to an account

Store them per user, never in one shared list. A single shared list is not
visibly broken — the count is consistent and the page renders — it simply shows
one account the other's saved listings, and makes seeded demo state drift as soon
as anyone taps a heart.

A signed-out visitor saves into a `guest` bucket, and signing in merges that
bucket into the account (union, then clear the guest bucket — leaving it hands
the next signed-out visitor on the device the previous one's saves).

Anything holding the set in React state must reload it when the signed-in account
changes, not only on mount, or it outlives the user it belongs to.

---

# 69. Messaging

Messaging should support:

```text
conversation list
conversation detail
send
receive
attachments
read state
blocked state
report
loading
empty
error
retry
```

Demo mode must simulate messaging without Supabase Realtime.

Prepare future realtime through an abstraction, not direct component subscriptions.

---

# 70. Notifications

Use one centralized notification system.

Support:

```text
notification center
unread count
mark read
mark all read
deep links
preferences
```

Do not create separate notification mechanisms per feature.

---

# 71. Booking / local pickup

Support coherent user journeys for:

```text
request
accept
schedule
payment
handover
confirmation
cancellation
dispute
```

Current frontend uses deterministic demo services.

---

# 72. Payment UI

No real payment integration from frontend now.

Use `DemoPaymentService`.

Support deterministic states such as:

```text
success
pending
failed
requires_action
cancelled
refunded
```

Do not claim a real payment occurred in clearly identified demo/testing contexts.

---

# 73. SEO

Public marketplace content should be SEO-ready where the current framework supports it.

Implement correctly:

```text
title
description
canonical
robots
Open Graph
social metadata
structured data
sitemap architecture
```

Avoid duplicate canonical or metadata tags.

## One hook owns the document head

Pages declare metadata with `usePageMeta({ title, description, canonicalPath, … })`
from `src/hooks/usePageMeta.ts`. `src/services/seo.service.ts` applies it.

It **updates** the tags `index.html` already ships rather than appending its own.
That is the whole point: a page that adds a second `<meta name="description">`
next to the static one leaves the document with two, and which one a crawler
believes is not up to us. Never write `document.title` or inject a `<script
type="application/ld+json">` from a component — two pages did, so the parts that
existed at all existed twice, in two shapes, while the other ~25 public routes
described themselves as the site root.

## Canonicals collapse the query string

Search, filters, sort, view mode and pagination all live in the query string, so
every permutation would declare itself a distinct canonical page — thousands of
near-duplicates competing with the URL that should rank. `resolveCanonical`
drops the query by default; a route that genuinely needs a parameter passes it
in `canonicalPath` explicitly.

Free-text search results are `noIndex`: arbitrary queries generate unbounded thin
pages, which is the classic classifieds index-bloat trap. Category pages are the
indexable form, and `/categorie/:slug` is their canonical URL.

---

# 74. Listing structured data

Use appropriate structured metadata only when accurate.

Potential fields:

```text
name
description
image
price
currency
availability
seller
location
```

Do not fabricate ratings, availability, or other structured information.

---

# 75. Internationalization

French is the first/default language.

Architecture should be ready for additional locales such as:

```text
fr-FR
fr-BE
nl-BE
de-DE
en-GB
```

All visible copy should use the centralized localization system where one exists.

Do not concatenate translated strings.

---


## The translation layer

Messages live in `src/i18n/`. `messages.fr.ts` is the source catalogue and
`MessageKey` is derived from it, so a mistyped key is a compile error rather than
a string that renders as itself. Components call `const { t } = useTranslation()`.

Rules that are not negotiable:

* **Never pluralise by hand.** `t('common.listingCount', { count })` resolves
  through `Intl.PluralRules`. French puts 0 in the singular ("0 annonce") and
  English puts it in the plural ("0 listings"); the existing `plural()` helper in
  `utilities/formatters.ts` hard-codes `>= 2`, which is the French rule and will
  be wrong in every other language.
* **A missing translation falls back to French, never to the raw key.** An
  incomplete locale degrades to readable text instead of `nav.sell` appearing in
  the navigation.
* **Locale is not owned here.** `MarketLocationProvider` holds it, persists it
  and syncs `<html lang>`; `I18nProvider` reads it. Do not add a second source of
  truth for what language the page is in.

## A language ships when the interface is actually translated

Two independent conditions, because they measure different things:

```text
SHIPPED_LOCALES          someone asserts the migration is done
catalogueCoverage(code)  the catalogue backs that claim
```

Catalogue coverage alone is not enough, and this is the trap to avoid: it only
sees keys that already exist, so it reported 100% for English while every page
body was still hardcoded French — which rendered "Home / Search / Account" in the
tab bar underneath an entirely French homepage. `npm run check:i18n` counts the
user-visible French strings still outside the catalogue; that number, not
catalogue coverage, is what stands between a locale and `SHIPPED_LOCALES`.

The check also fails if an already-migrated surface picks up hardcoded copy
again, which is how partial translations quietly regress.

## Two kinds of French, and only one belongs in the catalogue

**UI chrome** — labels, buttons, headings, empty states, accessibility names —
lives in `messages.*.ts` and is reached with `t()`.

**Domain data** — taxonomy category names, permission descriptions, condition
schemes, collection copy, provider capability labels, market defaults — does not.
It sits in `src/domains/**` and `src/security/**` as seed data for content that
§54 says administrators are expected to manage. Translating it into the UI
catalogue would freeze admin-managed content into the frontend bundle and put two
sources of truth in the product. It needs per-locale fields on the records
themselves, served by the backend — a data-model change, not a `t()` call.

`npm run check:i18n` counts both, because both block a second language. Keep the
distinction in mind when reading the number: the `.tsx` figure is UI migration
work, the `.ts` figure is a backend content question.

# 76. Locale formatting

Centralize:

```text
currency
numbers
dates
relative dates
distance
units
phone numbers
```

Use locale-aware APIs.

Do not manually append currency symbols throughout components.

---

# 77. Performance

Performance is a feature.

Audit:

```text
bundle size
client JavaScript
render frequency
images
fonts
lists
search
maps
charts
modals
admin
KYC
payment UI
```

Use measurement rather than assumptions.

---

# 78. Images

Marketplace images must be optimized.

Use:

```text
responsive sizes
correct dimensions
stable aspect ratios
lazy loading
priority for true LCP images
modern formats when available
```

Do not load large originals for small listing cards.

---

# 79. Fonts

Avoid unnecessary font weights/files.

Optimize loading.

Ensure typography remains consistent across macOS and Windows.

Never share font files outside the project tooling when not permitted by licensing.

---

# 80. Web Vitals

Measure and improve:

```text
LCP
INP
CLS
TTFB
```

Prioritize:

```text
homepage
search
listing detail
publication
workspace
```

Target strong Core Web Vitals without compromising product correctness.

---

# 81. State management

Keep state local when possible.

Use global state only for genuinely global concerns such as:

```text
session
market
locale
demo scenario
global notifications
```

Do not create one giant store for the entire application.

---

# 82. URL-driven state

Use the URL for state that users should be able to:

* refresh;
* share;
* bookmark;
* navigate with back/forward.

Typical examples:

```text
search query
filters
sort
pagination
category
location
```

---

# 83. Forms

Standardize form UX:

```text
label
help
required
validation
pending
server/demo error
success
```

Do not rely only on client validation.

Future backend validation remains authoritative.

---

# 84. Optimistic UI

Optimistic UI is appropriate for safe reversible operations such as:

```text
favorite
mark notification read
```

Do not optimistically claim success for:

```text
payments
KYC
refunds
listing moderation
promotion activation
```

without adapter confirmation.

---

# 85. Loading states

Every asynchronous/data-driven surface should support:

```text
loading
success
empty
error
```

Use consistent skeletons where appropriate.

Avoid large layout shifts.

---

# 86. Empty states

Provide useful empty states for:

```text
search
listings
favorites
messages
orders
notifications
reviews
promotions
```

Do not render empty section headings.

---

# 87. Errors

Normalize application errors.

Conceptual codes include:

```text
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
NETWORK_ERROR
PAYMENT_REQUIRED
LISTING_NOT_ELIGIBLE
```

Never display raw future:

```text
Supabase errors
PostgreSQL errors
Stripe errors
stack traces
```

to users.

---

# 88. Error boundaries

One secondary widget failure should not unnecessarily crash an entire page.

Examples:

```text
recommendations unavailable
analytics unavailable
```

should degrade gracefully.

---

# 89. Security

Treat all frontend input as untrusted.

Audit:

```text
XSS
unsafe HTML
open redirects
token leakage
PII in URLs
PII in logs
PII in analytics
unsafe localStorage
account enumeration
```

The frontend is never an authorization boundary.

---

# 90. No frontend ownership of business rules

Frontend must not authoritatively calculate:

```text
payment price
commissions
subscription eligibility
listing limits
promotion eligibility
KYC requirements
fraud score
market eligibility
listing ranking
```

Current demo adapters simulate backend-shaped results.

Future backend owns these rules.

---

# 91. Backend API

When backend API integration is eventually activated, use a stable versioned API such as:

```text
/api/v1/
```

The frontend API client should centralize:

```text
base URL
authentication/session
locale
market
request IDs
error normalization
```

Do not manually construct these concerns in every feature.

---

# 92. API errors

Backend should return stable application error codes.

Do not leak internal database details to API clients.

Frontend should map application errors into localized UX.

---

# 93. Backend input validation

All external backend inputs must be validated server-side.

Frontend validation is for UX only.

Use the repository's existing validation approach consistently.

---

# 94. Backend authorization

Authentication is not authorization.

Sensitive backend actions must explicitly check capabilities/ownership.

Examples:

```text
publish listing
manage organization
buy promotion
refund
moderate
manage market
manage monetization
```

RLS can provide a second security boundary where appropriate.

---

# 95. Webhooks

All webhooks belong in `backend/`.

Webhook handlers must:

```text
verify signature
deduplicate
persist event ID where appropriate
process idempotently
update state
queue secondary actions
```

Never trust webhook payloads without provider verification.

---

# 96. Idempotency

Critical backend operations must support idempotency/concurrency safety where relevant:

```text
order creation
payment creation
promotion purchase
refund
listing publication
reservation
webhooks
```

Prevent duplicate payments and duplicate domain objects.

---

# 97. Background jobs

Slow or secondary operations should move to backend queues/workers.

Examples:

```text
email
push
image processing
search indexing
saved-search alerts
fraud evaluation
moderation
analytics
AI classification
promotion expiration
listing expiration
```

Do not perform these via frontend timers.

---

# 98. Scheduled jobs

Lifecycle work belongs to backend cron/jobs.

Examples:

```text
expire listings
expire promotions
expire reservations
subscription checks
saved-search alerts
cleanup uploads
analytics aggregation
verification reminders
```

Jobs must be idempotent.

---

# 99. Search backend

Start with PostgreSQL capabilities where appropriate:

```text
Full Text Search
pg_trgm
PostGIS
GIN/GiST
structured filters
```

Keep a `SearchService` boundary so a future dedicated search engine can be introduced without changing frontend contracts.

Do not introduce external search prematurely.

---

# 100. Geo search

Use PostGIS/backend geospatial querying for:

```text
nearby
radius
city
postal code
region
market
```

Do not calculate authoritative distance/radius filtering in frontend JavaScript.

Demo mode may simulate it.

---

# 101. Backend pagination

High-volume queries must be bounded.

Prefer cursor/keyset pagination where deep offset pagination becomes expensive.

Frontend should already consume pagination through backend-shaped contracts.

---

# 102. Database performance

Backend database changes should consider real query patterns.

Use appropriate:

```text
indexes
partial indexes
GIN
GiST
BRIN
```

only where justified.

Use:

```text
EXPLAIN
EXPLAIN ANALYZE
pg_stat_statements
```

for important production performance investigations.

Do not blindly index every column.

---

# 103. N+1 queries

Avoid query patterns such as:

```text
listing
→ seller
→ image
→ category
→ favorite
```

executed independently for every listing card.

Use appropriate joins/batching/read models.

Frontend search pages should not need dozens of calls per card.

---

# 104. API projections

Different UI contexts may need different API representations.

Examples:

```text
ListingCardView
ListingDetailView
SellerWorkspaceListing
AdminListingView
```

Do not send every database field everywhere.

---

# 105. Realtime

Use realtime only where it materially improves UX.

Good candidates:

```text
messages
notification count
selected order status changes
```

Do not subscribe clients broadly to high-volume tables.

Current demo frontend must not require realtime.

---

# 106. Storage

Supabase Storage administration belongs in backend.

Separate public and private content.

Potential categories:

```text
listing-media
avatars
store-assets
message-attachments
documents-private
verification-private
```

Never put sensitive identity documents into public buckets.

---

# 107. Privacy

Follow data-minimization principles.

Never put sensitive KYC/payment information into:

```text
localStorage
URLs
analytics
console logs
public storage
```

Only collect/store what is required by the product/backend policy.

---

# 108. Audit logging

Sensitive backend/admin actions should be auditable.

Examples:

```text
pricing changes
market activation
moderator suspension
refund
manual account restriction
verification override where permitted
```

Audit payloads must not contain secrets or raw identity documents.

---

# 109. Analytics

Frontend analytics must use centralized event definitions.

Possible events:

```text
search_performed
listing_viewed
listing_favorited
publication_started
publication_completed
message_started
checkout_started
promotion_selected
verification_started
```

Do not transmit sensitive information.

Backend analytics should not slow transactional paths unnecessarily.

---

# 110. Demo analytics

Demo mode may log events locally or through a dedicated demo adapter.

It must not send unintended production analytics when local/demo testing is expected to be isolated.

---

# 111. Testing philosophy

Do not consider a feature complete because it renders once.

Test:

```text
happy path
loading
empty
error
permission differences
mobile
desktop
keyboard
demo personas
edge states
```

---

# 112. Frontend tests

Frontend tests must live under:

```text
frontend/
```

Use:

```text
frontend/tests/
frontend/e2e/
```

or colocated test files according to the existing convention.

Frontend tests must not require the backend.

---

# 113. Frontend unit tests

Prioritize:

```text
formatters
hooks
state normalization
capability mapping
error mapping
demo adapters
date/money formatting
```

---

# 114. Component tests

Prioritize reusable components such as:

```text
Button
FormField
Modal
ListingCard
FilterPanel
Pagination
StatePanel
PromotionOfferCard
VerificationCard
```

---

# 115. E2E journeys

At minimum preserve/test major flows.

### Guest

```text
Home
→ Search
→ Listing
→ Favorite
→ Authentication
```

### Particulier seller

```text
Demo login
→ Publish
→ Verification
→ Preview
→ Publish
→ Boost
→ Demo payment
→ Promotion active
```

### Buyer

```text
Search
→ Filter
→ Listing
→ Favorite
→ Message
→ Reserve / Buy
```

### Pro

```text
Pro login
→ Company verification
→ Store
→ Multi-market publication
→ Promotion
```

### Admin

```text
Admin login
→ Users
→ Moderation
→ Markets
→ Taxonomy
→ Monetization
→ KYC
```

---

# 116. Backend tests

Backend tests must live in:

```text
backend/
```

Cover where applicable:

```text
domain rules
API
database
RLS
permissions
payments
webhooks
monetization
KYC/KYB
fraud
concurrency
performance
```

---

# 117. RLS tests

Test at minimum:

```text
anonymous
owner
other user
organization member
organization admin
moderator
admin
```

where relevant.

Do not assume RLS is correct because a query succeeds for an admin.

---

# 118. Concurrency

Protect against races such as:

```text
two buyers reserve the same listing
duplicate webhook
duplicate payment
duplicate promotion purchase
simultaneous updates
```

Use:

```text
transactions
constraints
locking
idempotency
optimistic concurrency
```

where appropriate.

---

# 119. CI

Frontend CI should validate from:

```text
frontend/
```

At minimum use repository-appropriate:

```text
format
lint
typecheck
unit tests
component/integration tests
E2E
production build
```

Backend CI should validate from:

```text
backend/
```

including:

```text
format
lint
typecheck
unit tests
integration tests
database tests
RLS tests
migration validation
build
```

---

# 120. Design-system CI

Preserve/improve existing automated checks for:

```text
hardcoded colors
unsupported spacing
unsupported radius
typography inconsistency
duplicate primitive use
```

Do not create unnecessarily noisy rules.

---

# 121. Dependency cleanup

Before removing packages:

1. search imports;
2. inspect dynamic imports;
3. inspect scripts;
4. inspect test usage;
5. verify build.

Remove:

```text
unused dependencies
duplicate libraries
obsolete experiments
```

but do not break working functionality for cosmetic cleanup.

---

# 122. Dead-code cleanup

Do not leave indefinitely:

```text
OldComponent
NewComponent
ComponentV2
ComponentFinal
```

Once the replacement is proven:

* migrate all consumers;
* run tests;
* remove obsolete versions.

The same applies to:

* CSS
* hooks
* routes
* mocks
* APIs
* schemas
* feature flags

---

# 123. Documentation policy

Keep documentation useful and maintained.

Frontend documentation belongs under:

```text
frontend/docs/
```

Backend documentation belongs under:

```text
backend/docs/
```

Avoid generating numerous temporary:

```text
audit.md
analysis.md
findings.md
todo.md
```

files unless explicitly requested.

Prefer updating canonical documentation.

---

# 124. Comments

Comments should explain **why**, not restate **what** obvious code does.

Do not leave large blocks of stale commentary.

Remove TODOs when implemented.

When a TODO remains intentionally, make it specific and actionable.

---

# 125. TypeScript

Use strict TypeScript.

Avoid:

```ts
any
as unknown as
```

unless there is a specific, documented reason.

Validate untrusted runtime data despite compile-time types.

Prefer narrow types and discriminated unions for stateful workflows.

---

# 126. Naming

Use consistent domain language.

Prefer canonical terms:

```text
listing
seller
organization
store
market
promotion
subscription
entitlement
order
payment
verification
```

Avoid arbitrary synonyms when they represent the same concept.

Example:

Do not mix:

```text
ad
advert
classified
listing
```

in internal code if `listing` is the canonical domain term.

French UI copy can still use appropriate customer-facing language.

---

# 127. User-facing language

French is the default product language.

Use natural French marketplace terminology.

Prefer sentence case.

Avoid internal/backend terminology in user-facing UI.

Examples:

Use:

```text
Remonter l'annonce
```

not:

```text
Search bump
```

Use:

```text
À la une
```

not inconsistent combinations of:

```text
Featured
Top Placement
Premium
```

---

# 128. No fake product claims

Do not invent:

```text
"3× faster"
"90% more views"
"most popular"
"only 2 spots left"
```

unless supported by real data/configuration.

Demo fixtures must not accidentally imply that fabricated performance claims are verified platform statistics.

---

# 129. No dark patterns

Do not use:

* preselected paid options;
* hidden charges;
* fake urgency;
* forced subscription;
* misleading cancellation UX;
* deceptive premium placement;
* inaccessible opt-outs.

Shongre monetization should be transparent and trust-building.

---

# 130. Mobile quality

Never treat mobile as an afterthought.

Audit every major feature on small screens.

Pay particular attention to:

```text
header
navigation
filters
listing cards
publication
chat composer
checkout
KYC
promotion purchase
workspace
admin
```

Avoid horizontal page overflow.

---

# 131. Desktop quality

Desktop interfaces should use available space efficiently without becoming oversized.

Avoid:

* huge cards
* huge font sizes
* excessive padding
* stretched controls
* overly wide text blocks

Use centered content containers and consistent side gutters.

---

# 132. Loading performance

Avoid unnecessary waterfalls.

Parallelize independent data operations.

Lazy-load heavy feature code such as:

```text
maps
charts
rich editors
KYC provider UI
payment provider UI
admin analytics
```

when appropriate.

Current demo mode should use the same component-loading architecture.

---

# 133. Future AI

AI functionality must remain optional and degradable.

Potential future capabilities:

```text
semantic search
recommendations
fraud scoring
category prediction
price estimation
image moderation
description assistance
```

Core:

```text
publication
search
messaging
payment
```

must not become unusable solely because an AI service is unavailable unless that AI is explicitly a mandatory safety control.

---

# 134. No premature microservices

Do not split Shongre into many services prematurely.

Start with:

```text
frontend/
backend/
Supabase
```

with strong internal module boundaries.

Extract dedicated services only when real operational/performance needs justify them.

---

# 135. No premature frontend complexity

Do not introduce:

```text
micro-frontends
multiple overlapping state libraries
complex event buses
dozens of global contexts
generic abstraction frameworks
```

without clear measurable benefit.

Favor a system understandable by a small engineering team.

---

# 136. Root-level files

Root-level files should primarily coordinate the monorepo.

Examples that may remain at root:

```text
AGENTS.md
README.md
package workspace configuration
Makefile
CI configuration
editor configuration
.gitignore
```

Application implementation should live in `frontend/` or `backend/`.

---

# 137. Environment separation

Support clear environments:

```text
local
test
staging
production
```

Frontend demo mode is independent of backend environment.

Never silently connect tests/demo to production infrastructure.

---

# 138. Environment validation

Applications should fail clearly when required configuration is missing.

Never silently change from:

```text
production
```

to:

```text
demo
```

or vice versa.

Explicit mode selection only.

---

# 139. README requirements

The root README should explain the high-level repository layout.

`frontend/README.md` should explain:

* frontend architecture;
* demo mode;
* service contracts;
* adapters;
* testing;
* future backend connection.

`backend/README.md` should explain:

* backend architecture;
* Supabase;
* migrations;
* local development;
* testing;
* environment configuration.

Do not duplicate extensive content unnecessarily.

---

# 140. Frontend completion definition

A frontend change is not complete until, where relevant:

* existing working behavior remains intact;
* the feature works in demo mode;
* no backend is required;
* loading state exists;
* empty state exists;
* error state exists;
* mobile works;
* desktop works;
* accessibility is checked;
* TypeScript passes;
* tests pass;
* production build passes.

---

# 141. Backend completion definition

A backend change is not complete until, where relevant:

* migration exists;
* constraints are correct;
* RLS is correct;
* authorization is correct;
* input validation exists;
* concurrency/idempotency is considered;
* tests exist;
* no secrets leak;
* performance implications are considered;
* integration contracts are documented/generated.

---

# 142. Do not stop at audits

When asked to:

```text
analyze
improve
implement
polish
harmonize
make production-ready
```

do not stop after creating a report.

Perform the implementation unless the user explicitly asks only for analysis.

Preferred workflow:

```text
inspect
→ identify
→ implement
→ test
→ fix
→ clean
→ summarize
```

---

# 143. Avoid unnecessary clarification

When the repository provides enough context, inspect the code and make the best reasonable engineering decision.

Do not repeatedly ask the user questions that can be resolved by:

* repository inspection;
* current design patterns;
* existing tests;
* current project conventions;
* this `AGENTS.md`.

For ambiguous but non-critical details, preserve existing behavior.

---

# 144. Preserve user data and migrations

Never casually destroy existing data.

When consolidating duplicate tables or schemas:

1. understand both models;
2. map data;
3. create safe migration;
4. backfill;
5. validate;
6. switch consumers;
7. remove obsolete model only after verification.

---

# 145. No hidden regressions

Before finishing work, inspect the full diff for:

```text
dead imports
orphaned components
broken routes
missing translations
missing demo fixtures
CSS regressions
new console errors
security regressions
```

Fix issues introduced by the change.

---

# 146. Verification commands

Use the repository's actual commands.

Do not invent command names if existing ones are available.

At minimum run applicable equivalents of:

```text
format
lint
typecheck
unit tests
integration tests
E2E
production build
```

For database/backend work also run applicable:

```text
migration validation
database tests
RLS tests
```

---

# 147. Do not declare success with failing validation

If a test/build fails because of the change, fix it.

If a pre-existing unrelated failure prevents full validation:

* verify that it is pre-existing;
* document it concisely;
* still run all other applicable checks.

Do not hide failures.

---

# 148. Final architecture objective

The project should evolve toward:

```text
                           SHONGRE

                 ┌────────────────────┐
                 │     frontend/      │
                 │                    │
                 │ UI                 │
                 │ UX                 │
                 │ Design system      │
                 │ Service contracts  │
                 │ Demo adapters      │
                 └─────────┬──────────┘
                           │
                     CURRENTLY:
                      no backend
                           │
                FUTURE typed HTTP API
                           │
                 ┌─────────▼──────────┐
                 │      backend/      │
                 │                    │
                 │ API                │
                 │ Domain services    │
                 │ Authorization      │
                 │ Integrations       │
                 │ Workers            │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │      Supabase      │
                 │                    │
                 │ PostgreSQL         │
                 │ Auth               │
                 │ Storage            │
                 │ Realtime           │
                 │ RLS                │
                 │ Queues / Cron      │
                 └────────────────────┘
```

---

# 149. Current strategic priority

Until explicitly changed:

## Frontend

```text
COMPLETE
POLISHED
FULLY TESTABLE
DEMO-DRIVEN
BACKEND-READY
BUT NOT CONNECTED
```

## Backend

```text
MODERN
MODULAR
SUPABASE-BASED
SECURE
SCALABLE
ALL UNDER backend/
```

Do not prematurely couple the two while both architectures are still being completed.

---

# 150. Ultimate engineering objective

Every modification should move Shongre toward a platform that is:

* coherent
* maintainable
* secure
* fast
* scalable
* accessible
* market-aware
* privacy-conscious
* testable
* operationally understandable
* commercially flexible
* pleasant to use

The platform should behave like **one integrated marketplace product**, not a collection of independently developed screens and features.

When in doubt, prefer:

> **reuse over duplication, explicit contracts over coupling, domain ownership over scattered logic, configuration over hardcoding, measurable performance over assumptions, progressive UX over unnecessary friction, and simple scalable architecture over premature complexity.**

---

# 151. API authentication and authorization

The backend authenticates every request from a signed bearer token. There is no
ambient "current user" — identity is per-request state and must be threaded as
such.

## Where the pieces live

| Concern | Module |
| :--- | :--- |
| Password hashing (scrypt) | `backend/src/shared/auth/password.ts` |
| Token signing/verification (HS256) | `backend/src/shared/auth/tokens.ts` |
| Principal + ownership guards | `backend/src/shared/auth/principal.ts` |
| Role → permission matrix | `backend/src/shared/auth/rbac.ts` |
| Route access declarations | `backend/src/api/v1/router.ts` |
| Credential storage | `user_credentials` table, migration `00006` |

## Every route declares its access rule

`addRoute` takes the access rule as a required argument, so a route cannot be
registered without stating one. Adding a route without thinking about auth is a
type error, not a silent default.

```ts
this.addRoute('GET',  '/listings/:id', PUBLIC,                        handler);
this.addRoute('POST', '/messaging/send', permission('message.send'),  handler);
this.addRoute('GET',  '/admin/users',  permission('user.read'),       handler);
```

Use `PUBLIC` only for genuinely public marketplace surface (listings, taxonomy,
markets, public seller profiles) and for endpoints that cannot carry a session
token (login, register, Stripe webhooks).

## Never take identity from the client

The caller's identity comes from `ctx.principal`, never from a path parameter or
request body. This is the rule that keeps the IDOR class of bug out:

```ts
// WRONG — the caller chooses whose data to read or write
ordersService.getPurchases(params.userId);
messagingService.sendMessage(body);            // body.senderId
paymentsService.requestSellerPayout(body.sellerId, ...);

// RIGHT
ordersService.getPurchases(resolveOwnerId(principal, params.userId));
messagingService.sendMessage({ ...body, senderId: principal.userId });
paymentsService.requestSellerPayout(principal.userId, ...);
```

`resolveOwnerId` accepts the caller's own id or the literal `me`, and rejects
anything else unless an override permission is named explicitly. Routes that act
on a resource id (an order, a conversation, a notification) must load the
resource and check participation before acting on it.

Ownership failures answer **404, not 403**: confirming that a resource exists but
belongs to someone else is enough to enumerate users and orders.

## Writes must use an allowlist

`PUT /users/:id` passes the body through `sanitizeProfileUpdate`. Never pass a
request body straight into a repository update — a passthrough lets a caller set
their own `primaryRole`, `status` or `isIdentityVerified`. State that belongs to
admin, moderation or verification flows is never self-serviceable.

## Roles are not self-assignable

Registration may only claim the roles in `SELF_ASSIGNABLE_ROLES`. `switchRole`
may only move a session between roles the account actually holds, and re-issues
the token because the role is a signed claim.

## Secrets and configuration

`JWT_SECRET` is required in production; the server refuses to boot if it is
missing, under 32 characters, or still a placeholder. Demo credentials are never
seeded in production.

## Frontend data mode

`VITE_DATA_MODE` must be set explicitly to build. Demo mode's login accepts any
password of six or more characters for the seeded personas by design, so an
unconfigured production build is rejected in `vite.config.ts`.

## When adding a feature

1. Declare the route's access rule.
2. Derive identity from `ctx.principal`.
3. Check ownership on any resource addressed by id.
4. Allowlist the fields a write may touch.
5. Add a test that the wrong caller is refused — not only that the right one succeeds.
