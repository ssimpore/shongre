-- Expand Education and Employment favorites to account + market scope.
-- Legacy tables remain private compatibility mirrors while older backend
-- instances drain. Legacy rows did not record their action market, so every
-- row is quarantined and scoped truth starts only from explicit new writes.

ALTER TABLE public.favorite_market_scope_review
  DROP CONSTRAINT IF EXISTS favorite_market_scope_review_favorite_kind_check;
ALTER TABLE public.favorite_market_scope_review
  ADD CONSTRAINT favorite_market_scope_review_favorite_kind_check CHECK (
    favorite_kind IN (
      'listing',
      'auto_vehicle',
      'course_tutor',
      'employment_job'
    )
  );

CREATE TABLE IF NOT EXISTS public.course_tutor_market_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_profile_id UUID NOT NULL
    REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL
    REFERENCES public.markets(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tutor_profile_id, market_code)
);

CREATE INDEX IF NOT EXISTS course_tutor_market_favorites_account_created_idx
  ON public.course_tutor_market_favorites
    (user_id, market_code, created_at DESC, tutor_profile_id);

CREATE TABLE IF NOT EXISTS public.employment_job_market_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.employment_jobs(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL
    REFERENCES public.markets(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id, market_code)
);

CREATE INDEX IF NOT EXISTS employment_job_market_favorites_account_created_idx
  ON public.employment_job_market_favorites
    (user_id, market_code, created_at DESC, job_id);

ALTER TABLE public.course_tutor_market_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_job_market_favorites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.course_tutor_market_favorites
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.employment_job_market_favorites
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.course_tutor_market_favorites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.employment_job_market_favorites TO service_role;

-- Keep both old schemas backend-only throughout the rolling expand window.
REVOKE ALL ON TABLE public.course_tutor_favorites
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.employment_saved_jobs
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.course_tutor_favorites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.employment_saved_jobs TO service_role;

-- The quarantine is polymorphic and cannot carry resource foreign keys.
-- Install lifecycle cleanup before the snapshot so deletion cannot leave
-- review metadata for a tutor or job that no longer exists.
CREATE OR REPLACE FUNCTION public.purge_course_tutor_favorite_scope_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM public.favorite_market_scope_review review
  WHERE review.favorite_kind = 'course_tutor'
    AND review.resource_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS purge_course_tutor_favorite_scope_review_trigger
  ON public.course_tutor_profiles;
CREATE TRIGGER purge_course_tutor_favorite_scope_review_trigger
AFTER DELETE ON public.course_tutor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.purge_course_tutor_favorite_scope_review();

CREATE OR REPLACE FUNCTION public.purge_employment_job_favorite_scope_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM public.favorite_market_scope_review review
  WHERE review.favorite_kind = 'employment_job'
    AND review.resource_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS purge_employment_job_favorite_scope_review_trigger
  ON public.employment_jobs;
CREATE TRIGGER purge_employment_job_favorite_scope_review_trigger
AFTER DELETE ON public.employment_jobs
FOR EACH ROW
EXECUTE FUNCTION public.purge_employment_job_favorite_scope_review();

REVOKE ALL ON FUNCTION public.purge_course_tutor_favorite_scope_review()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_employment_job_favorite_scope_review()
  FROM PUBLIC, anon, authenticated;

-- Hold legacy writers through the snapshot and publication of the compatibility
-- layer. Deployments must still drain old writers before migrations 98-101: a
-- legacy RPC body that resolved before this lock can resume after commit.
LOCK TABLE public.course_tutor_favorites IN SHARE MODE;
LOCK TABLE public.employment_saved_jobs IN SHARE MODE;

WITH legacy_candidates AS (
  SELECT
    favorite.user_id,
    favorite.tutor_profile_id,
    favorite.created_at,
    ARRAY(
      SELECT DISTINCT candidate.market_code
      FROM (
        SELECT UPPER(BTRIM(profile.market_code)) AS market_code
        UNION ALL
        SELECT UPPER(BTRIM(offer.market_code)) AS market_code
        FROM public.course_offers offer
        WHERE offer.tutor_profile_id = favorite.tutor_profile_id
      ) candidate
      WHERE candidate.market_code ~ '^[A-Z]{2}$'
      ORDER BY candidate.market_code
    ) AS market_codes
  FROM public.course_tutor_favorites favorite
  JOIN public.course_tutor_profiles profile
    ON profile.id = favorite.tutor_profile_id
)
INSERT INTO public.favorite_market_scope_review (
  favorite_kind,
  user_id,
  resource_id,
  original_created_at,
  candidate_market_codes,
  reason
)
SELECT
  'course_tutor',
  user_id,
  tutor_profile_id,
  created_at,
  market_codes,
  'market_action_provenance_missing'
