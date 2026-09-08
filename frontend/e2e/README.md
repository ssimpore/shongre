# End-to-end suite

Runs the API-only frontend against the isolated backend test transport. No live
Supabase, Stripe, or KYC provider is involved.

```bash
npm run test:e2e              # everything, every configured browser
npm run test:e2e:responsive   # overflow matrix only (Chromium)
npm run test:e2e:a11y         # axe + keyboard/focus (Chromium)
npm run test:e2e:ui           # interactive runner
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

`personas.ts` describes the API test identities used by journey setup. The
frontend never reads personas from local storage.

## Browsers

Chromium runs the full suite. WebKit and Firefox run the journey and
accessibility specs, where engine differences actually bite (sticky headers,
`dvh`, focus handling in overlays).

> **Firefox on macOS 26+/Darwin 27:** Playwright's bundled Firefox currently
> fails to start its headless compositor on this host
> (`RenderCompositorSWGL failed mapping default framebuffer`) and times out on
> any navigation, including `about:blank`. It is kept in the project list so CI
> covers it; locally, use `--project=chromium --project=webkit`.
