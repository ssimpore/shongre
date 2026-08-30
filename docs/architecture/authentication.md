# Shongre authentication architecture

Status: implemented behind feature flags. Email/password remains enabled by
default; social authentication and account linking remain disabled until each
provider console is configured and the database migration is deployed.

## Runtime boundaries

The browser talks only to `/api/v1/auth/*`. Provider secrets, Apple signing
keys, authorization-code exchange, ID-token validation, identity resolution,
session rotation and audit writes run in `backend/`. The browser receives an
HttpOnly access cookie, an HttpOnly refresh cookie scoped to `/api/v1/auth`, and
a readable random CSRF cookie used as a double-submit token. It never receives
the refresh token in JSON.

The native app sends `X-Shongre-Client: native`. It receives short-lived access
and rotating refresh tokens only from Shongre, stores them with Expo
SecureStore, and refreshes once after a 401. OAuth opens the system browser.
The provider callback returns to the fixed `shongre://auth/callback` scheme with
a one-time, two-minute exchange code in the URL fragment; the app exchanges it
once for a normal Shongre session. Provider access and refresh tokens are never
stored in the app.

If the provider withholds email, the native callback instead carries a
short-lived completion handle in the fragment. The app asks for an email,
submits the handle once, and tells the user to follow the verification message;
it does not create an active session before verification.

The standalone frontend remains `NEXT_PUBLIC_DATA_MODE=demo`. Its auth adapter
is deterministic and asynchronous, and it does not require the backend,
Supabase or any provider console.

## Identity and account rules

- `user_identities` is keyed by `(provider, provider_subject)`. Email is
  informational and never the durable provider key.
- A matching provider subject signs into the linked Shongre profile.
- A verified provider email matching an existing Shongre profile does **not**
  silently merge accounts. The user must sign into that profile, recently
  reauthenticate, and explicitly link the provider.
- A new verified provider identity creates a normal individual profile and
  preserves the requested Particulier/Professionnel onboarding destination.
  A provider claim never grants Pro, moderator or administrator authority.
- Missing or unverified provider email creates a short-lived pending
  registration. Shongre requires and verifies an email before activation.
- Apple private-relay addresses are retained as valid provider addresses and
  are labeled in the security UI.
- Profile and first provider identity are inserted by one PostgreSQL function,
  `provision_oauth_profile`, so a uniqueness race rolls both writes back.
- Unlinking is rejected if it would remove the last usable sign-in method. The
  same invariant is enforced by a database trigger.

Existing profile IDs are preserved, so listings, messages, favorites, reviews,
organizations and seller state remain attached when a new login method is
linked.

## OAuth/OIDC flow

1. The client posts the provider, intent, safe internal `returnTo`, client kind,
   and optional onboarding account type to `/auth/oauth/:provider/start`.
2. The backend creates high-entropy state, nonce and PKCE verifier. Only the
   state and nonce SHA-256 digests are persisted; the verifier is service-role
   only and expires after ten minutes.
3. Google and Apple ID tokens are verified against provider JWKS, including
   algorithm, signature, issuer, audience, expiry, issued-at and nonce. Facebook
   user tokens are checked with `debug_token` against the configured app ID.
4. State is consumed atomically before the authorization code is exchanged, so
   replay and concurrent callbacks fail closed.
5. The backend resolves the stable subject under the rules above, creates or
   touches the identity, records a credential-free audit event, creates a
   server session, and redirects to the fixed web or native callback.

Apple may return a name only on first authorization. Shongre captures it then
and never overwrites a user-edited profile with a later empty claim. Cancellation
returns a neutral cancelled result and creates no account or session.

## Session lifecycle

- Access token: 15 minutes by default and contains a server-side session ID.
- Refresh token: 30 days by default, random and stored only as SHA-256.
- Every refresh rotates to a new token and row in the same family.
- Reuse of a rotated token revokes the entire family.
- Logout revokes the current session; “logout all” can revoke every session or
  keep the current device.
- Password reset revokes all sessions. Password change revokes every other
  session. Unlinking a provider revokes other sessions created through it.
- Suspended, banned, archived, deleted, expired or revoked sessions resolve as
  unauthenticated even when the access-token signature is valid.
- Link, unlink, add-password and other sensitive actions require authentication
  within `AUTH_RECENT_AUTH_SECONDS`.
- Staff is not an account type or a token claim. Each employee retains an
  Individual or Professional account and receives a separate server-managed
  membership with `active`, `suspended`, or `revoked` status and one explicit
  Staff role. Request principals reload that membership and its capabilities
  from the database on every request.
- Any retained Staff membership excludes the customer marketplace capability
  plane for the same identity. Active Staff receive only internal role
  capabilities; suspended and revoked Staff receive neither plane and cannot
  create or refresh a session. The customer-only mobile client rejects every
  Staff lifecycle state.