FROM legacy_candidates
ON CONFLICT (favorite_kind, user_id, resource_id) DO NOTHING;

WITH legacy_candidates AS (
  SELECT
    profile.user_id,
    favorite.job_id,
    favorite.created_at,
    ARRAY(
      SELECT DISTINCT UPPER(BTRIM(candidate.market_code))
      FROM (
        SELECT job.market_code
      ) candidate
      WHERE UPPER(BTRIM(candidate.market_code)) ~ '^[A-Z]{2}$'
      ORDER BY UPPER(BTRIM(candidate.market_code))
    ) AS market_codes
  FROM public.employment_saved_jobs favorite
  JOIN public.employment_candidate_profiles profile
    ON profile.id = favorite.candidate_id
  JOIN public.employment_jobs job ON job.id = favorite.job_id
)
INSERT INTO public.favorite_market_scope_review (
  favorite_kind,
  user_id,
  resource_id,
  original_created_at,
  candidate_market_codes,
  reason
)
SELECT
  'employment_job',
  user_id,
  job_id,
  created_at,
  market_codes,
  'market_action_provenance_missing'
FROM legacy_candidates
ON CONFLICT (favorite_kind, user_id, resource_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.list_saved_course_tutor_ids(
  p_user_id UUID,
  p_market_code VARCHAR
)
RETURNS TABLE(tutor_profile_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT favorite.tutor_profile_id
  FROM public.course_tutor_market_favorites favorite
  WHERE favorite.user_id = p_user_id
    AND favorite.market_code = UPPER(BTRIM(p_market_code))
  ORDER BY favorite.created_at DESC, favorite.tutor_profile_id;
$$;

CREATE OR REPLACE FUNCTION public.set_course_tutor_favorite(
  p_user_id UUID,
  p_tutor_profile_id UUID,
  p_market_code VARCHAR,
  p_is_favorite BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  normalized_market_code VARCHAR(2) := UPPER(BTRIM(p_market_code));
BEGIN
  IF p_user_id IS NULL
     OR p_tutor_profile_id IS NULL
     OR p_market_code IS NULL
     OR normalized_market_code !~ '^[A-Z]{2}$'
     OR p_is_favorite IS NULL THEN
    RAISE EXCEPTION 'Invalid tutor favorite state or market code'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'course-favorite:' || p_user_id::TEXT || ':' || p_tutor_profile_id::TEXT,
      0
    )
  );

  IF p_is_favorite AND NOT EXISTS (
    SELECT 1
    FROM public.course_tutor_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.tutor_profile_id = p_tutor_profile_id
      AND favorite.market_code = normalized_market_code
  ) THEN
    PERFORM 1
    FROM public.course_tutor_profiles profile
    JOIN public.course_market_configs config
      ON config.market_code = profile.market_code
    WHERE profile.id = p_tutor_profile_id
      AND profile.market_code = normalized_market_code
      AND profile.moderation_status = 'approved'
      AND config.is_enabled
      AND EXISTS (
        SELECT 1
        FROM public.course_offers offer
        WHERE offer.tutor_profile_id = profile.id
          AND offer.market_code = normalized_market_code
          AND offer.status = 'published'
      )
    FOR KEY SHARE OF profile;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Tutor is unavailable in the requested market'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.course_tutor_market_favorites (
      user_id,
      tutor_profile_id,
      market_code
    ) VALUES (
      p_user_id,
      p_tutor_profile_id,
      normalized_market_code
    ) ON CONFLICT (user_id, tutor_profile_id, market_code) DO NOTHING;
  ELSIF NOT p_is_favorite THEN
    DELETE FROM public.course_tutor_market_favorites
    WHERE user_id = p_user_id
      AND tutor_profile_id = p_tutor_profile_id
      AND market_code = normalized_market_code;
  END IF;

  IF p_is_favorite THEN
    INSERT INTO public.course_tutor_favorites (user_id, tutor_profile_id)
    VALUES (p_user_id, p_tutor_profile_id)
    ON CONFLICT (user_id, tutor_profile_id) DO NOTHING;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM public.course_tutor_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.tutor_profile_id = p_tutor_profile_id
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.favorite_market_scope_review review
    WHERE review.favorite_kind = 'course_tutor'
      AND review.user_id = p_user_id
      AND review.resource_id = p_tutor_profile_id
  ) THEN
    DELETE FROM public.course_tutor_favorites
    WHERE user_id = p_user_id
      AND tutor_profile_id = p_tutor_profile_id;
  END IF;

  RETURN p_is_favorite;
END;
$$;

