-- Browsers can receive push too. A Web Push subscription is a device like a
-- phone: registered per account, removed on logout, gone when the browser
-- revokes it. It joins the existing device table under its own platform,
-- with the serialized subscription where a phone stores its Expo token, so
-- the notification pipeline keeps one `push` channel and one preference.
--
-- The subscription's endpoint and keys are a capability to reach exactly
-- one browser profile; they are stored server-side only and never read back
-- through the API.

ALTER TABLE public.push_device_tokens
  DROP CONSTRAINT IF EXISTS push_device_tokens_platform_check;
ALTER TABLE public.push_device_tokens
  ADD CONSTRAINT push_device_tokens_platform_check
  CHECK (platform IN ('ios', 'android', 'web'));

-- Web subscriptions are long JSON strings; the unique index on `token`
-- still applies, and the worker reads them by account.
CREATE INDEX IF NOT EXISTS push_device_tokens_user_platform_idx
  ON public.push_device_tokens (user_id, platform, last_seen_at DESC);
