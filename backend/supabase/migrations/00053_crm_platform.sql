-- Generic, tenant-scoped CRM bounded domain. Shongre marketplace records are
-- linked through crm_external_references; CRM Core never owns marketplace or
-- billing source-of-truth rows.

CREATE TABLE IF NOT EXISTS public.crm_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  default_currency CHAR(3) NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_workspaces_one_default_idx
  ON public.crm_workspaces (tenant_id) WHERE is_default AND is_active;

CREATE TABLE IF NOT EXISTS public.crm_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  market_codes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
CREATE INDEX IF NOT EXISTS crm_teams_tenant_workspace_idx ON public.crm_teams (tenant_id, workspace_id);

CREATE TABLE IF NOT EXISTS public.crm_team_members (
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  team_id UUID NOT NULL REFERENCES public.crm_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','member','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS crm_team_members_tenant_user_idx ON public.crm_team_members (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS public.crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_team_id UUID REFERENCES public.crm_teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  legal_name TEXT,
  website TEXT,
  domain TEXT,
  industry TEXT,
  description TEXT,
  email TEXT,
  phone TEXT,
  country CHAR(2) NOT NULL DEFAULT 'FR',
  region TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  lifecycle TEXT NOT NULL DEFAULT 'prospect'
    CHECK (lifecycle IN ('lead','prospect','qualified','customer','partner','do_not_contact','archived')),
  fit_score SMALLINT CHECK (fit_score BETWEEN 0 AND 100),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','import','inbound','referral','event','ai_research','shongre_adapter','external_api')),
  source_detail TEXT,
  custom_values JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(custom_values) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS crm_accounts_tenant_workspace_updated_idx
  ON public.crm_accounts (tenant_id, workspace_id, updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_accounts_tenant_owner_idx ON public.crm_accounts (tenant_id, owner_id) WHERE owner_id IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_accounts_tenant_lifecycle_idx ON public.crm_accounts (tenant_id, lifecycle) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_accounts_domain_idx ON public.crm_accounts (tenant_id, lower(domain)) WHERE domain IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_accounts_name_trgm_idx ON public.crm_accounts USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_team_id UUID REFERENCES public.crm_teams(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 120),
  last_name TEXT NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 120),
  full_name TEXT GENERATED ALWAYS AS (trim(first_name || ' ' || last_name)) STORED,
  job_title TEXT,
  department TEXT,
  email TEXT,
  normalized_email TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  phone TEXT,
  normalized_phone TEXT GENERATED ALWAYS AS (regexp_replace(coalesce(phone,''), '[^0-9+]', '', 'g')) STORED,
  language TEXT,
  timezone TEXT,
  country CHAR(2) NOT NULL DEFAULT 'FR',
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email','phone','sms','marketplace')),
  lifecycle TEXT NOT NULL DEFAULT 'prospect'
    CHECK (lifecycle IN ('lead','prospect','qualified','customer','partner','do_not_contact','archived')),
  lead_status TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','import','inbound','referral','event','ai_research','shongre_adapter','external_api')),
  source_detail TEXT,
  do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,
  custom_values JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(custom_values) = 'object'),
  last_contacted_at TIMESTAMPTZ,
  next_contact_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS crm_contacts_tenant_workspace_updated_idx
  ON public.crm_contacts (tenant_id, workspace_id, updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_contacts_tenant_owner_idx ON public.crm_contacts (tenant_id, owner_id) WHERE owner_id IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_contacts_email_idx ON public.crm_contacts (tenant_id, normalized_email) WHERE normalized_email IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_contacts_phone_idx ON public.crm_contacts (tenant_id, normalized_phone) WHERE normalized_phone <> '' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_contacts_name_trgm_idx ON public.crm_contacts USING gin (full_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.crm_contact_accounts (
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  relationship_role TEXT NOT NULL DEFAULT 'Employee',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, account_id, relationship_role)
);
CREATE INDEX IF NOT EXISTS crm_contact_accounts_tenant_account_idx ON public.crm_contact_accounts (tenant_id, account_id);

CREATE TABLE IF NOT EXISTS public.crm_account_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  source_account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  target_account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  relationship_role TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_account_id <> target_account_id),
  UNIQUE (source_account_id, target_account_id, relationship_role)
);
CREATE INDEX IF NOT EXISTS crm_account_relationships_tenant_target_idx ON public.crm_account_relationships (tenant_id, target_account_id);

CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_pipelines_one_default_idx ON public.crm_pipelines (workspace_id) WHERE is_default AND is_active;
CREATE INDEX IF NOT EXISTS crm_pipelines_tenant_workspace_idx ON public.crm_pipelines (tenant_id, workspace_id, is_active);

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  position INTEGER NOT NULL CHECK (position >= 0),
  default_probability SMALLINT NOT NULL CHECK (default_probability BETWEEN 0 AND 100),
  color_token TEXT NOT NULL DEFAULT 'neutral',
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  required_fields TEXT[] NOT NULL DEFAULT '{}',
  sla_hours INTEGER CHECK (sla_hours IS NULL OR sla_hours > 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT (is_won AND is_lost)),
  CHECK (NOT ((is_won OR is_lost) AND is_open)),
  UNIQUE (pipeline_id, position),
  UNIQUE (pipeline_id, name)
);
CREATE INDEX IF NOT EXISTS crm_pipeline_stages_tenant_pipeline_idx ON public.crm_pipeline_stages (tenant_id, pipeline_id, position);

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.crm_teams(id) ON DELETE SET NULL,
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE RESTRICT,
  stage_id UUID NOT NULL REFERENCES public.crm_pipeline_stages(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  description TEXT,
  amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  currency CHAR(3) NOT NULL,
  probability SMALLINT NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  forecast_category TEXT NOT NULL DEFAULT 'pipeline'
    CHECK (forecast_category IN ('pipeline','best_case','commit','closed','omitted')),
  expected_close_date DATE,
  next_step TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','import','inbound','referral','event','ai_research','shongre_adapter','external_api')),
  source_detail TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','archived')),
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  loss_reason TEXT,
  loss_detail TEXT,
  competitor TEXT,
  future_recontact_date DATE,
  recurring_value_minor BIGINT CHECK (recurring_value_minor IS NULL OR recurring_value_minor >= 0),
  renewal_date DATE,
  onboarding_status TEXT,
  custom_values JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(custom_values) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CHECK ((status = 'won') = (won_at IS NOT NULL)),
  CHECK ((status = 'lost') = (lost_at IS NOT NULL)),
  CHECK (status <> 'won' OR lost_at IS NULL),
  CHECK (status <> 'lost' OR won_at IS NULL)
);
CREATE INDEX IF NOT EXISTS crm_opportunities_tenant_pipeline_stage_idx
  ON public.crm_opportunities (tenant_id, pipeline_id, stage_id, updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_opportunities_tenant_owner_idx ON public.crm_opportunities (tenant_id, owner_id, status) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_opportunities_tenant_close_idx ON public.crm_opportunities (tenant_id, expected_close_date) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS crm_opportunities_account_idx ON public.crm_opportunities (account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_opportunities_name_trgm_idx ON public.crm_opportunities USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.crm_contact_opportunities (
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  relationship_role TEXT NOT NULL DEFAULT 'Stakeholder',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, opportunity_id, relationship_role)
);
CREATE INDEX IF NOT EXISTS crm_contact_opportunities_tenant_opportunity_idx ON public.crm_contact_opportunities (tenant_id, opportunity_id);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.crm_teams(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  start_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  completion_result TEXT,
  reminders JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(reminders) = 'array'),
  recurrence JSONB CHECK (recurrence IS NULL OR jsonb_typeof(recurrence) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS crm_tasks_tenant_owner_due_idx ON public.crm_tasks (tenant_id, owner_id, due_at) WHERE status IN ('pending','in_progress');
CREATE INDEX IF NOT EXISTS crm_tasks_tenant_team_due_idx ON public.crm_tasks (tenant_id, team_id, due_at) WHERE team_id IS NOT NULL AND status IN ('pending','in_progress');
CREATE INDEX IF NOT EXISTS crm_tasks_opportunity_idx ON public.crm_tasks (opportunity_id, due_at DESC) WHERE opportunity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact','opportunity','task')),
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'ACCOUNT_CREATED','CONTACT_CREATED','NOTE_CREATED','CALL_COMPLETED','EMAIL_SENT','EMAIL_RECEIVED',
    'MEETING_CREATED','MEETING_COMPLETED','TASK_CREATED','TASK_COMPLETED','OPPORTUNITY_CREATED',
    'STAGE_CHANGED','OPPORTUNITY_WON','OPPORTUNITY_LOST','OWNER_CHANGED','AI_ENRICHMENT',
    'AI_RECOMMENDATION','EXTERNAL_EVENT'
  )),
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  external_message_id TEXT,
  external_thread_id TEXT,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_connection_id, external_message_id)
);
CREATE INDEX IF NOT EXISTS crm_activities_tenant_entity_time_idx ON public.crm_activities (tenant_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS crm_activities_external_thread_idx ON public.crm_activities (provider_connection_id, external_thread_id) WHERE external_thread_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact','opportunity','task')),
  entity_id UUID NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 50000),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_notes_tenant_entity_idx ON public.crm_notes (tenant_id, entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact','opportunity','task','note')),
  entity_id UUID NOT NULL,
  storage_object_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_attachments_tenant_entity_idx ON public.crm_attachments (tenant_id, entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  color_token TEXT NOT NULL DEFAULT 'neutral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE TABLE IF NOT EXISTS public.crm_entity_tags (
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact','opportunity')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tag_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS crm_entity_tags_tenant_entity_idx ON public.crm_entity_tags (tenant_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.crm_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact','opportunity','task')),
  name TEXT NOT NULL,
  key TEXT NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{1,62}$'),
  description TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'text','textarea','integer','decimal','money','percentage','boolean','date','datetime','email','phone','url',
    'single_select','multi_select','user','account','contact'
  )),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validation) = 'object'),
  options JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options) = 'array'),
  default_value JSONB,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entity_type, key)
);
CREATE INDEX IF NOT EXISTS crm_custom_fields_tenant_entity_idx ON public.crm_custom_field_definitions (tenant_id, entity_type, position);

