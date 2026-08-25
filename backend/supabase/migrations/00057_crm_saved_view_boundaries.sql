-- Saved views are a backend-owned CRM resource. Visibility and ownership are
-- enforced by the application service; browser clients never receive direct
-- table privileges.

ALTER TABLE public.crm_saved_views
  DROP CONSTRAINT IF EXISTS crm_saved_views_visibility_scope_check;

ALTER TABLE public.crm_saved_views
  ADD CONSTRAINT crm_saved_views_visibility_scope_check CHECK (
    (visibility = 'personal' AND owner_id IS NOT NULL AND team_id IS NULL)
    OR (visibility = 'team' AND team_id IS NOT NULL)
    OR (visibility IN ('workspace', 'tenant') AND team_id IS NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS crm_saved_views_personal_name_uidx
  ON public.crm_saved_views (tenant_id, workspace_id, owner_id, entity_type, lower(name))
  WHERE visibility = 'personal';

CREATE UNIQUE INDEX IF NOT EXISTS crm_saved_views_team_name_uidx
  ON public.crm_saved_views (tenant_id, workspace_id, team_id, entity_type, lower(name))
  WHERE visibility = 'team';

CREATE UNIQUE INDEX IF NOT EXISTS crm_saved_views_workspace_name_uidx
  ON public.crm_saved_views (tenant_id, workspace_id, entity_type, lower(name))
  WHERE visibility = 'workspace';

CREATE UNIQUE INDEX IF NOT EXISTS crm_saved_views_tenant_name_uidx
  ON public.crm_saved_views (tenant_id, entity_type, lower(name))
  WHERE visibility = 'tenant';

DROP POLICY IF EXISTS crm_saved_views_tenant_isolation
  ON public.crm_saved_views;

REVOKE ALL ON TABLE public.crm_saved_views FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_saved_views TO service_role;

COMMENT ON TABLE public.crm_saved_views IS
  'Backend-owned tenant CRM views. Personal/team visibility is resolved in CrmService and CrmRepository.';