-- Compatibility path for older Education backend instances. It resolves only
-- a single currently active market, then delegates to the idempotent setter.
CREATE OR REPLACE FUNCTION public.toggle_course_tutor_favorite(
  p_user_id UUID,
  p_tutor_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  resolved_market_code VARCHAR(2);
  desired_state BOOLEAN;
BEGIN
  SELECT MIN(profile.market_code)
    INTO resolved_market_code
  FROM public.course_tutor_profiles profile
  JOIN public.course_market_configs config
    ON config.market_code = profile.market_code
  WHERE profile.id = p_tutor_profile_id
    AND profile.moderation_status = 'approved'
    AND config.is_enabled
    AND EXISTS (
      SELECT 1
      FROM public.course_offers offer
      WHERE offer.tutor_profile_id = profile.id
        AND offer.market_code = profile.market_code
        AND offer.status = 'published'
    )
  HAVING COUNT(DISTINCT profile.market_code) = 1;

  IF resolved_market_code IS NULL THEN
    RAISE EXCEPTION 'Tutor favorite market cannot be resolved unambiguously'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'course-favorite:' || p_user_id::TEXT || ':' || p_tutor_profile_id::TEXT,
      0
    )
  );
  desired_state := NOT EXISTS (
    SELECT 1
    FROM public.course_tutor_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.tutor_profile_id = p_tutor_profile_id
  );
  PERFORM public.set_course_tutor_favorite(
    p_user_id,
    p_tutor_profile_id,
    resolved_market_code,
    desired_state
  );
  IF NOT desired_state AND NOT EXISTS (
    SELECT 1
    FROM public.course_tutor_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.tutor_profile_id = p_tutor_profile_id
  ) THEN
    DELETE FROM public.course_tutor_favorites
    WHERE user_id = p_user_id
      AND tutor_profile_id = p_tutor_profile_id;
    DELETE FROM public.favorite_market_scope_review
    WHERE favorite_kind = 'course_tutor'
      AND user_id = p_user_id
      AND resource_id = p_tutor_profile_id;
  END IF;
  RETURN desired_state;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_saved_employment_job_ids(
  p_user_id UUID,
  p_market_code VARCHAR
)
RETURNS TABLE(job_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT favorite.job_id
  FROM public.employment_job_market_favorites favorite
  WHERE favorite.user_id = p_user_id
    AND favorite.market_code = UPPER(BTRIM(p_market_code))
  ORDER BY favorite.created_at DESC, favorite.job_id;
$$;

CREATE OR REPLACE FUNCTION public.set_employment_job_favorite(
  p_user_id UUID,
  p_job_id UUID,
  p_market_code VARCHAR,
  p_is_favorite BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  normalized_market_code VARCHAR(2) := UPPER(BTRIM(p_market_code));
  legacy_candidate_id UUID;
BEGIN
  IF p_user_id IS NULL
     OR p_job_id IS NULL
     OR p_market_code IS NULL
     OR normalized_market_code !~ '^[A-Z]{2}$'
     OR p_is_favorite IS NULL THEN
    RAISE EXCEPTION 'Invalid saved-job state or market code'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'employment-favorite:' || p_user_id::TEXT || ':' || p_job_id::TEXT,
      0
    )
  );

  IF p_is_favorite AND NOT EXISTS (
    SELECT 1
    FROM public.employment_job_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.job_id = p_job_id
      AND favorite.market_code = normalized_market_code
  ) THEN
    SELECT profile.id
      INTO legacy_candidate_id
    FROM public.employment_candidate_profiles profile
    WHERE profile.user_id = p_user_id;
    IF legacy_candidate_id IS NULL THEN
      RAISE EXCEPTION 'Candidate profile is unavailable'
        USING ERRCODE = 'P0002';
    END IF;

    PERFORM 1
    FROM public.employment_jobs job
    JOIN public.employment_market_configs config
      ON config.market_code = job.market_code
    WHERE job.id = p_job_id
      AND job.market_code = normalized_market_code
      AND job.lifecycle = 'published'
      AND job.moderation_status = 'approved'
      AND job.expires_at > NOW()
      AND config.is_enabled
    FOR KEY SHARE OF job;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Job is unavailable in the requested market'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.employment_job_market_favorites (
      user_id,
      job_id,
      market_code
    ) VALUES (
      p_user_id,
      p_job_id,
      normalized_market_code
    ) ON CONFLICT (user_id, job_id, market_code) DO NOTHING;
  ELSIF NOT p_is_favorite THEN
    DELETE FROM public.employment_job_market_favorites
    WHERE user_id = p_user_id
      AND job_id = p_job_id
      AND market_code = normalized_market_code;
  END IF;

  IF legacy_candidate_id IS NULL THEN
    SELECT profile.id
      INTO legacy_candidate_id
    FROM public.employment_candidate_profiles profile
    WHERE profile.user_id = p_user_id;
  END IF;

  IF p_is_favorite AND legacy_candidate_id IS NOT NULL THEN
    INSERT INTO public.employment_saved_jobs (candidate_id, job_id)
    VALUES (legacy_candidate_id, p_job_id)
    ON CONFLICT (candidate_id, job_id) DO NOTHING;
  ELSIF NOT p_is_favorite
    AND legacy_candidate_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.employment_job_market_favorites favorite
      WHERE favorite.user_id = p_user_id
        AND favorite.job_id = p_job_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.favorite_market_scope_review review
      WHERE review.favorite_kind = 'employment_job'
        AND review.user_id = p_user_id
        AND review.resource_id = p_job_id
    ) THEN
    DELETE FROM public.employment_saved_jobs
    WHERE candidate_id = legacy_candidate_id AND job_id = p_job_id;
  END IF;

  RETURN p_is_favorite;
