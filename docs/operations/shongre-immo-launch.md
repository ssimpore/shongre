# Shongre Immo — launch checklist

The default and currently supported frontend runtime remains `NEXT_PUBLIC_DATA_MODE=demo`. Do not select `api` mode merely because the HTTP adapter exists.

## Technical gates

- Apply `00014_real_estate_vertical.sql` in an isolated environment and run the France seed.
- Regenerate committed database types from that migrated database and remove temporary adapter casts.
- Verify every real-estate RLS policy with owner, unrelated user, agency member, moderator, finance, and admin identities.
- Configure a private document bucket, malware scanning, retention/deletion, EXIF handling, signed-URL TTLs, and audit logs.
- Verify PostGIS extension availability, map precision, search plans, indexes, cursor stability, and representative high-volume queries.
- Run contract, backend unit/contract/security/RLS, frontend unit, E2E, responsive, accessibility, and cross-browser suites.
- Exercise import idempotency, partial failures, error-report authorization, backpressure, and worker retry/dead-letter behavior.

## France product/legal gates

- Legal review of mandatory sale/rental fields, DPE/GES wording, coproperty information, Georisques link/copy, fees, price display, professional identity, and retention periods.
- Trust & Safety approval for address precision, suspicious-price/media rules, impersonation, duplicate properties, document review, appeals, and incident response.
- Privacy review for leads, exact address, diagnostics/ownership documents, appointment data, analytics dimensions, processors, deletion, and data-subject requests.
- Operations runbooks for moderation SLA, professional verification, import support, lead disputes, refunds, complaints, and emergency vertical deactivation.

## Payment gate

- Keep `PAYMENT_PROVIDER=demo` until product prices/taxes are approved and the server checkout has passed test mode.
- Store Stripe keys only in the backend secret manager; never use a `NEXT_PUBLIC_` secret.
- Verify raw-body webhook signatures, replay handling, success/failure/expiry/refund events, invoices, subscription cancellation, proration policy, reconciliation, and support tooling.
- Confirm no paid add-on is preselected and every paid prominence label is visible.
- Complete a current app-store billing review before exposing digital listing promotion in a native app.

## Rollout

1. Internal demo and accessibility review.
2. Database/API staging with synthetic accounts and no live payments.
3. Limited verified-agency pilot with imports disabled.
4. Enable CSV, then XML, then API sync independently after operational evidence.
5. Enable paid owner/agency offers only after payment and refund gates.
6. Monitor search latency, lead spam/duplicates, moderation backlog, response rate, complaints, import errors, checkout failures, and webhook replays.

Rollback is configuration-first: disable the France `real_estate` activation and paid flags, preserve drafts and data, drain import workers, and stop new checkout creation without deleting records.

## Migration rollback posture

`00014_real_estate_vertical.sql` is an additive migration that also introduces generic vertical commerce tables consumed by future verticals. Do not ship a destructive down migration that blindly drops those shared tables.

For a failed pre-production apply, restore the disposable database or its pre-migration snapshot. For a production rollback, first deactivate `real_estate`, stop new Immo checkouts/imports, retain property/draft/lead/payment records, and roll application code back. Only remove Immo-specific objects after an export and dependency check confirms that no checkout, generic listing, audit, or other vertical references them. Contracting columns or tables follows expand → migrate/verify → contract in a later reviewed migration.

## External integrations still required before live launch

- A production Stripe account, approved price/tax catalogue, customer portal and invoice-document policy when `PAYMENT_PROVIDER=stripe` is selected.
- A geocoder/address provider and approved map-tile terms; the current deterministic demo does not transmit an exact address.
- Private-object malware scanning, EXIF stripping, retention jobs and operator document-review tooling.
- CSV/XML/API ingestion workers, queue retry/dead-letter operations and partner credential issuance.
- Production KYC/KYB/business-registry providers selected through the existing backend provider boundary.
- France legal/privacy review and Trust & Safety approval described above.
