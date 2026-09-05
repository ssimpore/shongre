# SEO and generative discovery architecture

## Scope and guarantees

Shongre uses one public-discovery architecture for classical search engines and
answer engines. It improves eligibility, crawlability, entity clarity and
citation quality; it never promises rankings, inclusion, citations or traffic.
Business authorization, privacy and anti-abuse controls remain authoritative
regardless of crawler directives.

The current Web architecture is Next.js 16 App Router with a server-rendered
catch-all entry point and a React Router compatibility shell. Public route data
is resolved before streaming so a missing entity can return a real 404 instead
of a soft 404. Mobile and backend consumers do not emit Web SEO metadata.

## Sources of truth

- `frontend/src/platform/seo/seo-policy.ts` owns route indexability, lifecycle,
  canonical URL, alternates, redirect, sitemap and structured-data eligibility.
- `frontend/src/platform/seo/discovery-governance.ts` and its narrow
  `discovery-structured-data.ts` / `discovery-referrers.ts` companions own
  crawler purposes, private crawl exclusions, stable SHONGRE. entity identity,
  AI-referral classification, webmaster token validation and the discovery-
  manifest format without shipping crawler policy in browser bundles.
- `packages/contracts/src/market-country.ts` owns market host/path resolution,
  public URLs, locale, currency and launch/indexing readiness.
- `frontend/src/platform/seo/server-public-route-data.ts` owns bounded,
  server-safe projections used by metadata, schemas and sitemaps.
- `frontend/src/platform/seo/sitemap-catalog.server.ts` owns the deterministic
  public sitemap groups.

Pages and components must not write titles, canonicals, robots tags or JSON-LD
directly. Server metadata uses the App Router metadata API. Client navigation
uses `usePageMeta()` through the shared SEO policy; static trust/legal pages use
`useStaticPageSeo()` so hydration cannot replace server metadata with a second
policy.

## Market topology and index policy

The country registry and URL builder produce the supported canonical topology:

| Context                    | Canonical shape            | Index policy                                   |
| -------------------------- | -------------------------- | ---------------------------------------------- |
| France                     | `https://shongre.fr/*`     | Eligible when active and legally approved      |
| Global gateway             | `https://shongre.com/`     | Country selection only; `x-default`            |
| Belgium                    | `https://shongre.com/be/*` | Eligible when active and approved              |
| Switzerland                | `https://shongre.com/ch/*` | Eligible when active and approved              |
| Senegal/Burkina Faso       | `/sn`, `/bf`               | Coming-soon and non-indexable until activation |
| Unknown/mismatched context | none                       | Reject or redirect to an exact canonical       |

Only production can be indexed. Local, test, preview, development and staging
emit response-level `noindex, nofollow, noarchive`, disallow all crawlers, and
return 404 for sitemaps and `llms.txt`.

Arbitrary search, sorting, tracking parameters, UI state and uncontrolled
facets are `noindex, follow` with a clean canonical. Category, collection,
professional, listing and job URLs become indexable only when the shared policy
confirms market availability, lifecycle and minimum content/inventory quality.
Do not generate category-by-location or editorial pages merely to increase URL
count. Add a `locations` or `editorial` sitemap group only after a canonical
content model provides unique, maintained and useful pages.

## Crawler and model-use governance

Crawler purpose is explicit and independent:

| Purpose                  | Agents                                                     | Production policy                                                  |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Search discovery         | `OAI-SearchBot`, `PerplexityBot`, ordinary search crawlers | Public canonical paths allowed                                     |
| User-triggered retrieval | `ChatGPT-User`, `Perplexity-User`                          | Public canonical paths allowed                                     |
| Model training           | `GPTBot`                                                   | Denied by default; controlled only by `SEO_GPTBOT_TRAINING_POLICY` |

Every crawler is denied on account, authentication, publication, messaging,
payment, verification, API and administration prefixes. `robots.txt` is only a
cooperation signal: it neither authenticates a crawler nor protects private
data.

Production CDN/WAF configuration must verify requests that claim a recognized
agent against the provider's current published IP data before granting a
bot-specific allowlist or rate-limit exception. The typed registry records the
official endpoints (`openai.com/searchbot.json`, `openai.com/gptbot.json`, and
the Perplexity bot/user endpoints). Fetch these at the edge on a controlled
refresh schedule, validate their schema, retain the last known-good set and
alert on refresh failure. Never hardcode an IP snapshot in application source,
never trust the user-agent alone, and never bypass route authorization for a
verified bot.