END;
$$;

-- Employment's old backend wrote the legacy table directly. Mirror inserts
-- into the scoped table only after the same active-market validation.
CREATE OR REPLACE FUNCTION public.mirror_legacy_employment_saved_job_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  resolved_user_id UUID;
  resolved_market_code VARCHAR(2);
BEGIN
  SELECT profile.user_id
    INTO resolved_user_id
  FROM public.employment_candidate_profiles profile
  WHERE profile.id = NEW.candidate_id;

  SELECT job.market_code
    INTO resolved_market_code
  FROM public.employment_jobs job
  JOIN public.employment_market_configs config
    ON config.market_code = job.market_code
  WHERE job.id = NEW.job_id
    AND job.lifecycle = 'published'
    AND job.moderation_status = 'approved'
    AND job.expires_at > NOW()
    AND config.is_enabled;

  IF resolved_user_id IS NULL OR resolved_market_code IS NULL THEN
    RAISE EXCEPTION 'Legacy saved job is unavailable in an active market'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.set_employment_job_favorite(
    resolved_user_id,
    NEW.job_id,
    resolved_market_code,
    TRUE
  );
  RETURN NEW;
END;
$$;

-- An old unscoped delete may remove a single scoped row. It cannot erase two
-- independent market choices, so ambiguous deletes fail closed by cancelling
-- the legacy row deletion.
CREATE OR REPLACE FUNCTION public.mirror_legacy_employment_saved_job_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  resolved_user_id UUID;
  scoped_market_count INTEGER;
BEGIN
  SELECT profile.user_id
    INTO resolved_user_id
  FROM public.employment_candidate_profiles profile
  WHERE profile.id = OLD.candidate_id;

  IF resolved_user_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'employment-favorite:' || resolved_user_id::TEXT || ':' || OLD.job_id::TEXT,
      0
    )
  );
  SELECT COUNT(*)
    INTO scoped_market_count
  FROM public.employment_job_market_favorites favorite
  WHERE favorite.user_id = resolved_user_id
    AND favorite.job_id = OLD.job_id;

  IF scoped_market_count > 1 THEN
    RETURN NULL;
  END IF;
  IF scoped_market_count = 1 THEN
    DELETE FROM public.employment_job_market_favorites
    WHERE user_id = resolved_user_id AND job_id = OLD.job_id;
  END IF;
  DELETE FROM public.favorite_market_scope_review
  WHERE favorite_kind = 'employment_job'
    AND user_id = resolved_user_id
    AND resource_id = OLD.job_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS employment_saved_jobs_market_insert_mirror
  ON public.employment_saved_jobs;
CREATE TRIGGER employment_saved_jobs_market_insert_mirror
AFTER INSERT ON public.employment_saved_jobs
FOR EACH ROW EXECUTE FUNCTION
  public.mirror_legacy_employment_saved_job_insert();

DROP TRIGGER IF EXISTS employment_saved_jobs_market_delete_mirror
  ON public.employment_saved_jobs;
CREATE TRIGGER employment_saved_jobs_market_delete_mirror
BEFORE DELETE ON public.employment_saved_jobs
FOR EACH ROW EXECUTE FUNCTION
  public.mirror_legacy_employment_saved_job_delete();

REVOKE ALL ON FUNCTION public.list_saved_course_tutor_ids(UUID, VARCHAR)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_course_tutor_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_course_tutor_favorite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_saved_employment_job_ids(UUID, VARCHAR)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_employment_job_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mirror_legacy_employment_saved_job_insert()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mirror_legacy_employment_saved_job_delete()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.list_saved_course_tutor_ids(UUID, VARCHAR)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_course_tutor_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_course_tutor_favorite(UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.list_saved_employment_job_ids(UUID, VARCHAR)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_employment_job_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  TO service_role;

COMMENT ON TABLE public.course_tutor_market_favorites IS
  'Authoritative Education tutor favorites partitioned by account and action market.';
COMMENT ON TABLE public.employment_job_market_favorites IS
  'Authoritative Employment saved jobs partitioned by account and action market.';
