# Shongre Database & PostgreSQL Schema Specification

## 1. Migration History

All migrations are sequentially versioned under `backend/supabase/migrations/`:

1. `00001_initial_schema.sql`: Core tables (`profiles`, `organizations`, `stores`, `markets`, `categories`, `listings`, `listing_media`, `orders`, `payouts`, `subscriptions`, `boosts`, `verification_requests`, `reviews`, `reports`, `audit_logs`).
2. `00002_rls_policies.sql`: Row-Level Security policies enforcing isolation and role permissions.
3. `00003_functions_and_triggers.sql`: Automated timestamps, search vector trigger, 4-digit handover PIN generator, rating aggregation trigger, and atomic escrow release stored procedure.
4. `00004_seed_data.sql`: Base data for European markets (FR, BE, CH, LU, DE, ES), taxonomy categories, subscription plans, and demo users.
5. `00005_indexes_and_performance.sql`: GIN full-text search, trigram, and composite filtering indexes.

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
