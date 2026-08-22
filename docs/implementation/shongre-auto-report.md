# Shongre Auto — implementation report

## Delivered

Shongre Auto extends the existing React/TypeScript, modular Node, and Supabase/PostgreSQL application. No parallel application or Django/DRF stack was introduced because the repository’s canonical backend is the TypeScript modular monolith.

- Versioned shared contracts cover market configuration, feature flags, vehicle catalog/types/attributes, public/private vehicle views, search, drafts, documents/trust, leads/actions/appointments, dealer workspaces, plans/add-ons, imports, referrals, and administration.
- Demo and PostgreSQL repositories implement the same complete interface.
- The backend owns public/private projection, ownership and dealer membership, media/active-vehicle quotas, duplicate hashing, moderation submission, lead spam handling, import entitlements/idempotency, market/type gates, partner refusal, and replay-safe Auto provider events.
- Migration `00013_auto_vertical.sql` adds the normalized catalog, indexed vehicles, private drafts/documents, dealer organizations/sites/team, leads/actions/appointments, imports/errors/API credentials, subscriptions/add-on purchases, referrals, provider event ledger, analytics/audit, triggers, functions, constraints, and deny-by-default RLS.
- France seed data configures types, attributes, make/model examples, five offers, add-ons, and disabled regulated/provider flags.
- Responsive frontend routes cover search, mobile filter drawer, account-backed alerts/favorites, detail/trust, two-to-four comparison, the 11-step publication flow, dealer operations, and domain-oriented admin.
- Original local vehicle imagery replaces unrelated remote placeholders, so the deterministic demo does not depend on image hotlinks or misrepresent the listed vehicle class.
- Structured actions, partner records, network-dealer entitlements, stock-transfer storage/RLS, per-listing dealer metrics, duplicate-lead review, and indexed description/media fraud fingerprints cover the operational cases in the brief.
- Page metadata includes canonical URLs, no-index handling for free-text search/protected routes, one description/canonical owner, and Vehicle structured data.

## Current launch posture

The intended runtime remains standalone demo mode. No frontend business-table, Supabase, Stripe, KYC, or partner call is introduced. Paid offers, secure sale, dealer API synchronization, boats, and all partner referrals are visibly gated. The HTTP adapter is present for the later controlled connection, but selecting API mode still requires the launch checklist in `docs/operations/shongre-auto-launch.md`.

## Verification commands

```bash
npm run typecheck --workspace=@shongre/contracts
npm test --workspace=@shongre/contracts
npm run typecheck --workspace=shongre-backend
npm test --workspace=shongre-backend
npm run lint --workspace=shongre-web
npm test --workspace=shongre-web
npm run build --workspace=shongre-backend
npm run build --workspace=shongre-web
```

The Auto-specific browser suite is:

```bash
set -a && source .env && source scripts/env.sh && set +a
npm run test:e2e --workspace=frontend -- auto.spec.ts --project=chromium
```

The final executed counts and any environment-limited checks belong in the task handoff rather than being frozen into this document.