- Staff-only capabilities require an MFA-verified session. Granting, changing,
  suspending, reactivating, or revoking Staff access also requires recent
  authentication, forbids self-management, revokes all target sessions, and
  protects the last active owner. A role label alone grants no authority.

`auth_audit_events` records login outcome, provider, coarse IP prefix, generic
failure category and non-sensitive metadata. A database constraint rejects
metadata keys that resemble passwords, tokens, codes or secrets.

## Routes

| Method     | Route                                                                             | Purpose                                        |
| ---------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| POST       | `/auth/login`, `/auth/register`                                                   | Password session creation                      |
| POST       | `/auth/refresh`, `/auth/logout`, `/auth/logout-all`                               | Session lifecycle                              |
| GET/DELETE | `/auth/sessions`, `/auth/sessions/:id`                                            | Device list and revocation                     |
| POST       | `/auth/reauthenticate`                                                            | Recent-auth proof                              |
| POST       | `/auth/password/forgot`, `/auth/password/reset`                                   | One-time password recovery                     |
| POST       | `/auth/verify-email/resend`, `/auth/verify-email`                                 | One-time email verification                    |
| POST       | `/auth/oauth/:provider/start`                                                     | Create state/nonce/PKCE flow                   |
| GET/POST   | `/auth/oauth/:provider/callback`                                                  | Provider callback (Apple uses `form_post`)     |
| POST       | `/auth/oauth/native-exchange`                                                     | One-time app handoff                           |
| POST       | `/auth/oauth/complete-profile`                                                    | Supply an email when the provider cannot       |
| GET        | `/auth/security`                                                                  | Connected methods and active sessions          |
| DELETE     | `/auth/identities/:provider`                                                      | Guarded provider unlink                        |
| POST/GET   | `/auth/oauth/facebook/data-deletion`, `/auth/oauth/facebook/data-deletion/status` | Signed Meta deletion request and opaque status |

Staff lifecycle administration is exposed separately at
`PUT /admin/users/:userId/staff-status`. It never changes the target's
Individual/Professional account type. The canonical OpenAPI document defines
the request schema and the required `admin.staff.manage` capability.

Cookie-authenticated mutations require `X-CSRF-Token`; credential entry points,
provider callbacks and native bearer requests are exempt for the reasons stated
in the canonical `backend/openapi/openapi.json` contract and enforced in
`backend/src/api/v1/router.ts`. The endpoint table above is explanatory; the
OpenAPI document is authoritative.

## Provider console setup

Use separate provider applications/clients for local, staging and production
where the provider supports it. Never reuse production secrets in developer
machines. Callback values must match exactly, including scheme, host, port and
path.

### Google

In Google Cloud Console, select the environment-specific project, configure the
OAuth consent screen and its support/developer contacts, add only the
`openid email profile` scopes, then create **Credentials → OAuth client ID → Web
application**. Add these exact authorized redirect URIs (only to the matching
environmental client):

- local: `http://127.0.0.1:4000/api/v1/auth/oauth/google/callback`
- staging: `https://api.staging.shongre.com/api/v1/auth/oauth/google/callback`
- production: `https://api.shongre.com/api/v1/auth/oauth/google/callback`

