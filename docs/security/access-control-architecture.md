# Shongre access-control architecture

Status: implemented for the current demo-first frontend and modular-monolith
backend. The frontend remains disconnected from the real backend, as required
by the repository architecture.

## A. Architecture discovered

Shongre already had useful building blocks: frontend permission helpers and
guards, backend per-route access declarations, per-request principals, explicit
ownership checks, JWT/session validation, RLS migrations, demo personas, and
separate demo/HTTP service adapters. The main weakness was not absence of
authorization, but multiple independent role matrices and several UI modules
that inferred authority directly from legacy role names.

The canonical dependency is now:

```text
shared access contract
  ├─ frontend authorization + route/navigation policy + demo personas
  ├─ backend principals + route guards + ownership/market checks
  └─ PostgreSQL capability registry + RLS helpers
```

The source-of-truth policy is
`packages/contracts/src/access-control.ts`. Frontend role metadata and backend
legacy helpers derive from it; they do not maintain separate grants.

## B. Problems found

- Frontend and backend role matrices drifted independently.
- `admin` and `super_admin` inherited customer, professional, moderation, and
  finance capabilities.
- Professional verticals were implemented by granting every vertical and then
  revoking the unrelated ones.
- Buyer and seller were treated as durable security identities despite being
  activities of the same individual account.
- Workspace navigation and route guards repeated unrelated capability strings.
- Staff was conflated with a third customer account type, and Staff landing
  pages loaded datasets before capability checks.
- The user table exposed an unrestricted demo impersonation action.
- Report resolution used one broad permission for dismissal, listing removal,
  and account banning.
- Status changes lacked actor/reason audit context.
- Public profile RLS exposed the base profile table rather than a safe
  projection.
- Historical `is_admin()` RLS policies made one label a broad direct-table
  bypass.
- Professional signup did not capture the business vertical.

## C. Changes implemented

- One deny-by-default capability registry and resolver shared by frontend and
  backend.
- Positive professional-vertical grants; no subtractive “grant all then
  revoke” persona construction.
- Separate customer account type, Staff membership status and role,
  professional vertical, account lifecycle, direct grants/revocations,
  entitlements, verification, ownership, organization scope, and market scope.
- One protected-route registry used by route guards and workspace navigation.
- Capability-scoped staff and customer layouts; unrelated links are removed,
  not disabled.
- A retained Staff membership replaces the entire customer-marketplace plane
  for that identity. Public customer surfaces, mobile customer authentication,
  direct grants, and direct-table access all fail closed for Staff.
- Professional signup asks for and transports the selected vertical through
  demo and future HTTP adapters.
- Demo-only persona switcher now covers customer, vertical, and staff boundary
  cases and remains unavailable in API mode.
- Staff overview and user administration load through existing service
  adapters and only request authorized datasets.
- Removed the duplicate user-table impersonation action.
- Backend principals reload current account state and effective capabilities
  per request instead of trusting role/capability claims in the token.
- Sensitive admin actions require exact capabilities and audited reasons.
- Migration `00023_canonical_access_control.sql` backfills dimensions, creates
  capability grants, replaces core RLS policies, restricts profile column
  updates, and publishes a privacy-safe profile view.
- Migration `00082_staff_capability_management.sql` adds the shared
  `staff.internal.access` gate and an optimistic, service-role-only capability
  override transaction with atomic audit and session revocation.
- Migration `00083_staff_marketplace_separation.sql` removes customer grants
  from Staff, retires Staff-owned inventory, prevents future listing ownership
  and grant bridges, and adds restrictive RLS across customer marketplace and
  customer-business state.

## D. Canonical account model

| Dimension         | Values                                                             | Meaning                               |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------- |
| Account type      | `individual`, `professional`                                       | Stable customer identity type         |
| Staff status      | `none`, `active`, `suspended`, `revoked`                           | Independently managed employee access |
| Staff role        | explicit least-privilege role                                      | Capabilities added only while active  |
| Lifecycle         | `pending`, `active`, `restricted`, `suspended`, `banned`, `closed` | Whether the account may act           |
| Legacy aliases    | buyer/seller/pro/staff role labels                                 | Persistence compatibility only        |
| Direct policy     | `customPermissions`, `revokedPermissions`                          | Explicit, audited exceptions          |
| Commercial access | plan entitlements                                                  | Never a staff or identity role        |
| Trust state       | email, phone, identity, business, payment, payout                  | Independent verification dimensions   |

An individual account receives both legitimate buying and selling journeys.
The UI may emphasize the current activity, but authorization does not create a
second identity.

Lifecycle filtering runs after all grants and overrides. Restricted and
suspended accounts retain only the small safe set defined by the shared policy;
banned and closed accounts receive no authenticated capabilities.

