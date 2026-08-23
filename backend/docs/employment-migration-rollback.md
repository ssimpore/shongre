# Shongre Emploi migration 00017

Migration `00017_employment_vertical.sql` is expand-only. It adds the employment domain alongside generic listings and reuses the canonical `jobs` / `jobs.offers` taxonomy identities.

## Rollback / feature deactivation

Do not drop employment tables while jobs or applications exist. To stop traffic safely:

1. Set `employment_market_configs.is_enabled = false` and the matching `vertical_market_activations.is_active = false` for the affected market.
2. Disable employment offers and add-ons; keep checkout and webhook rows for finance/audit retention.
3. Stop imports and wait for active synchronization jobs to finish.
4. Export application, consent and audit records according to the applicable retention policy.
5. Revert the `categories.publication_config` employment handler only after all employment routes are disabled. Generic legacy job listings continue to render through `listings`.
6. A destructive rollback must be a separate reviewed migration in reverse foreign-key order. Candidate documents must be deleted through the private storage lifecycle before database rows are removed.

The migration does not overwrite generic listing payloads and can therefore remain installed while the vertical is disabled.
