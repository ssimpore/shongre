# Web analytics

The Web client uses the single consent-aware SDK in `src/analytics/`. Features
emit provider-neutral events through `src/services/analytics.service.ts`; they
must never import PostHog, GA4, Matomo, Cloudflare or Sentry directly.

See [`../../docs/architecture/analytics.md`](../../docs/architecture/analytics.md)
for event naming, consent, sanitization, identity, provider configuration,
debugging, tests and rollout policy.
