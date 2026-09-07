# Mobile threat model

Assets include session tokens, account identity, private messages, listing drafts/photos, location, order state, push tokens, and moderation evidence. Main threats are token theft, insecure transport, malicious deep links, IDOR, client-side authorization bypass, abusive UGC, overbroad permissions, sensitive logs, dependency compromise, and incorrect privacy declarations.

Controls implemented:

- every mobile business operation, including authentication, uses the central
  typed `/api/v1` HTTP boundary; there is no mobile demo mode, fixture fallback,
  direct Supabase access, or client-side synthetic success path;
- bearer tokens are stored with Keychain/Keystore through SecureStore and removed on logout/deletion;
- an expired access token permits one refresh-and-retry cycle; rejected refresh
  clears the stored session while a network outage remains an explicit retryable
  error rather than silently logging the user out;
- signed file upload is isolated to short-lived backend-issued HTTPS destinations
  and sends neither API credentials nor redirect-following requests;
- production endpoints must be stable HTTPS URLs and release preflight rejects loopback, LAN, emulator, or tunnel hosts;
- backend derives identity from the authenticated principal and enforces ownership/permissions;
- report/block state and message blocking are server-authoritative;
- account deletion reauthenticates, refuses unsafe deletion with active orders, anonymizes data, and revokes credentials/tokens;
- mobile permissions use a generated allowlist and are requested contextually;
- no advertising, tracking, analytics, or crash SDK is enabled today;
- native/store checks inspect generated projects, not only Expo source configuration.

Residual/manual risks: device compromise, screenshot/clipboard exposure, production WAF/rate limits, abuse operations, signed artifact provenance, dependency-advisory reachability, console declarations, processor contracts, disaster recovery, and incident response. Reassess when adding social login, payments, analytics, maps, AI, background execution, or new native SDKs.