## E. Professional vertical model

All professionals receive the common customer communication, account-safety,
and subscription foundation. Generic inventory/storefront capabilities belong
only to the `generic` vertical; each specialized vertical receives its own
positive extension instead:

| Vertical      | Additional capability family                                   |
| ------------- | -------------------------------------------------------------- |
| `generic`     | listings, seller orders, bulk inventory, storefront, analytics |
| `real_estate` | property, agency, lead, and property-import management         |
| `automotive`  | vehicle, dealer, lead, and vehicle-import management           |
| `education`   | course organization, offers, and lead management               |
| `employment`  | jobs, recruiter, application, and ATS-import management        |

Organization membership and branch scope remain resource-level decisions; a
vertical grant alone never grants access to another organization.

## F. Staff role model

| Staff role      | Intended scope                                       | Explicit exclusions                              |
| --------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Support         | support cases, limited user/provider read            | moderation, refunds, configuration               |
| Moderator       | reports, listings, reviews                           | suspension, refunds, platform configuration      |
| Trust & Safety  | verification, restriction/suspension, reports, audit | listing removal, refunds, configuration          |
| Compliance      | verification, restrictions, audit                    | moderation, suspension, refunds                  |
| Finance         | transaction audit, refunds, commercial approval      | moderation, Staff configuration, credentials     |
| Operations      | provider health/read                                 | moderation, finance, Staff administration        |
| Commercial      | CRM and commercial-rule editing                      | moderation, finance, platform configuration      |
| Content manager | taxonomy and marketing content                       | listing promotion, users, finance, moderation    |
| Market manager  | market/vertical configuration in assigned markets    | finance and Staff administration                 |
| Admin           | platform configuration and staff administration      | moderation and refunds unless separately granted |
| Owner           | permission governance and provider credentials       | moderation and refunds unless separately granted |

Creating a Staff membership preserves the normalized Individual or
Professional account-family value for compatibility, but replaces that
identity's customer capability plane. Active Staff receive only the selected
employee role and approved internal overrides. Suspended and revoked Staff
receive neither customer nor employee capabilities and cannot establish a new
session. Every Staff role includes `staff.internal.access`; narrower
capabilities continue to gate each internal tool. Customer capabilities are
not displayed in a Staff override projection and cannot be directly granted to
Staff. Non-owner Staff operations are also constrained by assigned market
scope.

`admin` and `owner` receive `admin.permissions.manage`. Capability overrides
are separate from Staff membership changes: they use complete canonical grant
and revocation collections, an optimistic version, and a required reason.
Active Staff, MFA, recent authentication, self-management denial, owner
governance, atomic audit evidence, and target-session revocation remain
mandatory.

## G. Effective capability matrix

This is the domain-level projection of the complete code registry. `own` means
resource ownership or authorized organization membership is still required.

| Persona         | Public | Customer own | Pro core |   Vertical tools    | Support | Moderation | Verify/restrict | Refund |     Config      | Governance  |
| --------------- | :----: | :----------: | :------: | :-----------------: | :-----: | :--------: | :-------------: | :----: | :-------------: | :---------: |
| Guest           |   ✓    |      —       |    —     |          —          |    —    |     —      |        —        |   —    |        —        |      —      |
| Individual      |   ✓    |      ✓       |    —     | candidate/tutor own |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro generic     |   ✓    |      ✓       |    ✓     |          —          |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro real estate |   ✓    |      ✓       |    ✓     |        Immo         |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro automotive  |   ✓    |      ✓       |    ✓     |        Auto         |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro education   |   ✓    |      ✓       |    ✓     |    Education org    |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro employment  |   ✓    |      ✓       |    ✓     |      Recruiter      |    —    |     —      |        —        |   —    |        —        |      —      |
| Support         |   —    |      —       |    —     |          —          |    ✓    |     —      |        —        |   —    |        —        |      —      |
| Moderator       |   —    |      —       |    —     |          —          |    —    |     ✓      |        —        |   —    |        —        |      —      |
| Trust & Safety  |   —    |      —       |    —     |          —          |    —    |  reports   |        ✓        |   —    |        —        |      —      |
| Compliance      |   —    |      —       |    —     |          —          |    —    |     —      |        ✓        |   —    |        —        |      —      |
| Finance         |   —    |      —       |    —     |          —          |    —    |     —      |        —        |   ✓    |        —        |      —      |
| Operations      |   —    |      —       |    —     |    provider ops     |    —    |     —      |        —        |   —    |        —        |      —      |
| Commercial      |   —    |      —       |    —     |         CRM         |    —    |     —      |        —        |   —    | commercial only |      —      |
| Content manager |   —    |      —       |    —     | taxonomy/marketing  |    —    |     —      |        —        |   —    |  content only   |      —      |
| Market manager  |   —    |      —       |    —     |   vertical admin    |    —    |     —      |        —        |   —    |   market only   |      —      |
| Admin           |   —    |      —       |    —     |   vertical config   |    —    |     —      |        —        |   —    |        ✓        | staff/roles |
| Owner           |   —    |      —       |    —     |          —          |    —    |     —      |        —        |   —    |        ✓        |      ✓      |

