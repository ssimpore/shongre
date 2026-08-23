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
- Staff could enter the customer workspace, and staff landing pages loaded
  datasets before capability checks.
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
- Separate account family, professional vertical, staff role, lifecycle
  status, direct grants/revocations, entitlements, verification, ownership,
  organization scope, and market scope.
- One protected-route registry used by route guards and workspace navigation.
- Capability-scoped staff and customer layouts; unrelated links are removed,
  not disabled.
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

## D. Canonical account model

| Dimension         | Values                                                             | Meaning                             |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------- |
| Account family    | `individual`, `professional`, `staff`                              | Stable identity family              |
| Lifecycle         | `pending`, `active`, `restricted`, `suspended`, `banned`, `closed` | Whether the account may act         |
| Legacy aliases    | buyer/seller/pro/staff role labels                                 | Persistence compatibility only      |
| Direct policy     | `customPermissions`, `revokedPermissions`                          | Explicit, audited exceptions        |
| Commercial access | plan entitlements                                                  | Never a staff or identity role      |
| Trust state       | email, phone, identity, business, payment, payout                  | Independent verification dimensions |

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
| Finance         | transaction audit, refunds, commercial approval      | moderation, customer workspace, configuration    |
| Operations      | provider health/read                                 | customer, moderation, finance                    |
| Commercial      | CRM and commercial-rule editing                      | moderation, finance, platform configuration      |
| Content manager | taxonomy and editorial featuring                     | users, finance, moderation                       |
| Market manager  | market/vertical configuration in assigned markets    | finance and customer activity                    |
| Admin           | platform configuration and staff administration      | moderation and refunds unless separately granted |
| Owner           | permission governance and provider credentials       | moderation and refunds unless separately granted |

Staff receive no implicit customer/professional capabilities. Non-owner staff
operations are also constrained by assigned market scope.

## G. Effective capability matrix

This is the domain-level projection of the complete code registry. `own` means
resource ownership or authorized organization membership is still required.

| Persona         |    Public    | Customer own | Pro core |   Vertical tools    | Support | Moderation | Verify/restrict | Refund |     Config      | Governance  |
| --------------- | :----------: | :----------: | :------: | :-----------------: | :-----: | :--------: | :-------------: | :----: | :-------------: | :---------: |
| Guest           |      ✓       |      —       |    —     |          —          |    —    |     —      |        —        |   —    |        —        |      —      |
| Individual      |      ✓       |      ✓       |    —     | candidate/tutor own |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro generic     |      ✓       |      ✓       |    ✓     |          —          |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro real estate |      ✓       |      ✓       |    ✓     |        Immo         |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro automotive  |      ✓       |      ✓       |    ✓     |        Auto         |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro education   |      ✓       |      ✓       |    ✓     |      Cours org      |    —    |     —      |        —        |   —    |        —        |      —      |
| Pro employment  |      ✓       |      ✓       |    ✓     |      Recruiter      |    —    |     —      |        —        |   —    |        —        |      —      |
| Support         |      —       |      —       |    —     |          —          |    ✓    |     —      |        —        |   —    |        —        |      —      |
| Moderator       | limited read |      —       |    —     |          —          |    —    |     ✓      |        —        |   —    |        —        |      —      |
| Trust & Safety  |      —       |      —       |    —     |          —          |    —    |  reports   |        ✓        |   —    |        —        |      —      |
| Compliance      |      —       |      —       |    —     |          —          |    —    |     —      |        ✓        |   —    |        —        |      —      |
| Finance         |      —       |      —       |    —     |          —          |    —    |     —      |        —        |   ✓    |        —        |      —      |
| Operations      |      —       |      —       |    —     |    provider ops     |    —    |     —      |        —        |   —    |        —        |      —      |
| Commercial      |      —       |      —       |    —     |         CRM         |    —    |     —      |        —        |   —    | commercial only |      —      |
| Market manager  |      —       |      —       |    —     |   vertical admin    |    —    |     —      |        —        |   —    |   market only   |      —      |
| Admin           |      —       |      —       |    —     |   vertical config   |    —    |     —      |        —        |   —    |        ✓        | staff/roles |
| Owner           |      —       |      —       |    —     |          —          |    —    |     —      |        —        |   —    |        ✓        |      ✓      |

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
| `/admin`                                                  | staff                   | `admin.access`                                                  |
| `/admin/moderation`                                       | staff                   | report or moderation capability                                 |
| `/admin/utilisateurs`                                     | staff                   | `user.read`                                                     |
| `/admin/verifications`                                    | staff                   | `user.verify` or `compliance.review`                            |
| `/admin/{marches,taxonomie,monetisation,tendances}`       | staff                   | exact configuration capability                                  |
| `/admin/fournisseurs/*`                                   | staff                   | `provider.read`                                                 |
| `/admin/{cours,auto,immo,emploi}`                         | staff                   | corresponding vertical-admin capability                         |
| `/admin/crm/*`                                            | staff                   | exact CRM read/use capability                                   |
| `/admin/roles`                                            | staff                   | role or permission governance capability                        |
| `/admin/audit`                                            | staff                   | `audit.read`                                                    |