CREATE TABLE IF NOT EXISTS public.crm_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact','opportunity','task')),
  name TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('personal','team','workspace','tenant')),
  team_id UUID REFERENCES public.crm_teams(id) ON DELETE CASCADE,
  filter_definition JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filter_definition) = 'object'),
  sort_definition JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sort_definition) = 'array'),
  visible_columns TEXT[] NOT NULL DEFAULT '{}',
  column_order TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_saved_views_tenant_entity_idx ON public.crm_saved_views (tenant_id, entity_type, visibility);

CREATE TABLE IF NOT EXISTS public.crm_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('subscription','advertising','service','license','credits','pack','one_time')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);
CREATE TABLE IF NOT EXISTS public.crm_price_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  market_code CHAR(2) REFERENCES public.markets(code) ON DELETE RESTRICT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name, currency)
);
CREATE TABLE IF NOT EXISTS public.crm_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  price_book_id UUID NOT NULL REFERENCES public.crm_price_books(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.crm_products(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency CHAR(3) NOT NULL,
  billing_interval TEXT CHECK (billing_interval IN ('one_time','month','quarter','year')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (price_book_id, product_id, billing_interval, starts_at)
);
CREATE INDEX IF NOT EXISTS crm_prices_tenant_product_idx ON public.crm_prices (tenant_id, product_id);

CREATE TABLE IF NOT EXISTS public.crm_opportunity_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.crm_products(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  quantity NUMERIC(16,4) NOT NULL CHECK (quantity > 0),
  unit_amount_minor BIGINT NOT NULL CHECK (unit_amount_minor >= 0),
  discount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
  currency CHAR(3) NOT NULL,
  recurring_interval TEXT CHECK (recurring_interval IN ('month','quarter','year')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_opportunity_line_items_tenant_opp_idx ON public.crm_opportunity_line_items (tenant_id, opportunity_id, position);

CREATE TABLE IF NOT EXISTS public.crm_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE RESTRICT,
  opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor >= 0),
  discount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  tax_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','cancelled')),
  valid_until DATE,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, quote_number)
);
CREATE INDEX IF NOT EXISTS crm_quotes_tenant_opportunity_idx ON public.crm_quotes (tenant_id, opportunity_id, created_at DESC) WHERE opportunity_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.crm_quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  quote_id UUID NOT NULL REFERENCES public.crm_quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.crm_products(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  quantity NUMERIC(16,4) NOT NULL CHECK (quantity > 0),
  unit_amount_minor BIGINT NOT NULL CHECK (unit_amount_minor >= 0),
  discount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  tax_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS crm_quote_line_items_tenant_quote_idx ON public.crm_quote_line_items (tenant_id, quote_id, position);

CREATE TABLE IF NOT EXISTS public.crm_external_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  crm_entity_type TEXT NOT NULL CHECK (crm_entity_type IN ('account','contact','opportunity','task')),
  crm_entity_id UUID NOT NULL,
  source_system TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source_system, source_entity_type, source_entity_id),
  UNIQUE (tenant_id, crm_entity_type, crm_entity_id, source_system)
);
CREATE INDEX IF NOT EXISTS crm_external_references_entity_idx ON public.crm_external_references (tenant_id, crm_entity_type, crm_entity_id);

