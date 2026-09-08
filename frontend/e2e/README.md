# End-to-end suite

Runs the API-only frontend against the isolated backend test transport. No live
Supabase, Stripe, or KYC provider is involved.

```bash
make frontend-test-e2e
make frontend-test-e2e E2E_ARGS='responsive.spec.ts --project=chromium'
make frontend-test-e2e E2E_ARGS='accessibility.spec.ts --project=chromium'
make test-web-api-transport
```

## What each spec holds the line on

| Spec                              | Guards                                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `responsive.spec.ts`              | No route widens the document past the viewport, across the 320→1440 matrix.                                                             |
| `accessibility.spec.ts`           | Zero critical/serious axe violations per route; visible focus on every tab stop; dialog focus trap and restore.                         |
| `journeys.spec.ts`                | The validation matrix: public browsing, buyer, seller, pro and admin flows, plus URL-driven search state and scroll behaviour.          |
| `listing-card-responsive.spec.ts` | Canonical card anatomy, token-backed width/height, long-content containment, real optional facts, favourite isolation, grids and rails. |

## Adding a route

Add it to `routes.ts` with the persona that can reach it. Both the responsive
and accessibility suites iterate that list, so a new route is covered by both
without touching either spec.

## Personas

`personas.ts` signs the backend-owned scenario accounts in through the first-party
HTTP API and checks `/auth/me`. Staff complete the real MFA challenge using
single-use recovery codes. The runner creates a private, ephemeral account
manifest and atomic code claims, then removes them with the isolated API. No
test credentials enter the application bundle or checked-in files. The retired
local-storage switcher is covered only by a negative impersonation regression.

The isolated API reuses the local database seed's listing projection and source
scenario. Backend test repositories remain deliberate test infrastructure;
these checks do not certify hosted providers or PostgreSQL persistence.
`fixtures.ts` resolves source listing keys to the same UUIDs as the local seed;
do not put retired synthetic listing IDs in browser URLs. Direct navigation uses
the isolated canonical France origin, not the bare listener hostname.

`api-personas.spec.ts` verifies authentication, MFA, authorization and logout.
`marketplace-api-journey.spec.ts` verifies publication, persistent favourites,
mobile messaging and account isolation through the API. User `--grep` and
`--grep-invert` filters intersect the runner's regular/serial partition so tests
cannot execute twice or silently lose their requested filter.

## Browsers

Chromium runs the full suite. WebKit and Firefox run the journey and
accessibility specs, where engine differences actually bite (sticky headers,
`dvh`, focus handling in overlays).

The runner disables Firefox by default on Darwin 27 because of the recorded
local launch failure. Firefox remains configured for supported hosts and CI;
`FORCE_FIREFOX_E2E=1` requests a local retest. Chromium and WebKit remain available.