The exact, machine-readable list is exported as `CAPABILITIES`,
`VERTICAL_CAPABILITIES`, and `STAFF_ROLE_CAPABILITIES`.

## H. Protected route matrix

The machine-readable matrix is
`frontend/src/security/access-policy.registry.ts`.

| Route family                                              | Account family          | Requirement                                                     |
| --------------------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| `/deposer`                                                | individual/professional | `listing.create`                                                |
| `/deposer/{cours,auto,immo,emploi}`                       | customer                | corresponding own vertical publication capability               |
| `/messages`                                               | customer                | `message.read.own`                                              |
| `/compte/*`                                               | individual/professional | customer boundary plus per-child capability                     |
| `/compte/pro/*`                                           | professional            | generic storefront capability or shared subscription capability |
| `/compte/{auto,immo,cours/organisation,emploi/recruteur}` | professional            | selected vertical capability                                    |
| `/admin`                                                  | active Staff            | `staff.internal.access` + `admin.access`                        |
| `/admin/moderation`                                       | active Staff            | report or moderation capability                                 |
| `/admin/utilisateurs`                                     | active Staff            | `user.read`                                                     |
| `/admin/verifications`                                    | active Staff            | `user.verify` or `compliance.review`                            |
| `/admin/{marches,taxonomie,monetisation,tendances}`       | active Staff            | exact configuration capability                                  |
| `/admin/fournisseurs/*`                                   | active Staff            | `provider.read`                                                 |
| `/admin/{cours,auto,immo,emploi}`                         | active Staff            | corresponding vertical-admin capability                         |
| `/admin/crm/*`                                            | active Staff            | exact CRM read/use capability                                   |
| `/admin/roles`                                            | active Staff            | role or permission governance capability                        |
| `/admin/audit`                                            | active Staff            | `audit.read`                                                    |

Marketplace, search, category, listing-detail, acquisition, and onboarding
routes remain available to anonymous visitors and customer identities as
declared in the application router, but a Staff session is redirected before
customer UI is rendered. Legal, security, help, support, and contact routes
remain neutral Staff-safe public surfaces.

## I. Important API authorization matrix

| Endpoint/action                             | Policy                                             | Additional scope                                                                                   |
| ------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Public marketplace taxonomy/search/detail   | public + Staff denial                              | anonymous/customer only; privacy-safe DTO; authenticated Staff receives 403                        |
| Create/update/publish listing               | listing capability                                 | authenticated publisher + owner/org/branch + entitlement                                           |
| Orders/messages/notifications/workspace     | own capability                                     | participant or owner; foreign IDs return 404                                                       |
| Vertical recruiter/agency/dealer/org APIs   | vertical capability                                | active membership/ownership                                                                        |
| `GET /admin/users`                          | `user.read`                                        | no credential fields                                                                               |
| `GET /admin/users/:id/capabilities`         | `admin.permissions.manage`                         | active Staff + MFA + recent auth; complete explainable projection                                  |
| `PUT /admin/users/:id/capability-overrides` | `admin.permissions.manage`                         | no self/owner escalation; optimistic version; atomic audit + session revocation                    |
| `PUT /admin/users/:id/status`               | read + action-specific restrict/suspend/reactivate | no self-status mutation; reason + audit                                                            |
| `PUT /admin/users/:id/staff-status`         | `admin.staff.manage`                               | active Staff + MFA + recent auth; no self-management; owner protection; audit + session revocation |
| `PUT /admin/users/:id/verification`         | `user.verify`                                      | professional target; note + audit                                                                  |
| `GET /admin/reports`                        | `report.review`                                    | staff only                                                                                         |
| Resolve report: dismiss                     | `report.review`                                    | reason + audit                                                                                     |
| Resolve report: remove listing              | `report.review` + `moderation.action`              | reason + audit                                                                                     |
| Resolve report: ban user                    | `report.review` + `user.suspend`                   | reason + audit                                                                                     |
| Audit log                                   | `audit.read`                                       | staff scope                                                                                        |
| Trending/configuration                      | `admin.configuration.manage`                       | market scope where applicable                                                                      |
| Refund                                      | `payment.refund`/`order.refund`                    | transaction validation and idempotency                                                             |
| Stripe webhook                              | signed public webhook                              | raw-body signature, no session token                                                               |

