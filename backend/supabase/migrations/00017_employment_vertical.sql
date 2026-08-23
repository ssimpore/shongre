-- =============================================================================
-- SHONGRE EMPLOI — NORMALIZED EMPLOYMENT VERTICAL
-- Migration 00017 (expand-only; see backend/docs/employment-migration-rollback.md)
-- =============================================================================

INSERT INTO public.vertical_definitions (type, current_schema_version, public_name, configuration)
VALUES (
  'employment', 1, 'Shongre Emploi',
  '{"compatibleWithGenericListings":true,"candidateFees":false,"normalizedSearch":true,"privateCandidateDocuments":true}'::jsonb
)
ON CONFLICT (type) DO UPDATE SET
  current_schema_version = EXCLUDED.current_schema_version,
  public_name = EXCLUDED.public_name,
  configuration = EXCLUDED.configuration,
  updated_at = NOW();

ALTER TABLE public.vertical_add_ons DROP CONSTRAINT IF EXISTS vertical_add_ons_type_check;
ALTER TABLE public.vertical_add_ons ADD CONSTRAINT vertical_add_ons_type_check CHECK (
  type IN (
    'urgent','search_bump','featured','homepage_spotlight','local_spotlight',
    'qualified_lead','sponsored_professional','additional_listing_credit',
    'additional_team_seat','extended_analytics','distribution_integration',
    'employer_brand_campaign'
  )
);

CREATE TABLE IF NOT EXISTS public.employment_market_configs (
  market_code VARCHAR(2) PRIMARY KEY REFERENCES public.markets(code) ON DELETE RESTRICT,
  schema_version INT NOT NULL CHECK (schema_version > 0),
  locale VARCHAR(16) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  timezone VARCHAR(80) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  default_publication_duration_days INT NOT NULL CHECK (default_publication_duration_days > 0),
  draft_retention_days INT NOT NULL CHECK (draft_retention_days > 0),
  application_retention_days INT NOT NULL CHECK (application_retention_days > 0),
  talent_pool_retention_days INT NOT NULL CHECK (talent_pool_retention_days > 0),
  application_resubmission_cooldown_days INT NOT NULL DEFAULT 0 CHECK (application_resubmission_cooldown_days >= 0),
  regulatory_content_version VARCHAR(100) NOT NULL,
  prohibited_language_policy_version VARCHAR(100) NOT NULL,
  prohibited_language_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_field_ids TEXT[] NOT NULL DEFAULT '{}',
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_dictionary_entries (
  id VARCHAR(180) PRIMARY KEY,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
  kind VARCHAR(40) NOT NULL CHECK (kind IN (
    'sector','job_family','profession','specialization','skill','seniority',
    'contract_type','salary_frequency','working_arrangement','work_schedule',
    'education_level','language_level','employer_type','screening_question_type'
  )),
  parent_id VARCHAR(180) REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  code VARCHAR(100) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  label VARCHAR(180) NOT NULL,
  description TEXT,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market_code, kind, code),
  UNIQUE (market_code, kind, slug)
);

CREATE TABLE IF NOT EXISTS public.employment_employer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  employer_type_id VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  display_name VARCHAR(180) NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  verification_level VARCHAR(30) NOT NULL DEFAULT 'self_declared' CHECK (verification_level IN (
    'self_declared','domain_verified','document_submitted','manually_verified',
    'provider_verified','expired','rejected'
  )),
  verification_expires_at TIMESTAMPTZ,
  verification_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended','closed')),
  brand_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (verification_level <> 'self_declared' OR verification_evidence = '{}'::jsonb)
);

CREATE TABLE IF NOT EXISTS public.employment_employer_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employment_employer_profiles(id) ON DELETE CASCADE,
  parent_branch_id UUID REFERENCES public.employment_employer_branches(id) ON DELETE RESTRICT,
  name VARCHAR(180) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  city VARCHAR(120) NOT NULL,
  postal_code VARCHAR(20),
  timezone VARCHAR(80) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_recruiter_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employment_employer_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL CHECK (role IN (
    'owner','billing_admin','recruitment_admin','recruiter','hiring_manager','interviewer','analyst'
  )),
  branch_ids UUID[] NOT NULL DEFAULT '{}',
  client_employer_ids UUID[] NOT NULL DEFAULT '{}',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended','revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employer_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.employment_job_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES public.employment_employer_profiles(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.employment_employer_branches(id) ON DELETE SET NULL,
  private_employer BOOLEAN NOT NULL DEFAULT FALSE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  schema_version INT NOT NULL CHECK (schema_version > 0),
  current_step INT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 13),
  completed_steps INT[] NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_offer_id VARCHAR(120),
  selected_add_on_ids TEXT[] NOT NULL DEFAULT '{}',
  duplicate_fingerprints TEXT[] NOT NULL DEFAULT '{}',
  validation_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_listing_id UUID UNIQUE REFERENCES public.listings(id) ON DELETE SET NULL,
  employer_id UUID NOT NULL REFERENCES public.employment_employer_profiles(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES public.employment_employer_branches(id) ON DELETE SET NULL,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  schema_version INT NOT NULL CHECK (schema_version > 0),
  slug VARCHAR(220) NOT NULL UNIQUE,
  reference VARCHAR(120),
  title VARCHAR(220) NOT NULL,
  profession_id VARCHAR(180) NOT NULL REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  specialization_id VARCHAR(180) REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  industry_id VARCHAR(180) NOT NULL REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  contract_type_id VARCHAR(180) NOT NULL REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  contract_duration_text VARCHAR(180),
  working_arrangement_id VARCHAR(180) NOT NULL REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  working_time_id VARCHAR(180) NOT NULL REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  work_schedule_ids TEXT[] NOT NULL DEFAULT '{}',
  positions_count INT NOT NULL DEFAULT 1 CHECK (positions_count > 0),
  weekly_hours NUMERIC(5,2) CHECK (weekly_hours IS NULL OR weekly_hours > 0),
  responsibilities TEXT[] NOT NULL CHECK (cardinality(responsibilities) > 0),
  qualification_summary TEXT,
  required_experience_id VARCHAR(180) REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  education_level_id VARCHAR(180) REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  certifications TEXT[] NOT NULL DEFAULT '{}',
  travel_requirement_id VARCHAR(180),
  accessibility_information TEXT,
  benefits TEXT[] NOT NULL DEFAULT '{}',
  trial_period_information TEXT,
  desired_start_date DATE,
  application_deadline TIMESTAMPTZ,
  recruitment_process TEXT[] NOT NULL DEFAULT '{}',
  application_method VARCHAR(30) NOT NULL CHECK (application_method IN ('shongre','external','contact_recruiter')),
  external_application_url TEXT,
  contact_preferences TEXT[] NOT NULL DEFAULT '{}',
  media JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifecycle VARCHAR(24) NOT NULL CHECK (lifecycle IN (
    'draft','pending_review','published','closed','expired','suspended','rejected','archived'
  )),
  moderation_status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','flagged')),
  moderation_reason TEXT,
  salary_minimum_minor BIGINT CHECK (salary_minimum_minor IS NULL OR salary_minimum_minor >= 0),
  salary_maximum_minor BIGINT CHECK (salary_maximum_minor IS NULL OR salary_maximum_minor >= 0),
  salary_currency VARCHAR(3),
  salary_frequency_id VARCHAR(180) REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  salary_presentation_id VARCHAR(80),
  salary_is_public BOOLEAN NOT NULL DEFAULT FALSE,
  salary_bonus_description TEXT,
  promotion JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_fingerprint VARCHAR(100) NOT NULL,
  risk_signals TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (salary_minimum_minor IS NULL OR salary_maximum_minor IS NULL OR salary_minimum_minor <= salary_maximum_minor),
  CHECK ((salary_minimum_minor IS NULL AND salary_maximum_minor IS NULL) OR salary_currency IS NOT NULL),
  CHECK (application_method = 'external' OR external_application_url IS NULL),
  UNIQUE (employer_id, reference)
);