Set the matching `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` and
`GOOGLE_OAUTH_CALLBACK_URL`. Google’s server flow and OIDC validation reference
are [OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
and the [OpenID Connect API reference](https://developers.google.com/identity/openid-connect/reference).

### Apple

In Certificates, Identifiers & Profiles, enable **Sign in with Apple** on the
`com.shongre.marketplace` App ID. Create an environment-specific Services ID for
the web flow, configure Sign in with Apple, associate the primary App ID, add
the corresponding Shongre domain under **Domains and Subdomains**, and add the
exact URL below under **Return URLs**. Finally create a Sign in with Apple key
associated with that primary App ID and download its `.p8` file once. Configure:

- staging: `https://api.staging.shongre.com/api/v1/auth/oauth/apple/callback`
- production: `https://api.shongre.com/api/v1/auth/oauth/apple/callback`

Apple does not accept an ordinary localhost HTTP return URL for this web flow.
Local end-to-end testing therefore needs a temporary HTTPS tunnel whose exact
domain and callback are registered on the Services ID; update
`APPLE_OAUTH_CALLBACK_URL` only for that local environment.

Set `APPLE_SERVICE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and either
`APPLE_PRIVATE_KEY` (with escaped newlines) or `APPLE_PRIVATE_KEY_BASE64`. Keep
the `.p8` material only in the backend secret manager. See Apple’s
[environment configuration](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple)
and [other-platform integration](https://developer.apple.com/documentation/signinwithapple/incorporating-sign-in-with-apple-into-other-platforms).

### Facebook

In Meta for Developers, create an environment-specific consumer app, add the
**Facebook Login** product, enable Client OAuth Login and Web OAuth Login, keep
strict redirect URI matching enabled, and enter the appropriate exact valid
OAuth redirect URI:

- local: `http://127.0.0.1:4000/api/v1/auth/oauth/facebook/callback`
- staging: `https://api.staging.shongre.com/api/v1/auth/oauth/facebook/callback`
- production: `https://api.shongre.com/api/v1/auth/oauth/facebook/callback`

Add the matching Shongre host under app domains, configure privacy/terms URLs,
request only `public_profile,email`, provide reviewer instructions and test
credentials if Meta requests review, then switch the production app to Live
only after review and staging validation. Configure `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`,
`FACEBOOK_OAUTH_CALLBACK_URL`, and a deliberately pinned
`FACEBOOK_GRAPH_API_BASE_URL` such as `https://graph.facebook.com/vXX.X` using
the version supported by the app at rollout time. Upgrades are explicit; do not
silently float Graph API versions.

Configure this public data-deletion callback in the Meta app:

- staging: `https://api.staging.shongre.com/api/v1/auth/oauth/facebook/data-deletion`
- production: `https://api.shongre.com/api/v1/auth/oauth/facebook/data-deletion`

The callback validates Meta’s HMAC-SHA256 signed request with the Facebook app
secret, enqueues an `oauth_provider_deletion_requests` record, records a
credential-free audit event, and returns Meta’s required confirmation URL and
code. Eligible accounts are anonymized immediately; active transactions leave
the request queued. The hourly provider-deletion worker retries queued records
through Shongre’s existing account-deletion policy, including active-order
checks, identity removal and session revocation. The public status endpoint
accepts only the random confirmation code and does not disclose the provider
subject or Shongre user ID.

## Environment and startup validation

Copy the auth section of `.env.example`. Social login starts only when both
`ENABLE_SOCIAL_AUTH=true` and the individual provider flag are true. Startup
fails with the names (never values) of missing credentials. Production also
requires the transactional email boundary, frontend URL, strong JWT secret,
secure cookies and exact CORS/OAuth origins.

Do not put secrets in `NEXT_PUBLIC_*`, `VITE_*`, Expo public variables, logs,
redirect query strings, analytics events or screenshots.

## Rollout and rollback

1. Deploy migration `00012_auth_identities_and_sessions.sql` and verify the
   existing password-identity backfill and RLS/service-role grants.
2. Deploy backend and UI with all social flags false. Verify password login,
   verification, reset, refresh, logout and demo-only frontend operation.
3. Configure one provider in staging, enable its provider flag plus
   `ENABLE_SOCIAL_AUTH`, and test new account, repeat login, conflict/link,
   cancellation, denied email, Apple relay, invalid state, native exchange and
   unlink-last-method rejection.
4. Enable `ENABLE_ACCOUNT_LINKING` only after recent-auth and unlink tests pass.
5. Roll out one provider at a time in production and monitor generic failure,
   rate-limit, identity-conflict and refresh-reuse audit categories.

Rollback is flag-first: disable the affected provider or all social auth. This
does not delete identities, profiles or sessions. Existing password users keep
working, and linked identities remain available when the provider is restored.
Never roll back by dropping `user_identities` or `auth_sessions`; those tables
contain the continuity needed for safe recovery and account linking.

## Troubleshooting and recovery

- **Provider rejects the callback:** compare the generated callback byte for
  byte with the console entry, including scheme, host, port, path and trailing
  slash. Apple web callbacks must use a registered HTTPS domain.
- **Button is absent:** check `ENABLE_SOCIAL_AUTH`, the provider-specific flag,
  and startup validation for missing credential names. Clients intentionally
  reflect `/auth/oauth/providers`; they do not override backend flags.
- **Invalid or expired attempt:** start a fresh flow. State, completion handles
  and native exchange codes are single-use and must never be manually replayed.
- **Existing-account conflict:** sign in with the existing method, complete
  recent authentication in Connexion & sécurité, then explicitly link the
  provider. Support must not merge identities by editing an email.
- **Refresh reuse detected:** treat the family as compromised. It is already
  revoked; have the user sign in again, inspect the credential-free auth audit,
  and revoke other unrecognized sessions.
- **Lost provider access:** use another connected method or password recovery.
  Never unlink the final usable method. Support recovery must verify account
  ownership outside provider claims and remain auditable.
- **Email delivery outage:** accounts awaiting verification remain inactive.
  Restore `AUTH_EMAIL_DELIVERY_URL`, then use the generic resend endpoint; do
  not activate profiles directly in the database.
- **Emergency rollback:** set the affected `ENABLE_*_AUTH=false` (or
  `ENABLE_SOCIAL_AUTH=false`), redeploy backend/UI, and leave migration `00012`
  and all identity/session rows intact.
