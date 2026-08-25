# Shongre Database & PostgreSQL Schema Specification

## 1. Migration History

All migrations are sequentially versioned under `backend/supabase/migrations/`.
The canonical sequence currently runs from `00001` through `00062`; production
environments must apply the entire sequence in order. The entries below summarize
the foundational migrations, while later migrations evolve the same schema for
marketplace domains, CRM, marketing automation, provider integrations, and
country-context hardening.

Foundational migrations:

1. `00001_initial_schema.sql`: Core tables (`profiles`, `organizations`, `stores`, `markets`, `categories`, `listings`, `listing_media`, `orders`, `payouts`, `subscriptions`, `boosts`, `verification_requests`, `reviews`, `reports`, `audit_logs`).
2. `00002_rls_policies.sql`: Row-Level Security policies enforcing isolation and role permissions.
3. `00003_functions_and_triggers.sql`: Automated timestamps, search vector trigger, 4-digit handover PIN generator, rating aggregation trigger, and atomic escrow release stored procedure.
4. `00004_seed_data.sql`: Base data for European markets (FR, BE, CH, LU, DE, ES), taxonomy categories, subscription plans, and demo users.
5. `00005_indexes_and_performance.sql`: GIN full-text search, trigram, and composite filtering indexes.

The current tail migration,
`00062_country_context_hardening.sql`, removes implicit country, locale, currency,
and timezone defaults from tenant-owned data, adds market foreign keys, and
hardens mobile RLS policies. Database releases are not complete until the
migration ledger confirms `00062` has been applied in the target environment.

---

## 2. Entity Relationship Overview

```
 [profiles] ────────< [listings] ────────< [listing_media]
      │                   │
      │                   ▼
      ├──────────────< [orders] ───────────< [payouts]
      │                   │
      │                   ▼
      ├──────────────< [reviews]
      │
      ├──────────────< [conversations] ───< [messages]
      │
      ├──────────────< [verification_requests]
      │
      └──────────────< [subscriptions] / [listing_boost_orders]
```