Unlisted marketplace, search, category, listing-detail, legal, and onboarding
routes remain public or guest-only as declared in the application router.

## I. Important API authorization matrix

| Endpoint/action                           | Policy                                             | Additional scope                                         |
| ----------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Public markets/taxonomy/search/detail     | public                                             | privacy-safe DTO only                                    |
| Create/update/publish listing             | listing capability                                 | authenticated publisher + owner/org/branch + entitlement |
| Orders/messages/notifications/workspace   | own capability                                     | participant or owner; foreign IDs return 404             |
| Vertical recruiter/agency/dealer/org APIs | vertical capability                                | active membership/ownership                              |
| `GET /admin/users`                        | `user.read`                                        | no credential fields                                     |
| `PUT /admin/users/:id/status`             | read + action-specific restrict/suspend/reactivate | no self-status mutation; reason + audit                  |
| `PUT /admin/users/:id/verification`       | `user.verify`                                      | professional target; note + audit                        |
| `GET /admin/reports`                      | `report.review`                                    | staff only                                               |
| Resolve report: dismiss                   | `report.review`                                    | reason + audit                                           |
| Resolve report: remove listing            | `report.review` + `moderation.action`              | reason + audit                                           |
| Resolve report: ban user                  | `report.review` + `user.suspend`                   | reason + audit                                           |
| Audit log                                 | `audit.read`                                       | staff scope                                              |
| Trending/configuration                    | `admin.configuration.manage`                       | market scope where applicable                            |
| Refund                                    | `payment.refund`/`order.refund`                    | transaction validation and idempotency                   |
| Stripe webhook                            | signed public webhook                              | raw-body signature, no session token                     |

Every backend route must declare `public`, `authenticated`, or an explicit
permission when registered. Capability checks use capabilities recomputed from
the current database profile, not client-provided claims.

## J. Migration

`00023_canonical_access_control.sql` uses expand/backfill/compatibility steps:

1. add canonical account/status values and access dimensions;
2. backfill staff roles and professional verticals from legacy data;
3. enforce dimension constraints and indexes;
4. create capability/grant tables and deterministic grants;
5. add lifecycle-aware `has_capability`;
6. retire the broad `is_admin()` bypass (legacy callers deny until replaced);
7. replace core profile, listing, market, taxonomy, and audit RLS policies;
8. restrict authenticated profile writes to safe columns;
9. expose only `public_profiles` to public/authenticated database roles.

Legacy role values remain available during rollout, but are presentation and
persistence aliases only.

## K. Security validation

Automated coverage includes:

- forged JWT and `alg:none` rejection;
- self-registration and role-switch privilege escalation;
- current-state/session capability resolution;
- staff/customer and cross-vertical separation;
- admin/moderation/finance separation;
- moderator ban and Trust & Safety listing-removal denial;
- owner/resource IDOR denial with 404 behavior;
- profile mass-assignment filtering;
- report action step-up checks;
- sensitive status audit reason/actor capture;
- RLS enablement, safe profile projection, and broad admin-helper retirement;
- suspended/restricted/banned lifecycle filtering.

## L. UX validation

- Navigation and direct-route guards share one named policy registry.
- Staff are redirected to the staff console; customer accounts remain in the
  account workspace.
- Professional menus show only the selected vertical.
- Pending professional registration lands in verification rather than a locked
  dashboard.
- Denied capabilities use existing Shongre denial states and login continuation.
- Demo switcher includes guest, individual, generic/four vertical Pros,
  support, moderator, Trust & Safety, finance, operations, admin, and owner.
- Existing responsive layouts, focus handling, semantic menus, and design tokens
  are preserved.

## M. Remaining production checks

- Execute migration `00023` against a disposable Supabase/PostgreSQL clone and
  run SQL-level authenticated-role probes before production rollout. Static RLS
  tests validate its policy contract, but they do not replace a real database
  migration rehearsal.
- Keep `NEXT_PUBLIC_DATA_MODE=demo` until the repository explicitly authorizes
  the HTTP adapter. The adapter contracts are prepared; enabling the backend is
  intentionally outside the current frontend constraint.
- Any future raw-table RLS policy still using the retired `is_admin()` helper
  will deny access by design and must be replaced with its exact capability
  before that direct-table workflow is enabled.
