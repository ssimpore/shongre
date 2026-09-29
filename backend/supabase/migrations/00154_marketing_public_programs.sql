-- The public Shongre newsletter of a market is an explicit designation, not
-- whichever marketing workspace happened to be created first in that market.
-- Every professional tenant is provisioned a workspace the first time it opens
-- the marketing tools, so the first customer to do so in a market would have
-- received every public signup — with its consent evidence — for Shongre's own
-- newsletter. A market without a designated workspace has no public programme:
-- signup, preferences and unsubscription answer "unavailable" rather than
-- writing into a tenant nobody chose.
--
-- Nothing is backfilled. Operators designate the platform-owned workspace per
-- market (docs: backend/docs/marketing-platform.md).
ALTER TABLE public.marketing_workspaces
  ADD CONSTRAINT marketing_workspaces_id_market_key UNIQUE (id, market_code);

CREATE TABLE public.marketing_public_programs (
  market_code CHAR(2) PRIMARY KEY REFERENCES public.markets(code) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL UNIQUE,
  designated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  designated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The workspace must serve the market it is designated for.
  FOREIGN KEY (workspace_id, market_code)
    REFERENCES public.marketing_workspaces(id, market_code) ON DELETE RESTRICT
);

ALTER TABLE public.marketing_public_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_public_programs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketing_public_programs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_public_programs TO service_role;
