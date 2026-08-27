# Backup and restore runbook

Database recovery is a release gate, not a post-launch promise. Production must
use a paid Supabase plan with PITR enabled and a recovery window approved by the
business. Database backups contain storage metadata but not the actual objects,
so listing media and private verification documents need an independent,
encrypted, versioned backup or replication policy.

## Required policy

- PostgreSQL: PITR with an RPO target of five minutes and at least seven days of
  retention. Retain a separate periodic logical dump in encrypted off-site
  storage according to the data-retention policy.
- Public listing media: versioning plus cross-account or cross-project copy;
  lifecycle retention must exceed the database PITR window.
- Private identity documents: follow provider and legal retention rules; never
  copy them to an unapproved region or an operator laptop.
- Encryption keys, Stripe webhook secrets, OAuth keys, and provider credentials
  are backed up through the secret manager's recovery process, not database
  dumps.

## Restore drill

1. Create an isolated non-production database whose database name contains
   `restore` or `dr_test`. Never restore over staging or production.
2. Export `BACKUP_SOURCE_DATABASE_URL`, `RESTORE_TEST_DATABASE_URL`, and an
   external `BACKUP_RESTORE_EVIDENCE_FILE` path. Run
   `ALLOW_BACKUP_RESTORE_TEST=true make backup-restore-test`.
3. Confirm migrations, profiles, listings, and orders can be queried. The script
   records only counts and timestamps, never credentials or customer rows.
4. Restore a representative non-sensitive test fixture from the independent
   storage backup. Prefer the automated checksum path: provide short-lived
   `STORAGE_BACKUP_DOWNLOAD_URL`, `STORAGE_RESTORE_UPLOAD_URL`,
   `STORAGE_RESTORE_DOWNLOAD_URL`, an isolated
   `STORAGE_RESTORE_TARGET_ID` containing `restore` or `dr_test`, and optionally
   `STORAGE_RESTORE_DELETE_URL`. The script uploads, reads back, compares
   SHA-256, and records `storage_restore=PASS` without persisting signed URLs.
   If those bindings are absent it retains
   `storage_restore=MANUAL_VERIFICATION_REQUIRED`, which cannot pass the
   production gate.
5. Exercise sign-in, listing read, one message read, and an order read against
   the isolated environment. Do not trigger provider webhooks or emails.
6. Destroy the isolated environment through the hosting control plane after the
   evidence and timings have been retained in the restricted operations store.

The evidence records database restore time, bounded row-count summaries, dump
size, and storage checksum metadata. It is written with owner-only permissions.

Run the drill before first launch, after material schema/storage changes, and at
least quarterly. `make production-release-check` rejects evidence older than 30
days for a launch.

## Incident restore

Freeze writes and provider callbacks first. Record the exact UTC recovery point,
current release, migration version, and last reconciled Stripe event. Restore to
a new project when possible, validate counts and authorization, reconfigure Auth,
Storage, Realtime, API keys, secrets, and webhook endpoints, then switch traffic.
Reconcile Stripe payments occurring across the recovery point before resuming
orders or payouts. A destructive in-place PITR restore requires incident
commander and database-owner approval.