CREATE TABLE IF NOT EXISTS public.crm_duplicate_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact')),
  candidate_entity_id UUID NOT NULL,
  matched_entity_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('possible_duplicate','merge','ignore','never_merge')),
  signals JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(signals) = 'array'),
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (candidate_entity_id <> matched_entity_id),
  UNIQUE (tenant_id, entity_type, candidate_entity_id, matched_entity_id)
);

CREATE TABLE IF NOT EXISTS public.crm_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','phone','sms','marketplace','push')),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('granted','refused','withdrawn','not_asked')),
  legal_basis TEXT NOT NULL,
  source TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  captured_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, contact_id, channel, purpose)
);
CREATE INDEX IF NOT EXISTS crm_consents_tenant_contact_idx ON public.crm_consents (tenant_id, contact_id);

CREATE TABLE IF NOT EXISTS public.crm_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','disabled')),
  trigger_definition JSONB NOT NULL CHECK (jsonb_typeof(trigger_definition) = 'object'),
  condition_definition JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(condition_definition) = 'object'),
  action_definition JSONB NOT NULL CHECK (jsonb_typeof(action_definition) = 'array'),
  max_execution_depth SMALLINT NOT NULL DEFAULT 8 CHECK (max_execution_depth BETWEEN 1 AND 32),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crm_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workflow_id UUID NOT NULL REFERENCES public.crm_workflows(id) ON DELETE RESTRICT,
  workflow_version INTEGER NOT NULL,
  trigger_event_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  depth SMALLINT NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 32),
  status TEXT NOT NULL CHECK (status IN ('queued','running','succeeded','failed','cancelled','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  safe_error_code TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS crm_workflow_runs_queue_idx ON public.crm_workflow_runs (status, created_at) WHERE status IN ('queued','failed');

CREATE TABLE IF NOT EXISTS public.crm_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','disabled')),
  stop_conditions TEXT[] NOT NULL DEFAULT ARRAY['reply','opt_out','do_not_contact','opportunity_won','manual_stop']::text[],
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.crm_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  sequence_id UUID NOT NULL REFERENCES public.crm_sequences(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  delay_minutes INTEGER NOT NULL CHECK (delay_minutes >= 0),
  action_type TEXT NOT NULL CHECK (action_type IN ('email','call_task','manual_task','notification')),
  action_configuration JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(action_configuration) = 'object'),
  UNIQUE (sequence_id, position)
);
CREATE INDEX IF NOT EXISTS crm_sequence_steps_tenant_sequence_idx ON public.crm_sequence_steps (tenant_id, sequence_id, position);
CREATE TABLE IF NOT EXISTS public.crm_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  sequence_id UUID NOT NULL REFERENCES public.crm_sequences(id) ON DELETE RESTRICT,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('active','paused','completed','stopped','failed')),
  next_step_position INTEGER NOT NULL DEFAULT 0 CHECK (next_step_position >= 0),
  next_run_at TIMESTAMPTZ,
  stop_reason TEXT,
  idempotency_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS crm_sequence_enrollments_due_idx ON public.crm_sequence_enrollments (status, next_run_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.crm_data_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('import','export','privacy_export','anonymization')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact','opportunity')),
  status TEXT NOT NULL CHECK (status IN ('queued','validating','preview_ready','running','completed','failed','cancelled')),
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  storage_object_key TEXT,
  mapping JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(mapping) = 'object'),
  safe_summary JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_summary) = 'object'),
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS crm_data_jobs_queue_idx ON public.crm_data_jobs (status, created_at) WHERE status IN ('queued','validating','running');

