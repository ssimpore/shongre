# Seller automation, assistive AI and Web Push

Three cross-cutting additions dated 2026-09-16. Each one follows the
OpenAPI-first rule and exists in both repository families; nothing here is a
runtime fallback.

## Seller automation (`00144_seller_automation.sql`)

- **Auto-renew.** A seller opts a listing in (`autoRenew` on the seller
  update). The `seller_automation` scheduled job runs before expiry cleanup and
  calls `renew_expiring_listings`, which extends a publication that expires
  within 24 hours by one cycle, at most `LISTING_AUTO_RENEW_MAX_CYCLES` (3)
  times, and stamps `last_renewed_at`. Renewal keeps the listing's organic
  freshness untouched: it is not a bump. Expired listings that were not renewed
  notify their seller (`listing_expired`).
- **Scheduled publishing.** A draft may carry `scheduledPublishAt`, at least 15
  minutes and at most 30 days ahead; `publish_scheduled_listings` publishes it
  in the same job and the seller is notified. A scheduled listing is invisible
  until then, exactly like a draft.
- **Away mode.** `PUT /account/away` with `until` (and an optional message of
  300 characters) pauses every active publication of the seller
  (`paused_reason = 'seller_away'`) and shows the absence on the profile, the
  listings and in conversations; `until: null` resumes them at once.
  `resume_returned_sellers` resumes sellers whose date has passed. Only
  publications paused _by away mode_ are resumed; a moderation pause stays.
  `public_profiles` exposes `away_until` and `away_message`.

## Assistive AI (`00145_price_comparables_and_message_safety.sql`)

Every AI output is advisory: the seller edits the prefilled draft, the buyer
reads a warning, nothing is blocked or auto-published.

- **Photo → draft.** `POST /ai/listing-from-photos` describes the photos (demo
  provider: filename and label matching; Gemini provider in production) and
  returns a suggested category, title, attributes and condition, with a
  confidence the wizard shows.
- **Price estimate.** `GET /listings/price-estimate` returns the quartiles of
  what comparable listings _sold_ for in the last 180 days
  (`estimate_listing_price`), narrowed by brand, model and condition while the
  sample stays at least five sales; below that it falls back to asking prices
  and says so (`basis`). `listings.sold_at` is stamped once by trigger so the
  window is honest.
- **Message safety.** Each sent message is screened against
  `MESSAGE_SAFETY_RULES` (off-platform payment, external links, urgency,
  requests for credentials). Flags are stored in `messages.safety_flags`, so the
  warning is identical on every device and after reload. Delivery is never
  delayed or blocked by the screening.

## Web Push (`00146_web_push_devices.sql`)

Browsers register a Web Push subscription as a device with `platform = "web"`
(`POST /notifications/devices`); the serialized subscription sits where a
phone stores its Expo token, so the pipeline keeps one `push` channel and one
preference. `GET /notifications/web-push/config` exposes the VAPID public key;
the private key and the subscriptions are server-side only. The composite
push provider routes Expo tokens to Expo and subscriptions to `web-push`;
a `410 Gone` from the push service unregisters the device. Configure
`WEB_PUSH_SUBJECT`, `WEB_PUSH_VAPID_PUBLIC_KEY` and
`WEB_PUSH_VAPID_PRIVATE_KEY` (generate a pair with `make web-push-keys`);
without them the Web channel is reported unavailable and the panel does not
offer it. The service worker is `frontend/public/sw.js`; logout unregisters
the subscription.

## Verification

- `make backend-test`: `search-suggestions`, `review-interactions`,
  `seller-automation`, `ai-assistance`, `web-push` suites and the contract
  consumer test.
- `make test-web-database-mode`: the `database-mode-journeys.spec.ts` seller
  automation block (away mode and auto-renew) against Postgres.
- `backend/tests/rls/marketplace-automation-migrations.test.ts`: grant, RLS
  and trigger safeguards of migrations `00142`–`00146`.
