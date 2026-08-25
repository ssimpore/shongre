# CRM architecture boundary

Shongre CRM is a bounded domain in the TypeScript/Node modular monolith. Its
complete implementation and operations reference is
[`../../backend/docs/crm-platform.md`](../../backend/docs/crm-platform.md).

```text
Marketplace / Immo / Auto / Education
        -> domain events + Shongre CRM adapter
        -> CRM Core
        -> canonical OpenAPI
        -> Web CRM service contract

CRM Core
        -> shared capability gateways
        -> Provider Platform
        -> AI / mailbox / delivery / calendar / SMS adapters
```

The arrows are one-way boundaries. CRM Core does not import a vertical's
repositories or provider SDKs. Verticals do not write CRM tables. Newsletter and
CRM reuse the same low-level delivery adapters. Provider credentials remain
server-side and tenant/user scoped.

PostgreSQL/Supabase and migrations are canonical persistence. Every CRM-owned
row is tenant-scoped and protected with forced RLS. Backend capabilities are the
authorization authority; frontend route policies are only an additional UX
guard.

The current implementation covers the core operational records, relational
tags, products, quotes, custom fields, saved account views, dashboard/report views,
tenant-scoped account duplicate suggestions, provider-neutral contracts and
deterministic demo mode.
Organization and subscription events now flow through a durable tenant-aware
inbox and scheduled worker into idempotent CRM projections. Listing, lead,
message and advertising projectors, audited duplicate merging, durable
automation, live mailbox/AI adapters, imports and exports remain explicitly
release-gated. Their schema being present is not evidence that those runtimes
are active.

A future SaaS extraction must use the OpenAPI/event seams and keep the shared
Provider Platform. It must not create a second credential store, AI gateway,
mailbox gateway, email delivery stack, or provider catalogue.
