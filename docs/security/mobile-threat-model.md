# Mobile threat model

Assets include session tokens, account identity, private messages, listing drafts/photos, location, order state, push tokens, and moderation evidence. Main threats are token theft, insecure transport, malicious deep links, IDOR, client-side authorization bypass, abusive UGC, overbroad permissions, sensitive logs, dependency compromise, and incorrect privacy declarations.

Controls implemented:

- bearer tokens are stored with Keychain/Keystore through SecureStore and removed on logout/deletion;
- production endpoints must be stable HTTPS URLs and release preflight rejects loopback, LAN, emulator, or tunnel hosts;
- backend derives identity from the authenticated principal and enforces ownership/permissions;
- report/block state and message blocking are server-authoritative;
- account deletion reauthenticates, refuses unsafe deletion with active orders, anonymizes data, and revokes credentials/tokens;
- mobile permissions use a generated allowlist and are requested contextually;
- no advertising, tracking, analytics, or crash SDK is enabled today;
- native/store checks inspect generated projects, not only Expo source configuration.

Residual/manual risks: device compromise, screenshot/clipboard exposure, production WAF/rate limits, abuse operations, signed artifact provenance, dependency-advisory reachability, console declarations, processor contracts, disaster recovery, and incident response. Reassess when adding social login, payments, analytics, maps, AI, background execution, or new native SDKs.
