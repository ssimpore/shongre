-- Unsupported is distinct from a temporarily disabled configured market. It
-- renders the same fail-closed public experience but remains explicit policy.
ALTER TABLE public.markets
  DROP CONSTRAINT IF EXISTS markets_launch_status_check,
  ADD CONSTRAINT markets_launch_status_check CHECK (
    launch_status IN (
      'disabled', 'unsupported', 'coming_soon', 'private_beta',
      'beta', 'active', 'paused'
    )
  );