Every backend route must declare `public`, `authenticated`, or an explicit
permission when registered. Capability checks use capabilities recomputed from
the current database profile, not client-provided claims.

## J. Migration

`00023_canonical_access_control.sql` establishes the capability vocabulary.
`00079_staff_status.sql` then separates Staff from the account type using
expand/backfill/compatibility steps:

1. add canonical account/status values and access dimensions;
2. backfill staff roles and professional verticals from legacy data;
3. enforce dimension constraints and indexes;
4. create capability/grant tables and deterministic grants;
5. add lifecycle-aware `has_capability`;
6. retire the broad `is_admin()` bypass (legacy callers deny until replaced);
7. replace core profile, listing, market, taxonomy, and audit RLS policies;
8. restrict authenticated profile writes to safe columns;
9. expose only `public_profiles` to public/authenticated database roles.

The v79 migration backfills historical Staff profiles into
`staff_memberships`, converts their underlying account type to Individual,
denies browser access to the membership table, grants Staff capabilities only
for active rows, protects owners, and writes the audit record in the same
database transaction. Legacy account/role values remain rollout aliases only.

The v82 migration grants `staff.internal.access` to every Staff role and
`admin.permissions.manage` to admin/owner, versions direct overrides, and owns
the allowlisted override mutation. PostgreSQL locks the target, rejects stale,
unknown, contradictory, self, and owner-escalating changes, then updates the
profile, revokes sessions, and inserts before/after audit metadata in one
transaction. Browser roles cannot execute the function.

The v83 migration adds `marketplace.customer.access`, removes every canonical
customer capability from Staff role/direct grants, revokes affected sessions,
archives Staff-owned listing inventory and promotions, and prevents new Staff
listing lifecycles. Database capability resolution checks for any retained
Staff membership before account-family, vertical, or direct grants. Restrictive
RLS intersects existing policies on marketplace, vertical, monetization,
finance, invoicing, CRM, and marketing customer state; backend service-role
operations remain subject to their exact internal route capabilities.

## K. Security validation

Automated coverage includes:

- forged JWT and `alg:none` rejection;
- self-registration and role-switch privilege escalation;
- current-state/session capability resolution;
- every Staff role and lifecycle state denied the customer capability plane;
- Staff-authenticated public marketplace and demo-adapter denial;
- staff/customer and cross-vertical separation;
- admin/moderation/finance separation;
- moderator ban and Trust & Safety listing-removal denial;
- owner/resource IDOR denial with 404 behavior;
- profile mass-assignment filtering;
- report action step-up checks;
- sensitive status audit reason/actor capture;
- role-label-only, self-elevation, missing-MFA, stale-recent-auth, and last-owner
  Staff administration denial;
- inactive-Staff/direct-grant denial, capability-override wrong-caller,
  self/owner escalation, unknown/contradictory collection, concurrency, audit,
  and session-revocation checks;
- RLS enablement, safe profile projection, and broad admin-helper retirement;
- suspended/restricted/banned lifecycle filtering.

## L. UX validation

- Navigation and direct-route guards share one named policy registry.
- Active Staff can enter only the Staff console and neutral legal/help/security
  surfaces; customer navigation, acquisition, listing, messaging, transaction,
  and professional workspaces are not rendered.
- The customer-only mobile application clears and rejects every Staff session.
- Internal identity surfaces present active Staff before Professional and
  Individual identity. Staff and customer-verification badges use distinct
  text, icons, accessible names, and semantic treatments.
- User administration offers a complete customer projection for customers and
  an internal-only projection for Staff; forbidden customer capability names
  are not shown as possible Staff grants.
- Professional menus show only the selected vertical.
- Pending professional registration lands in verification rather than a locked
  dashboard.
- Denied capabilities use existing Shongre denial states and login continuation.
- Demo switcher includes guest, individual, generic/four vertical Pros,
  support, moderator, Trust & Safety, finance, operations, admin, and owner.
- Existing responsive layouts, focus handling, semantic menus, and design tokens
  are preserved.

## M. Remaining production checks

- Execute migrations `00023`, `00079`, `00082`, and `00083` against a disposable
  Supabase/PostgreSQL clone and
  run SQL-level authenticated-role probes before production rollout. Static RLS
  tests validate its policy contract, but they do not replace a real database
  migration rehearsal.
- Keep `NEXT_PUBLIC_DATA_MODE=demo` until the repository explicitly authorizes
  the HTTP adapter. The adapter contracts are prepared; enabling the backend is
  intentionally outside the current frontend constraint.
- Any future raw-table RLS policy still using the retired `is_admin()` helper
  will deny access by design and must be replaced with its exact capability
  before that direct-table workflow is enabled.