CREATE TABLE IF NOT EXISTS public.crm_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  safe_context JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_context) = 'object'),
  correlation_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_audit_events_tenant_time_idx ON public.crm_audit_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS crm_audit_events_entity_idx ON public.crm_audit_events (tenant_id, entity_type, entity_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.is_crm_tenant_member(requested_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members member
    WHERE member.organization_id = requested_tenant_id
      AND member.user_id = (SELECT public.current_profile_id())
      AND member.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.touch_crm_record()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_crm_opportunity_stage()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE selected_stage public.crm_pipeline_stages%ROWTYPE;
BEGIN
  SELECT * INTO selected_stage FROM public.crm_pipeline_stages WHERE id = NEW.stage_id;
  IF selected_stage.id IS NULL OR selected_stage.pipeline_id <> NEW.pipeline_id OR selected_stage.tenant_id <> NEW.tenant_id THEN
    RAISE EXCEPTION 'CRM stage does not belong to the opportunity pipeline and tenant';
  END IF;
  IF selected_stage.is_won AND NEW.status <> 'won' THEN RAISE EXCEPTION 'Won stage requires won status'; END IF;
  IF selected_stage.is_lost AND NEW.status <> 'lost' THEN RAISE EXCEPTION 'Lost stage requires lost status'; END IF;
  IF selected_stage.is_open AND NEW.status <> 'open' THEN RAISE EXCEPTION 'Open stage requires open status'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS crm_opportunities_validate_stage ON public.crm_opportunities;
CREATE TRIGGER crm_opportunities_validate_stage BEFORE INSERT OR UPDATE OF stage_id, pipeline_id, tenant_id, status
  ON public.crm_opportunities FOR EACH ROW EXECUTE FUNCTION public.validate_crm_opportunity_stage();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'crm_workspaces','crm_teams','crm_accounts','crm_contacts','crm_pipelines','crm_pipeline_stages',
    'crm_opportunities','crm_tasks','crm_notes','crm_custom_field_definitions','crm_saved_views','crm_products',
    'crm_quotes','crm_external_references','crm_consents','crm_workflows','crm_sequences','crm_sequence_enrollments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_crm_record()', table_name, table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_crm_history_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'CRM activity and audit history is immutable';
END;
$$;
DROP TRIGGER IF EXISTS crm_activities_immutable ON public.crm_activities;
CREATE TRIGGER crm_activities_immutable BEFORE UPDATE OR DELETE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_history_mutation();
DROP TRIGGER IF EXISTS crm_audit_events_immutable ON public.crm_audit_events;
CREATE TRIGGER crm_audit_events_immutable BEFORE UPDATE OR DELETE ON public.crm_audit_events FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_history_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'crm_workspaces','crm_teams','crm_team_members','crm_accounts','crm_contacts','crm_contact_accounts',
    'crm_account_relationships','crm_pipelines','crm_pipeline_stages','crm_opportunities','crm_contact_opportunities',
    'crm_tasks','crm_activities','crm_notes','crm_attachments','crm_tags','crm_entity_tags',
    'crm_custom_field_definitions','crm_saved_views','crm_products','crm_price_books','crm_prices',
    'crm_opportunity_line_items','crm_quotes','crm_quote_line_items','crm_external_references',
    'crm_duplicate_decisions','crm_consents','crm_workflows','crm_workflow_runs','crm_sequences',
    'crm_sequence_steps','crm_sequence_enrollments','crm_data_jobs','crm_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I_tenant_isolation ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_crm_tenant_member(tenant_id))) WITH CHECK ((SELECT public.is_crm_tenant_member(tenant_id)))',
      table_name, table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
  END LOOP;
END $$;

REVOKE UPDATE, DELETE ON public.crm_activities, public.crm_audit_events FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.crm_activities, public.crm_audit_events FROM authenticated;
REVOKE ALL ON FUNCTION public.is_crm_tenant_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_crm_tenant_member(UUID) TO authenticated;