CREATE TABLE IF NOT EXISTS public.employment_job_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE CASCADE,
  label VARCHAR(180) NOT NULL,
  city VARCHAR(120) NOT NULL,
  postal_code VARCHAR(20),
  country_code VARCHAR(2) NOT NULL,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS employment_job_one_primary_location_idx
  ON public.employment_job_locations(job_id) WHERE is_primary;

CREATE OR REPLACE FUNCTION public.employment_job_ids_within_radius(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION
)
RETURNS TABLE(job_id UUID, distance_km DOUBLE PRECISION)
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT ranked.job_id, ranked.distance_km
  FROM (
    SELECT
      location.job_id,
      6371.0 * ACOS(LEAST(1.0, GREATEST(-1.0,
        COS(RADIANS(p_latitude)) * COS(RADIANS(location.latitude::DOUBLE PRECISION)) *
        COS(RADIANS(location.longitude::DOUBLE PRECISION) - RADIANS(p_longitude)) +
        SIN(RADIANS(p_latitude)) * SIN(RADIANS(location.latitude::DOUBLE PRECISION))
      ))) AS distance_km
    FROM public.employment_job_locations location
    WHERE location.latitude IS NOT NULL
      AND location.longitude IS NOT NULL
      AND location.is_public
  ) ranked
  WHERE ranked.distance_km <= p_radius_km
  ORDER BY ranked.distance_km ASC;
$$;

CREATE TABLE IF NOT EXISTS public.employment_job_skills (
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE CASCADE,
  skill_id VARCHAR(180) NOT NULL REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  requirement VARCHAR(20) NOT NULL CHECK (requirement IN ('required','preferred')),
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (job_id, skill_id, requirement)
);

CREATE TABLE IF NOT EXISTS public.employment_job_languages (
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE CASCADE,
  language_id VARCHAR(20) NOT NULL,
  level_id VARCHAR(180) NOT NULL REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  label VARCHAR(180) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (job_id, language_id, level_id)
);

CREATE TABLE IF NOT EXISTS public.employment_screening_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE CASCADE,
  question_type_id VARCHAR(180) NOT NULL REFERENCES public.employment_dictionary_entries(id) ON DELETE RESTRICT,
  label TEXT NOT NULL,
  help_text TEXT,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  disqualifying_answer_ids TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  professional_title VARCHAR(180),
  summary TEXT,
  skill_ids TEXT[] NOT NULL DEFAULT '{}',
  experiences JSONB NOT NULL DEFAULT '[]'::jsonb,
  education JSONB NOT NULL DEFAULT '[]'::jsonb,
  certifications TEXT[] NOT NULL DEFAULT '{}',
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  desired_profession_ids TEXT[] NOT NULL DEFAULT '{}',
  desired_contract_type_ids TEXT[] NOT NULL DEFAULT '{}',
  preferred_location_ids TEXT[] NOT NULL DEFAULT '{}',
  remote_preference_id VARCHAR(180),
  salary_expectation JSONB,
  availability_date DATE,
  professional_links TEXT[] NOT NULL DEFAULT '{}',
  visibility VARCHAR(30) NOT NULL DEFAULT 'private' CHECK (visibility IN (
    'private','applications_only','verified_recruiters','hidden','deleted'
  )),
  recruiter_search_consent_id UUID,
  anonymized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_candidate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.employment_candidate_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('cv','portfolio','certificate','other')),
  label VARCHAR(180) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  private_storage_key TEXT NOT NULL UNIQUE,
  malware_scan_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (malware_scan_status IN ('pending','clean','rejected')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS employment_candidate_one_default_cv_idx
  ON public.employment_candidate_documents(candidate_id)
  WHERE document_type = 'cv' AND is_default AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.employment_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employment_employer_profiles(id) ON DELETE CASCADE,
  client_employer_id UUID REFERENCES public.employment_employer_profiles(id) ON DELETE RESTRICT,
  name VARCHAR(180) NOT NULL,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_default_pipeline_stages (
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
  code VARCHAR(40) NOT NULL,
  label VARCHAR(140) NOT NULL,
  system_state VARCHAR(20) NOT NULL CHECK (system_state IN (
    'received','active','interview','offer','hired','rejected','withdrawn','archived'
  )),
  candidate_visible_label VARCHAR(140) NOT NULL,
  sort_order INT NOT NULL,
  candidate_notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_required_system_stage BOOLEAN NOT NULL DEFAULT FALSE,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (market_code, code),
  UNIQUE (market_code, sort_order)
);

CREATE TABLE IF NOT EXISTS public.employment_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.employment_pipelines(id) ON DELETE CASCADE,
  label VARCHAR(140) NOT NULL,
  system_state VARCHAR(20) NOT NULL CHECK (system_state IN (
    'received','active','interview','offer','hired','rejected','withdrawn','archived'
  )),
  candidate_visible_label VARCHAR(140) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  candidate_notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_required_system_stage BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pipeline_id, sort_order)
);

CREATE OR REPLACE FUNCTION public.initialize_employment_employer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_pipeline_id UUID;
  employer_market_code VARCHAR(2);
BEGIN
  employer_market_code := COALESCE(
    (NEW.brand_settings ->> 'marketCode')::VARCHAR(2),
    'FR'
  );
  INSERT INTO public.employment_recruiter_memberships (
    employer_id, user_id, role, permissions, status
  ) VALUES (
    NEW.id,
    NEW.owner_user_id,
    'owner',
    ARRAY['job.manage','application.manage','pipeline.manage','team.manage','billing.manage','analytics.read'],
    'active'
  ) ON CONFLICT (employer_id, user_id) DO NOTHING;

  INSERT INTO public.employment_pipelines (employer_id, name, version, is_default)
  VALUES (NEW.id, 'Pipeline principal', 1, TRUE)
  RETURNING id INTO default_pipeline_id;

  INSERT INTO public.employment_pipeline_stages (
    pipeline_id, label, system_state, candidate_visible_label, sort_order,
    candidate_notification_enabled, is_required_system_stage
  )
  SELECT
    default_pipeline_id, label, system_state, candidate_visible_label, sort_order,
    candidate_notification_enabled, is_required_system_stage
  FROM public.employment_default_pipeline_stages
  WHERE market_code = employer_market_code AND is_active
  ORDER BY sort_order;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employment_initialize_employer_trigger ON public.employment_employer_profiles;
CREATE TRIGGER employment_initialize_employer_trigger
AFTER INSERT ON public.employment_employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.initialize_employment_employer();