## Entity, content and structured data

`SHONGRE.` has one stable entity identifier:
`https://shongre.com/#organization`. Each market WebSite has its own stable
`#website` identifier and references that Organization as publisher. Configured
HTTPS social profiles become `sameAs`; empty or invalid URLs are omitted rather
than fabricated.

The public `/a-propos`, `/contact`, `/securite`, `/aide`, legal, privacy, terms
and accessibility pages provide durable trust references. Schema is emitted
only when the same claim is visible and current:

- Organization and WebSite on the market home page;
- AboutPage, ContactPage or WebPage on applicable trust/legal pages;
- Product and Offer on active listing detail pages;
- JobPosting on active job pages;
- ProfilePage for available public sellers;
- CollectionPage, ItemList and BreadcrumbList where their visible content
  supports those types.

Never invent ratings, reviews, price, availability, dates, seller identity,
salary, location, authors, sources or update timestamps. Editorial or market
insight content requires a real owner, methodology, primary sources,
publication/update dates and correction process before it may be indexed or
added to a feed.

User-supplied outbound links are marked `ugc nofollow`; provider-owned and
SHONGRE.-owned references remain ordinary links only after URL validation.
Cloaking, hidden text, purchased links, private blog networks, fake reviews or
quotations, keyword stuffing, doorway pages and scaled low-value generated
content are prohibited. AI-assisted content must pass the same named ownership,
source, factual-review and correction workflow as other editorial content.

## Sitemaps and machine-readable discovery

Production sitemaps are same-host, XML-escaped, bounded and derived from the
same route policy. Current groups are static pages, categories, collections,
professionals, listings and jobs. Entries include a substantive last-modified
date where the domain projection provides one. Redirects, inactive resources,
private pages, arbitrary facets and wrong-market URLs are excluded.

`/llms.txt` is a small supplemental directory of canonical reference pages and
the sitemap. It does not duplicate listing content, grant access, replace
robots/canonicals/sitemaps, or create an indexing signal. It is intentionally
404 outside production and carries `X-Robots-Tag: noindex` itself.

No RSS or inventory feed is published today: the canonical HTML and bounded
sitemaps already own discovery, and no distinct subscriber use case justifies a
second freshness surface. A future feed requires an explicit owner, bounded
scope, stable identifiers and the same lifecycle and market exclusions.

## Measurement and verification

Answer-engine referrals are classified centrally as `organic_ai` when the
referrer is ChatGPT, Perplexity, Copilot or Gemini. Explicit UTM attribution
wins; OpenAI's `utm_source=chatgpt.com` is therefore retained. Collection still
requires analytics consent and respects privacy signals. Existing analytics
and Search Console ingestion own reporting and must not log prompts, private
URLs, user content or crawler request bodies.

Before production activation:

1. Set `SEO_GOOGLE_SITE_VERIFICATION` and `SEO_BING_SITE_VERIFICATION` from the
   verified production property; never copy staging tokens by assumption.
2. Configure `SEARCH_CONSOLE_SITE_URLS` for every canonical production origin
   and complete provider ownership outside Git.
3. Verify the CDN/WAF crawler IP rules against current official endpoints.
4. Submit each same-host sitemap in Google Search Console and Bing Webmaster
   Tools, then record coverage errors and crawl anomalies in operational
   dashboards.
5. Establish a dated baseline for indexed canonical URLs, valid rich results,
   non-brand impressions/clicks, answer-engine referral sessions, crawler
   status-code distribution, LCP, INP, CLS and TTFB. Compare like-for-like
   market/route cohorts; do not attribute ranking changes without evidence.

## Commands and release gate

```bash
make seo-check
make frontend-typecheck
make frontend-lint
make frontend-test
make frontend-build
SEO_ORIGIN=https://canonical-host.example make seo-audit
```

`make seo-check` is part of lint and CI. It rejects missing crawler purpose
rules, private-path crawl drift and disconnected discovery integrations. The
live audit reads robots, sitemaps, `llms.txt`, metadata, canonicals, hreflang,
JSON-LD, status codes and representative internal links. Browser tests cover
initial HTML, hydration, facets, schema, redirects, real 404s and lower-
environment blocking.

Production credentials, DNS verification, search-console ownership, CDN/WAF
changes and submitting sitemaps remain manual operational actions because this
repository does not authorize mutations to those external systems.