CREATE TABLE IF NOT EXISTS public.employment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.employment_candidate_profiles(id) ON DELETE RESTRICT,
  cv_document_id UUID NOT NULL REFERENCES public.employment_candidate_documents(id) ON DELETE RESTRICT,
  cover_message TEXT CHECK (cover_message IS NULL OR char_length(cover_message) <= 4000),
  pipeline_id UUID NOT NULL REFERENCES public.employment_pipelines(id) ON DELETE RESTRICT,
  stage_id UUID NOT NULL REFERENCES public.employment_pipeline_stages(id) ON DELETE RESTRICT,
  system_state VARCHAR(20) NOT NULL CHECK (system_state IN (
    'received','active','interview','offer','hired','rejected','withdrawn','archived'
  )),
  candidate_visible_status VARCHAR(140) NOT NULL,
  privacy_policy_version VARCHAR(100) NOT NULL,
  consent_record_id UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  retention_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS employment_one_active_application_per_job_candidate_idx
  ON public.employment_applications(job_id, candidate_id)
  WHERE system_state NOT IN ('withdrawn','rejected','archived');

CREATE TABLE IF NOT EXISTS public.employment_screening_answers (
  application_id UUID NOT NULL REFERENCES public.employment_applications(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.employment_screening_questions(id) ON DELETE RESTRICT,
  answer JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (application_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.employment_recruiter_assignments (
  application_id UUID NOT NULL REFERENCES public.employment_applications(id) ON DELETE CASCADE,
  recruiter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (application_id, recruiter_user_id)
);

CREATE TABLE IF NOT EXISTS public.employment_recruiter_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.employment_applications(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  visibility VARCHAR(30) NOT NULL DEFAULT 'recruiters_only' CHECK (visibility = 'recruiters_only'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.employment_applications(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('in_person','telephone','video')),
  timezone VARCHAR(80) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('proposed','confirmed','rescheduled','cancelled','completed')),
  location_label TEXT,
  private_meeting_link TEXT,
  participant_user_ids UUID[] NOT NULL,
  candidate_message TEXT,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK (mode = 'video' OR private_meeting_link IS NULL)
);

CREATE TABLE IF NOT EXISTS public.employment_application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.employment_applications(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  previous_stage_id UUID REFERENCES public.employment_pipeline_stages(id) ON DELETE SET NULL,
  next_stage_id UUID REFERENCES public.employment_pipeline_stages(id) ON DELETE SET NULL,
  reason TEXT,
  candidate_notified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_saved_jobs (
  candidate_id UUID NOT NULL REFERENCES public.employment_candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.employment_job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.employment_candidate_profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  name VARCHAR(180) NOT NULL,
  query JSONB NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('instant','daily','weekly')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purpose_id VARCHAR(100) NOT NULL,
  policy_version VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('granted','withdrawn','expired')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_at TIMESTAMPTZ NOT NULL,
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('export','delete')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('accepted','processing','completed','cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS employment_open_data_subject_request_uidx
  ON public.employment_data_subject_requests(subject_user_id, request_type)
  WHERE status IN ('accepted','processing');
ALTER TABLE public.employment_candidate_profiles
  ADD CONSTRAINT employment_candidate_consent_fk FOREIGN KEY (recruiter_search_consent_id)
  REFERENCES public.employment_consent_records(id) ON DELETE SET NULL;
ALTER TABLE public.employment_applications
  ADD CONSTRAINT employment_application_consent_fk FOREIGN KEY (consent_record_id)
  REFERENCES public.employment_consent_records(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.employment_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
  employer_id UUID REFERENCES public.employment_employer_profiles(id) ON DELETE CASCADE,
  purpose_id VARCHAR(100) NOT NULL,
  retention_days INT NOT NULL CHECK (retention_days > 0),
  legal_basis VARCHAR(120) NOT NULL,
  version INT NOT NULL CHECK (version > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market_code, employer_id, purpose_id, version)
);

CREATE TABLE IF NOT EXISTS public.employment_import_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES public.employment_employer_profiles(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('csv','xml','json_api','ats','career_site')),
  name VARCHAR(180) NOT NULL,
  source_identifier VARCHAR(255) NOT NULL,
  mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_reference TEXT,
  rate_limit_per_hour INT NOT NULL DEFAULT 60 CHECK (rate_limit_per_hour > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employer_id, source_identifier)
);

CREATE TABLE IF NOT EXISTS public.employment_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.employment_import_sources(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(255) NOT NULL,
  payload_hash VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('preview','queued','processing','completed','partial','failed')),
  created_count INT NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  updated_count INT NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  expired_count INT NOT NULL DEFAULT 0 CHECK (expired_count >= 0),
  duplicate_count INT NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  error_count INT NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  error_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (source_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.employment_moderation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE CASCADE,
  field_name VARCHAR(120) NOT NULL,
  excerpt TEXT NOT NULL,
  policy_rule_id VARCHAR(120) NOT NULL,
  explanation TEXT NOT NULL,
  neutral_suggestion TEXT NOT NULL,
  requires_human_review BOOLEAN NOT NULL DEFAULT TRUE CHECK (requires_human_review),
  is_legal_decision BOOLEAN NOT NULL DEFAULT FALSE CHECK (NOT is_legal_decision),
  resolution VARCHAR(20) CHECK (resolution IN ('accepted','dismissed','edited')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.employment_job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason VARCHAR(30) NOT NULL CHECK (reason IN ('fraud','discrimination','candidate_fee','misleading','malicious_link','other')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 2000),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','resolved','dismissed')),
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, reporter_user_id, reason)
);

CREATE TABLE IF NOT EXISTS public.employment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES public.employment_employer_profiles(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id TEXT NOT NULL,
  before_value JSONB,
  after_value JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employment_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(120) NOT NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  job_id UUID REFERENCES public.employment_jobs(id) ON DELETE SET NULL,
  employer_id UUID REFERENCES public.employment_employer_profiles(id) ON DELETE SET NULL,
  anonymous_session_hash VARCHAR(100),
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT (dimensions ?| ARRAY['candidateName','candidateEmail','cvUrl','protectedCharacteristic']))
);

-- Search, workflow and synchronization indexes.
CREATE INDEX IF NOT EXISTS employment_jobs_public_idx ON public.employment_jobs(market_code, published_at DESC)
  WHERE lifecycle = 'published' AND moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS employment_jobs_profession_idx ON public.employment_jobs(profession_id, published_at DESC);
CREATE INDEX IF NOT EXISTS employment_jobs_industry_idx ON public.employment_jobs(industry_id, published_at DESC);
CREATE INDEX IF NOT EXISTS employment_jobs_contract_idx ON public.employment_jobs(contract_type_id, published_at DESC);
CREATE INDEX IF NOT EXISTS employment_jobs_arrangement_idx ON public.employment_jobs(working_arrangement_id, published_at DESC);
CREATE INDEX IF NOT EXISTS employment_jobs_schedule_idx ON public.employment_jobs USING GIN(work_schedule_ids);
CREATE INDEX IF NOT EXISTS employment_jobs_salary_idx ON public.employment_jobs(salary_currency, salary_minimum_minor, salary_maximum_minor) WHERE salary_is_public;
CREATE INDEX IF NOT EXISTS employment_jobs_deadline_idx ON public.employment_jobs(application_deadline) WHERE lifecycle = 'published';
CREATE INDEX IF NOT EXISTS employment_jobs_employer_idx ON public.employment_jobs(employer_id, lifecycle, updated_at DESC);
CREATE INDEX IF NOT EXISTS employment_jobs_promoted_idx ON public.employment_jobs(market_code, is_featured DESC, is_sponsored DESC, published_at DESC)
  WHERE lifecycle = 'published' AND moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS employment_jobs_duplicate_idx ON public.employment_jobs(employer_id, duplicate_fingerprint);
CREATE INDEX IF NOT EXISTS employment_locations_geo_idx ON public.employment_job_locations(country_code, city, postal_code);
CREATE INDEX IF NOT EXISTS employment_job_languages_level_idx ON public.employment_job_languages(level_id, job_id);
CREATE INDEX IF NOT EXISTS employment_applications_candidate_idx ON public.employment_applications(candidate_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS employment_applications_job_stage_idx ON public.employment_applications(job_id, stage_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS employment_assignments_recruiter_idx ON public.employment_recruiter_assignments(recruiter_user_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS employment_alerts_due_idx ON public.employment_job_alerts(enabled, frequency, last_sent_at) WHERE enabled;
CREATE INDEX IF NOT EXISTS employment_sync_source_idx ON public.employment_sync_logs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS employment_job_reports_queue_idx ON public.employment_job_reports(status, created_at);
CREATE INDEX IF NOT EXISTS employment_events_application_idx ON public.employment_application_events(application_id, occurred_at DESC);

-- Permission helpers are SECURITY DEFINER to keep policy joins deterministic.
CREATE OR REPLACE FUNCTION public.is_employment_member(target_employer_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employment_recruiter_memberships member
    WHERE member.employer_id = target_employer_id
      AND member.user_id = public.current_profile_id()
      AND member.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_employment_applications(target_employer_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employment_recruiter_memberships member
    WHERE member.employer_id = target_employer_id
      AND member.user_id = public.current_profile_id()
      AND member.status = 'active'
      AND (
        member.role IN ('owner','recruitment_admin','recruiter','hiring_manager')
        OR 'application.manage' = ANY(member.permissions)
      )
  );
$$;

-- RLS: deny by default; only policies below grant access.
ALTER TABLE public.employment_market_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_dictionary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_employer_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_recruiter_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_job_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_job_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_job_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_screening_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_default_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_screening_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_recruiter_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_recruiter_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_moderation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_job_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enabled employment config is public" ON public.employment_market_configs FOR SELECT USING (is_enabled OR public.is_admin());
CREATE POLICY "Active employment dictionaries are public" ON public.employment_dictionary_entries FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Employment configuration is admin managed" ON public.employment_market_configs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employment dictionaries are admin managed" ON public.employment_dictionary_entries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Active employer profiles are public" ON public.employment_employer_profiles FOR SELECT USING (status = 'active' OR owner_user_id = public.current_profile_id() OR public.is_employment_member(id) OR public.is_moderator_or_admin());
CREATE POLICY "Owners manage employer profiles" ON public.employment_employer_profiles FOR ALL USING (owner_user_id = public.current_profile_id() OR public.is_admin()) WITH CHECK (owner_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Employer members see branches" ON public.employment_employer_branches FOR SELECT USING (public.is_employment_member(employer_id) OR public.is_admin());
CREATE POLICY "Employer administrators manage branches" ON public.employment_employer_branches FOR ALL USING (public.is_employment_member(employer_id) OR public.is_admin()) WITH CHECK (public.is_employment_member(employer_id) OR public.is_admin());
CREATE POLICY "Members see own employment team" ON public.employment_recruiter_memberships FOR SELECT USING (user_id = public.current_profile_id() OR public.is_employment_member(employer_id) OR public.is_admin());
CREATE POLICY "Employer owners manage memberships" ON public.employment_recruiter_memberships FOR ALL USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.employment_employer_profiles employer WHERE employer.id = employer_id AND employer.owner_user_id = public.current_profile_id())) WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.employment_employer_profiles employer WHERE employer.id = employer_id AND employer.owner_user_id = public.current_profile_id()));

CREATE POLICY "Owners manage employment drafts" ON public.employment_job_drafts FOR ALL USING (owner_user_id = public.current_profile_id() OR public.is_employment_member(employer_id) OR public.is_admin()) WITH CHECK (owner_user_id = public.current_profile_id() OR public.is_employment_member(employer_id) OR public.is_admin());
CREATE POLICY "Published jobs are public" ON public.employment_jobs FOR SELECT USING ((lifecycle = 'published' AND moderation_status = 'approved') OR created_by_user_id = public.current_profile_id() OR public.is_employment_member(employer_id) OR public.is_moderator_or_admin());
CREATE POLICY "Employers manage their jobs" ON public.employment_jobs FOR ALL USING (created_by_user_id = public.current_profile_id() OR public.is_employment_member(employer_id) OR public.is_admin()) WITH CHECK (created_by_user_id = public.current_profile_id() OR public.is_employment_member(employer_id) OR public.is_admin());
CREATE POLICY "Public job locations are visible" ON public.employment_job_locations FOR SELECT USING (is_public AND job_id IN (SELECT id FROM public.employment_jobs WHERE lifecycle = 'published' AND moderation_status = 'approved') OR job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin());
CREATE POLICY "Employer members manage job locations" ON public.employment_job_locations FOR ALL USING (job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin()) WITH CHECK (job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin());
CREATE POLICY "Public job skills are visible" ON public.employment_job_skills FOR SELECT USING (job_id IN (SELECT id FROM public.employment_jobs WHERE lifecycle = 'published' AND moderation_status = 'approved') OR public.is_admin());
CREATE POLICY "Employer members manage job skills" ON public.employment_job_skills FOR ALL USING (job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin()) WITH CHECK (job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin());
CREATE POLICY "Public job languages are visible" ON public.employment_job_languages FOR SELECT USING (job_id IN (SELECT id FROM public.employment_jobs WHERE lifecycle = 'published' AND moderation_status = 'approved') OR public.is_admin());
CREATE POLICY "Employer members manage job languages" ON public.employment_job_languages FOR ALL USING (job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin()) WITH CHECK (job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin());
CREATE POLICY "Public screening questions are visible" ON public.employment_screening_questions FOR SELECT USING (job_id IN (SELECT id FROM public.employment_jobs WHERE lifecycle = 'published' AND moderation_status = 'approved') OR public.is_admin());
CREATE POLICY "Employer members manage screening questions" ON public.employment_screening_questions FOR ALL USING (job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin()) WITH CHECK (job_id IN (SELECT id FROM public.employment_jobs WHERE public.is_employment_member(employer_id)) OR public.is_admin());

CREATE POLICY "Candidates manage own profile" ON public.employment_candidate_profiles FOR ALL USING (user_id = public.current_profile_id() OR public.is_admin()) WITH CHECK (user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Consented candidate profiles are recruiter searchable" ON public.employment_candidate_profiles FOR SELECT USING (visibility = 'verified_recruiters' AND recruiter_search_consent_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.employment_recruiter_memberships member JOIN public.employment_employer_profiles employer ON employer.id = member.employer_id WHERE member.user_id = public.current_profile_id() AND member.status = 'active' AND employer.verification_level IN ('domain_verified','manually_verified','provider_verified')) OR public.is_admin());
CREATE POLICY "Candidate documents stay private" ON public.employment_candidate_documents FOR ALL USING (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR public.is_admin()) WITH CHECK (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR public.is_admin());
CREATE POLICY "Authorized recruiters read submitted CVs" ON public.employment_candidate_documents FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.employment_applications application
    JOIN public.employment_jobs job ON job.id = application.job_id
    WHERE application.cv_document_id = employment_candidate_documents.id
      AND public.can_manage_employment_applications(job.employer_id)
  )
  OR public.is_admin()
);

CREATE POLICY "Employer members manage pipelines" ON public.employment_pipelines FOR ALL USING (public.is_employment_member(employer_id) OR public.is_admin()) WITH CHECK (public.is_employment_member(employer_id) OR public.is_admin());
CREATE POLICY "Active employment pipeline defaults are public" ON public.employment_default_pipeline_stages FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Employment pipeline defaults are admin managed" ON public.employment_default_pipeline_stages FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employer members see pipeline stages" ON public.employment_pipeline_stages FOR SELECT USING (pipeline_id IN (SELECT id FROM public.employment_pipelines WHERE public.is_employment_member(employer_id)) OR public.is_admin());
CREATE POLICY "Employment admins manage pipeline stages" ON public.employment_pipeline_stages FOR ALL USING (pipeline_id IN (SELECT id FROM public.employment_pipelines WHERE public.can_manage_employment_applications(employer_id)) OR public.is_admin()) WITH CHECK (pipeline_id IN (SELECT id FROM public.employment_pipelines WHERE public.can_manage_employment_applications(employer_id)) OR public.is_admin());

CREATE POLICY "Candidates see own applications" ON public.employment_applications FOR SELECT USING (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR job_id IN (SELECT id FROM public.employment_jobs WHERE public.can_manage_employment_applications(employer_id)) OR public.is_moderator_or_admin());
CREATE POLICY "Candidates create own applications" ON public.employment_applications FOR INSERT WITH CHECK (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) AND job_id IN (SELECT id FROM public.employment_jobs WHERE lifecycle = 'published' AND moderation_status = 'approved' AND expires_at > NOW()));
CREATE POLICY "Candidates withdraw own applications" ON public.employment_applications FOR UPDATE USING (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR job_id IN (SELECT id FROM public.employment_jobs WHERE public.can_manage_employment_applications(employer_id)) OR public.is_admin());
CREATE POLICY "Application participants see screening answers" ON public.employment_screening_answers FOR SELECT USING (application_id IN (SELECT id FROM public.employment_applications WHERE candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR job_id IN (SELECT id FROM public.employment_jobs WHERE public.can_manage_employment_applications(employer_id))) OR public.is_admin());
CREATE POLICY "Candidates create own screening answers" ON public.employment_screening_answers FOR INSERT WITH CHECK (application_id IN (SELECT id FROM public.employment_applications WHERE candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id())));

CREATE POLICY "Recruiters manage assignments" ON public.employment_recruiter_assignments FOR ALL USING (application_id IN (SELECT application.id FROM public.employment_applications application JOIN public.employment_jobs job ON job.id = application.job_id WHERE public.can_manage_employment_applications(job.employer_id)) OR public.is_admin()) WITH CHECK (application_id IN (SELECT application.id FROM public.employment_applications application JOIN public.employment_jobs job ON job.id = application.job_id WHERE public.can_manage_employment_applications(job.employer_id)) OR public.is_admin());
CREATE POLICY "Recruiter notes never reach candidates" ON public.employment_recruiter_notes FOR ALL USING (application_id IN (SELECT application.id FROM public.employment_applications application JOIN public.employment_jobs job ON job.id = application.job_id WHERE public.can_manage_employment_applications(job.employer_id)) OR public.is_admin()) WITH CHECK (application_id IN (SELECT application.id FROM public.employment_applications application JOIN public.employment_jobs job ON job.id = application.job_id WHERE public.can_manage_employment_applications(job.employer_id)) OR public.is_admin());
CREATE POLICY "Interview participants see interviews" ON public.employment_interviews FOR SELECT USING (public.current_profile_id() = ANY(participant_user_ids) OR application_id IN (SELECT application.id FROM public.employment_applications application JOIN public.employment_jobs job ON job.id = application.job_id WHERE public.can_manage_employment_applications(job.employer_id)) OR public.is_admin());
CREATE POLICY "Recruiters manage interviews" ON public.employment_interviews FOR ALL USING (application_id IN (SELECT application.id FROM public.employment_applications application JOIN public.employment_jobs job ON job.id = application.job_id WHERE public.can_manage_employment_applications(job.employer_id)) OR public.is_admin()) WITH CHECK (application_id IN (SELECT application.id FROM public.employment_applications application JOIN public.employment_jobs job ON job.id = application.job_id WHERE public.can_manage_employment_applications(job.employer_id)) OR public.is_admin());
-- Raw events can contain internal transition reasons and metadata. Candidates
-- read their normalized candidate_visible_status from employment_applications;
-- they never receive this audit stream directly.
CREATE POLICY "Application events are recruiter audit data" ON public.employment_application_events FOR SELECT USING (application_id IN (SELECT id FROM public.employment_applications WHERE job_id IN (SELECT id FROM public.employment_jobs WHERE public.can_manage_employment_applications(employer_id))) OR public.is_moderator_or_admin());
CREATE POLICY "Recruiters append application audit events" ON public.employment_application_events FOR INSERT WITH CHECK (application_id IN (SELECT application.id FROM public.employment_applications application JOIN public.employment_jobs job ON job.id = application.job_id WHERE public.can_manage_employment_applications(job.employer_id)) OR actor_user_id = public.current_profile_id() OR public.is_admin());

CREATE POLICY "Candidates manage saved jobs" ON public.employment_saved_jobs FOR ALL USING (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR public.is_admin()) WITH CHECK (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR public.is_admin());
CREATE POLICY "Candidates manage job alerts" ON public.employment_job_alerts FOR ALL USING (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR public.is_admin()) WITH CHECK (candidate_id IN (SELECT id FROM public.employment_candidate_profiles WHERE user_id = public.current_profile_id()) OR public.is_admin());
CREATE POLICY "Users see own consent history" ON public.employment_consent_records FOR SELECT USING (subject_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Users record own consent decisions" ON public.employment_consent_records FOR INSERT WITH CHECK (subject_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Users withdraw own consent" ON public.employment_consent_records FOR UPDATE USING (subject_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Users create own employment privacy requests" ON public.employment_data_subject_requests FOR INSERT WITH CHECK (subject_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Users see own employment privacy requests" ON public.employment_data_subject_requests FOR SELECT USING (subject_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Employment admins process privacy requests" ON public.employment_data_subject_requests FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Employment retention policy is employer visible" ON public.employment_retention_policies FOR SELECT USING (employer_id IS NULL OR public.is_employment_member(employer_id) OR public.is_admin());
CREATE POLICY "Employment retention policy is admin managed" ON public.employment_retention_policies FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Employer members manage import sources" ON public.employment_import_sources FOR ALL USING (public.is_employment_member(employer_id) OR public.is_admin()) WITH CHECK (public.is_employment_member(employer_id) OR public.is_admin());
CREATE POLICY "Employer members see synchronization logs" ON public.employment_sync_logs FOR SELECT USING (source_id IN (SELECT id FROM public.employment_import_sources WHERE public.is_employment_member(employer_id)) OR public.is_admin());
CREATE POLICY "Employer members create synchronization logs" ON public.employment_sync_logs FOR INSERT WITH CHECK (source_id IN (SELECT id FROM public.employment_import_sources WHERE public.is_employment_member(employer_id)) OR public.is_admin());
CREATE POLICY "Employment moderation flags are reviewer only" ON public.employment_moderation_flags FOR ALL USING (public.is_moderator_or_admin()) WITH CHECK (public.is_moderator_or_admin());
CREATE POLICY "Users submit employment job reports" ON public.employment_job_reports FOR INSERT WITH CHECK (reporter_user_id = public.current_profile_id());
CREATE POLICY "Users see own employment job reports" ON public.employment_job_reports FOR SELECT USING (reporter_user_id = public.current_profile_id() OR public.is_moderator_or_admin());
CREATE POLICY "Employment reviewers manage job reports" ON public.employment_job_reports FOR ALL USING (public.is_moderator_or_admin()) WITH CHECK (public.is_moderator_or_admin());
CREATE POLICY "Employment audit is admin or owning employer" ON public.employment_audit_logs FOR SELECT USING (public.is_employment_member(employer_id) OR public.is_moderator_or_admin());
CREATE POLICY "Employment analytics are admin only" ON public.employment_analytics_events FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Market activation and baseline configuration. Commercial values remain rows,
-- so operators can version/replace them without application releases.
INSERT INTO public.vertical_market_activations (
  vertical_type, market_code, category_ids, subcategory_ids, schema_version, is_active, feature_flags
) VALUES (
  'employment','FR',ARRAY['jobs'],ARRAY['jobs.offers'],1,TRUE,
  '{"verticalEnabled":true,"privateEmployersEnabled":true,"directApplicationsEnabled":true,"externalApplicationsEnabled":true,"candidateSearchEnabled":true,"talentPoolEnabled":true,"interviewsEnabled":true,"paidVisibilityEnabled":true,"importsEnabled":true,"apiSyncEnabled":false,"aiAssistanceEnabled":false}'::jsonb
) ON CONFLICT (vertical_type, market_code) DO UPDATE SET
  category_ids = EXCLUDED.category_ids,
  subcategory_ids = EXCLUDED.subcategory_ids,
  schema_version = EXCLUDED.schema_version,
  is_active = EXCLUDED.is_active,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = NOW();

INSERT INTO public.employment_market_configs (
  market_code, schema_version, locale, currency, timezone, is_enabled,
  default_publication_duration_days, draft_retention_days,
  application_retention_days, talent_pool_retention_days,
  application_resubmission_cooldown_days, regulatory_content_version,
  prohibited_language_policy_version, prohibited_language_rules, risk_rules,
  required_field_ids, feature_flags
) VALUES (
  'FR',1,'fr-FR','EUR','Europe/Paris',TRUE,30,180,730,730,30,
  'fr-employment-2026-08','fr-inclusive-language-2026-08',
  '[
    {"id":"age-coded-language","terms":["jeune","moins de 30 ans","âgé de"],"explanation":"Cette formulation peut introduire un critère d’âge sans lien démontré avec le poste.","neutralSuggestion":"Décrivez l’expérience ou les compétences réellement nécessaires."},
    {"id":"gender-coded-language","terms":["homme recherché","femme recherchée"],"explanation":"Cette formulation peut restreindre le poste selon le genre.","neutralSuggestion":"Utilisez un intitulé de métier neutre et décrivez les missions."},
    {"id":"candidate-payment-request","terms":["frais de recrutement","payer pour postuler","avance de frais"],"explanation":"Un candidat ne doit pas payer pour postuler sur Shongre.","neutralSuggestion":"Supprimez toute demande de paiement adressée au candidat."}
  ]'::jsonb,
  '{"blockedExternalHostPatterns":["localhost","127.0.0.1",".local"],"salaryReviewMaximumMinorByFrequency":{"employment.fr.salary_frequency.hour":100000,"employment.fr.salary_frequency.month":100000000,"employment.fr.salary_frequency.year":1000000000}}'::jsonb,
  ARRAY['title','professionId','industryId','contractTypeId','workingArrangementId','workingTimeId','responsibilities','primaryLocation'],
  '{"verticalEnabled":true,"privateEmployersEnabled":true,"directApplicationsEnabled":true,"externalApplicationsEnabled":true,"candidateSearchEnabled":true,"talentPoolEnabled":true,"interviewsEnabled":true,"paidVisibilityEnabled":true,"importsEnabled":true,"apiSyncEnabled":false,"aiAssistanceEnabled":false}'::jsonb
) ON CONFLICT (market_code) DO UPDATE SET
  schema_version = EXCLUDED.schema_version,
  locale = EXCLUDED.locale,
  currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone,
  is_enabled = EXCLUDED.is_enabled,
  prohibited_language_rules = EXCLUDED.prohibited_language_rules,
  risk_rules = EXCLUDED.risk_rules,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = NOW();

INSERT INTO public.employment_default_pipeline_stages (
  market_code, code, label, system_state, candidate_visible_label, sort_order,
  candidate_notification_enabled, is_required_system_stage, version, is_active
) VALUES
  ('FR','received','Candidature reçue','received','Candidature reçue',10,TRUE,TRUE,1,TRUE),
  ('FR','review','À étudier','active','En cours d’étude',20,TRUE,FALSE,1,TRUE),
  ('FR','shortlisted','Présélection','active','Présélectionnée',30,TRUE,FALSE,1,TRUE),
  ('FR','interview','Entretien','interview','Entretien demandé',40,TRUE,TRUE,1,TRUE),
  ('FR','assessment','Évaluation','active','Évaluation en cours',50,FALSE,FALSE,1,TRUE),
  ('FR','offer','Proposition','offer','Proposition transmise',60,TRUE,TRUE,1,TRUE),
  ('FR','hired','Recruté·e','hired','Candidature retenue',70,TRUE,TRUE,1,TRUE),
  ('FR','rejected','Non retenu·e','rejected','Candidature non retenue',80,TRUE,TRUE,1,TRUE),
  ('FR','withdrawn','Retirée','withdrawn','Candidature retirée',90,TRUE,TRUE,1,TRUE),
  ('FR','archived','Archivée','archived','Candidature archivée',100,FALSE,TRUE,1,TRUE)
ON CONFLICT (market_code, code) DO UPDATE SET
  label = EXCLUDED.label,
  system_state = EXCLUDED.system_state,
  candidate_visible_label = EXCLUDED.candidate_visible_label,
  sort_order = EXCLUDED.sort_order,
  candidate_notification_enabled = EXCLUDED.candidate_notification_enabled,
  is_required_system_stage = EXCLUDED.is_required_system_stage,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active;

INSERT INTO public.employment_dictionary_entries (
  id, market_code, kind, parent_id, code, slug, label, sort_order
) VALUES
  ('employment.fr.sector.technology','FR','sector',NULL,'technology','technologie-numerique','Technologie & Numérique',10),
  ('employment.fr.sector.commerce','FR','sector',NULL,'commerce','commerce-vente','Commerce & Vente',20),
  ('employment.fr.sector.health_social','FR','sector',NULL,'health_social','sante-social','Santé & Social',30),
  ('employment.fr.sector.hospitality','FR','sector',NULL,'hospitality','hotellerie-restauration','Hôtellerie & Restauration',40),
  ('employment.fr.sector.industry','FR','sector',NULL,'industry','industrie-ingenierie','Industrie & Ingénierie',50),
  ('employment.fr.sector.construction','FR','sector',NULL,'construction','btp-construction','BTP & Construction',60),
  ('employment.fr.sector.transport','FR','sector',NULL,'transport','transport-logistique','Transport & Logistique',70),
  ('employment.fr.sector.education','FR','sector',NULL,'education','education-formation','Éducation & Formation',80),
  ('employment.fr.sector.finance','FR','sector',NULL,'finance','finance-juridique','Finance, Comptabilité & Juridique',90),
  ('employment.fr.job_family.engineering','FR','job_family','employment.fr.sector.technology','engineering','ingenierie','Ingénierie',100),
  ('employment.fr.job_family.product','FR','job_family','employment.fr.sector.technology','product','produit-design','Produit & Design',110),
  ('employment.fr.job_family.sales','FR','job_family','employment.fr.sector.commerce','sales','vente-relation-client','Vente & Relation client',120),
  ('employment.fr.job_family.care','FR','job_family','employment.fr.sector.health_social','care','soins-accompagnement','Soins & Accompagnement',130),
  ('employment.fr.job_family.operations','FR','job_family','employment.fr.sector.transport','operations','operations-logistique','Opérations & Logistique',140),
  ('employment.fr.profession.frontend_engineer','FR','profession','employment.fr.job_family.engineering','frontend_engineer','developpeur-front-end','Développeur·se front-end',150),
  ('employment.fr.profession.data_analyst','FR','profession','employment.fr.job_family.engineering','data_analyst','data-analyst','Data analyst',160),
  ('employment.fr.profession.product_designer','FR','profession','employment.fr.job_family.product','product_designer','product-designer','Product designer',170),
  ('employment.fr.profession.sales_advisor','FR','profession','employment.fr.job_family.sales','sales_advisor','conseiller-vente','Conseiller·ère de vente',180),
  ('employment.fr.profession.care_assistant','FR','profession','employment.fr.job_family.care','care_assistant','auxiliaire-vie','Auxiliaire de vie',190),
  ('employment.fr.profession.warehouse_operator','FR','profession','employment.fr.job_family.operations','warehouse_operator','operateur-logistique','Opérateur·rice logistique',200),
  ('employment.fr.specialization.react','FR','specialization','employment.fr.profession.frontend_engineer','react','react-typescript','React & TypeScript',210),
  ('employment.fr.specialization.business_intelligence','FR','specialization','employment.fr.profession.data_analyst','business_intelligence','business-intelligence','Business intelligence',220),
  ('employment.fr.skill.typescript','FR','skill',NULL,'typescript','typescript','TypeScript',230),
  ('employment.fr.skill.react','FR','skill',NULL,'react','react','React',240),
  ('employment.fr.skill.sql','FR','skill',NULL,'sql','sql','SQL',250),
  ('employment.fr.skill.figma','FR','skill',NULL,'figma','figma','Figma',260),
  ('employment.fr.skill.customer_service','FR','skill',NULL,'customer_service','relation-client','Relation client',270),
  ('employment.fr.skill.care_support','FR','skill',NULL,'care_support','accompagnement','Accompagnement',280),
  ('employment.fr.seniority.entry','FR','seniority',NULL,'entry','debutant','Débutant accepté',290),
  ('employment.fr.seniority.intermediate','FR','seniority',NULL,'intermediate','intermediaire','Intermédiaire',300),
  ('employment.fr.seniority.experienced','FR','seniority',NULL,'experienced','confirme','Confirmé',310),
  ('employment.fr.seniority.senior','FR','seniority',NULL,'senior','senior','Senior / Expert',320),
  ('employment.fr.contract_type.permanent','FR','contract_type',NULL,'permanent','contrat-duree-indeterminee','Emploi permanent',330),
  ('employment.fr.contract_type.fixed_term','FR','contract_type',NULL,'fixed_term','contrat-duree-determinee','Emploi à durée déterminée',340),
  ('employment.fr.contract_type.temporary','FR','contract_type',NULL,'temporary','travail-temporaire','Travail temporaire',350),
  ('employment.fr.contract_type.internship','FR','contract_type',NULL,'internship','stage','Stage',360),
  ('employment.fr.contract_type.apprenticeship','FR','contract_type',NULL,'apprenticeship','alternance','Apprentissage / alternance',370),
  ('employment.fr.contract_type.seasonal','FR','contract_type',NULL,'seasonal','emploi-saisonnier','Emploi saisonnier',380),
  ('employment.fr.contract_type.freelance','FR','contract_type',NULL,'freelance','mission-freelance','Mission freelance',390),
  ('employment.fr.contract_type.public_sector','FR','contract_type',NULL,'public_sector','secteur-public','Opportunité secteur public',400),
  ('employment.fr.salary_frequency.hour','FR','salary_frequency',NULL,'hour','heure','Par heure',410),
  ('employment.fr.salary_frequency.month','FR','salary_frequency',NULL,'month','mois','Par mois',420),
  ('employment.fr.salary_frequency.year','FR','salary_frequency',NULL,'year','annee','Par an',430),
  ('employment.fr.working_arrangement.onsite','FR','working_arrangement',NULL,'onsite','sur-site','Sur site',440),
  ('employment.fr.working_arrangement.hybrid','FR','working_arrangement',NULL,'hybrid','hybride','Hybride',450),
  ('employment.fr.working_arrangement.remote','FR','working_arrangement',NULL,'remote','teletravail','Télétravail',460),
  ('employment.fr.work_schedule.full_time','FR','work_schedule',NULL,'full_time','temps-plein','Temps plein',470),
  ('employment.fr.work_schedule.part_time','FR','work_schedule',NULL,'part_time','temps-partiel','Temps partiel',480),
  ('employment.fr.work_schedule.day','FR','work_schedule',NULL,'day','journee','Journée',490),
  ('employment.fr.work_schedule.night','FR','work_schedule',NULL,'night','nuit','Nuit',500),
  ('employment.fr.work_schedule.weekend','FR','work_schedule',NULL,'weekend','week-end','Week-end',510),
  ('employment.fr.work_schedule.shift','FR','work_schedule',NULL,'shift','equipe','Travail en équipe',520),
  ('employment.fr.education_level.none','FR','education_level',NULL,'none','sans-diplome','Aucun diplôme requis',530),
  ('employment.fr.education_level.secondary','FR','education_level',NULL,'secondary','secondaire','Enseignement secondaire',540),
  ('employment.fr.education_level.bachelor','FR','education_level',NULL,'bachelor','licence','Licence / Bachelor',550),
  ('employment.fr.education_level.master','FR','education_level',NULL,'master','master','Master',560),
  ('employment.fr.language_level.basic','FR','language_level',NULL,'basic','notions','Notions',570),
  ('employment.fr.language_level.professional','FR','language_level',NULL,'professional','professionnel','Professionnel',580),
  ('employment.fr.language_level.fluent','FR','language_level',NULL,'fluent','courant','Courant',590),
  ('employment.fr.employer_type.private','FR','employer_type',NULL,'private','particulier-employeur','Particulier employeur',600),
  ('employment.fr.employer_type.small_business','FR','employer_type',NULL,'small_business','petite-entreprise','Petite entreprise',610),
  ('employment.fr.employer_type.company','FR','employer_type',NULL,'company','entreprise','Entreprise',620),
  ('employment.fr.employer_type.agency','FR','employer_type',NULL,'agency','agence-recrutement','Agence de recrutement',630),
  ('employment.fr.employer_type.staffing','FR','employer_type',NULL,'staffing','agence-interim','Agence de travail temporaire',640),
  ('employment.fr.employer_type.public','FR','employer_type',NULL,'public','secteur-public','Employeur public',650),
  ('employment.fr.screening_question_type.yes_no','FR','screening_question_type',NULL,'yes_no','oui-non','Oui / Non',660),
  ('employment.fr.screening_question_type.single_choice','FR','screening_question_type',NULL,'single_choice','choix-unique','Choix unique',670),
  ('employment.fr.screening_question_type.short_text','FR','screening_question_type',NULL,'short_text','texte-court','Réponse courte',680),
  ('employment.fr.screening_question_type.long_text','FR','screening_question_type',NULL,'long_text','texte-long','Réponse développée',690)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  code = EXCLUDED.code,
  slug = EXCLUDED.slug,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

-- Preserve the existing canonical branch while enabling the specialized handler.
UPDATE public.categories SET
  seller_eligibility = jsonb_build_object('individualAllowed',TRUE,'proAllowed',TRUE,'proVerificationRequired',FALSE),
  schema_version = GREATEST(schema_version, 3),
  publication_config = publication_config || '{"verticalType":"employment","verticalSchemaVersion":1}'::jsonb,
  updated_at = NOW()
WHERE id IN ('jobs','jobs.offers');

-- Free path plus optional plans. Values are duplicated into the shared vertical
-- catalog intentionally: business-rules publication owns future price changes.
INSERT INTO public.vertical_offers (id, vertical_type, market_code, audience, kind, name, description, is_active, is_recommended, sort_order) VALUES
  ('employment.employer.free','employment','FR','individual','free','Employeur Gratuit','Publication standard sans abonnement obligatoire.',TRUE,FALSE,10),
  ('employment.visibility.pack','employment','FR','organization','pack','Pack Visibilité Recrutement','Visibilité facultative clairement signalée.',TRUE,FALSE,20),
  ('employment.employer.starter','employment','FR','organization','subscription','Employeur Starter','Profil employeur, pipeline et accès équipe.',TRUE,FALSE,30),
  ('employment.employer.growth','employment','FR','organization','subscription','Employeur Growth','Collaboration, entretiens, imports et statistiques avancées.',TRUE,TRUE,40),
  ('employment.agency','employment','FR','organization','subscription','Agence de recrutement','Portefeuilles clients isolés et facturation centralisée.',TRUE,FALSE,50),
  ('employment.network','employment','FR','organization','custom','Réseau Employeur','Branches, API, SSO et flux d’approbation configurables.',TRUE,FALSE,60)
ON CONFLICT (id, vertical_type, market_code) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  is_active = EXCLUDED.is_active, is_recommended = EXCLUDED.is_recommended,
  sort_order = EXCLUDED.sort_order, updated_at = NOW();

INSERT INTO public.vertical_offer_prices (id, offer_id, vertical_type, market_code, amount_minor, currency, billing_period, duration_days, trial_days, tax_rate_bps, is_active) VALUES
  ('employment.employer.free.price.fr.v1','employment.employer.free','employment','FR',0,'EUR','once',30,NULL,0,TRUE),
  ('employment.visibility.pack.price.fr.v1','employment.visibility.pack','employment','FR',5900,'EUR','once',30,NULL,2000,TRUE),
  ('employment.employer.starter.price.fr.v1','employment.employer.starter','employment','FR',6900,'EUR','month',NULL,14,2000,TRUE),
  ('employment.employer.growth.price.fr.v1','employment.employer.growth','employment','FR',16900,'EUR','month',NULL,14,2000,TRUE),
  ('employment.agency.price.fr.v1','employment.agency','employment','FR',29900,'EUR','month',NULL,14,2000,TRUE),
  ('employment.network.price.fr.v1','employment.network','employment','FR',0,'EUR','month',NULL,NULL,0,TRUE)
ON CONFLICT (id) DO UPDATE SET amount_minor = EXCLUDED.amount_minor, currency = EXCLUDED.currency, tax_rate_bps = EXCLUDED.tax_rate_bps, is_active = EXCLUDED.is_active, updated_at = NOW();

INSERT INTO public.vertical_offer_entitlements (offer_id, vertical_type, market_code, entitlement_key, entitlement_value) VALUES
  ('employment.employer.free','employment','FR','maxActiveJobs','1'),
  ('employment.employer.free','employment','FR','maxRecruiterSeats','1'),
  ('employment.employer.free','employment','FR','basicAnalytics','true'),
  ('employment.employer.starter','employment','FR','maxActiveJobs','5'),
  ('employment.employer.starter','employment','FR','maxRecruiterSeats','3'),
  ('employment.employer.starter','employment','FR','reusableTemplates','true'),
  ('employment.employer.growth','employment','FR','maxActiveJobs','25'),
  ('employment.employer.growth','employment','FR','maxRecruiterSeats','12'),
  ('employment.employer.growth','employment','FR','candidateAssignment','true'),
  ('employment.employer.growth','employment','FR','interviewScheduling','true'),
  ('employment.employer.growth','employment','FR','csvImport','true'),
  ('employment.employer.growth','employment','FR','apiSync','true'),
  ('employment.agency','employment','FR','clientIsolation','true'),
  ('employment.agency','employment','FR','maxClients','50'),
  ('employment.network','employment','FR','maxBranches','250'),
  ('employment.network','employment','FR','ssoFramework','true')
ON CONFLICT (offer_id, vertical_type, market_code, entitlement_key) DO UPDATE SET entitlement_value = EXCLUDED.entitlement_value, updated_at = NOW();

INSERT INTO public.vertical_add_ons (id, vertical_type, market_code, category_ids, type, name, description, amount_minor, currency, tax_rate_bps, validity_days, credit_quantity, schedule_modes, is_active, sort_order) VALUES
  ('employment.addon.urgent','employment','FR',ARRAY['jobs'],'urgent','Recrutement urgent','Badge urgent identifiable.',900,'EUR',2000,7,NULL,ARRAY['immediate','scheduled'],TRUE,10),
  ('employment.addon.bump','employment','FR',ARRAY['jobs'],'search_bump','Remonter l’offre','Remontée sans modifier la date de publication.',1500,'EUR',2000,7,3,ARRAY['immediate','scheduled'],TRUE,20),
  ('employment.addon.featured','employment','FR',ARRAY['jobs'],'featured','À la une Emploi','Placement sponsorisé clairement indiqué.',2900,'EUR',2000,14,NULL,ARRAY['immediate','scheduled'],TRUE,30),
  ('employment.addon.local','employment','FR',ARRAY['jobs'],'local_spotlight','Mise en avant locale','Visibilité dans une zone configurée.',1900,'EUR',2000,7,NULL,ARRAY['immediate','scheduled'],TRUE,40),
  ('employment.addon.seat','employment','FR',ARRAY['jobs'],'additional_team_seat','Siège recruteur supplémentaire','Ajoute un accès recruteur.',1200,'EUR',2000,30,1,ARRAY['immediate'],TRUE,50),
  ('employment.addon.job-credit','employment','FR',ARRAY['jobs'],'additional_listing_credit','Crédit d’offre active','Ajoute un emplacement actif.',2500,'EUR',2000,30,1,ARRAY['immediate'],TRUE,60),
  ('employment.addon.analytics','employment','FR',ARRAY['jobs'],'extended_analytics','Statistiques étendues','Analyse détaillée de la performance.',3900,'EUR',2000,30,NULL,ARRAY['immediate'],TRUE,70),
  ('employment.addon.distribution','employment','FR',ARRAY['jobs'],'distribution_integration','Diffusion partenaire','Cadre de diffusion vers un partenaire activé.',4900,'EUR',2000,30,NULL,ARRAY['immediate'],TRUE,80)
ON CONFLICT (id, vertical_type, market_code) DO UPDATE SET amount_minor = EXCLUDED.amount_minor, currency = EXCLUDED.currency, tax_rate_bps = EXCLUDED.tax_rate_bps, validity_days = EXCLUDED.validity_days, is_active = EXCLUDED.is_active, updated_at = NOW();

COMMENT ON TABLE public.employment_candidate_documents IS 'Private candidate files. Only signed storage URLs may be exposed after an application/member authorization check.';
COMMENT ON TABLE public.employment_recruiter_notes IS 'Private recruiter evaluation notes. Never serialize in candidate-facing contracts.';
COMMENT ON TABLE public.employment_screening_answers IS 'Application-private structured answers; never copy to public listing attributes.';
COMMENT ON COLUMN public.employment_import_sources.secret_reference IS 'Opaque secret-manager reference only; never store provider credentials here.';
