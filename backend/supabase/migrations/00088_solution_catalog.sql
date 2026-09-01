-- Multi-market Shongre application catalog. Definitions are stored once and
-- associated with explicit markets; browser roles never access these tables.
-- Production intentionally receives no catalog seed from the frontend demo.

CREATE TABLE IF NOT EXISTS public.solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description TEXT NOT NULL
    CHECK (char_length(trim(short_description)) BETWEEN 1 AND 500),
  description TEXT NOT NULL
    CHECK (char_length(trim(description)) BETWEEN 1 AND 10000),
  icon TEXT NOT NULL
    CHECK (icon IN ('prospects','facturation','marketplace','pilotage','apps')),
  category TEXT NOT NULL CHECK (char_length(trim(category)) BETWEEN 1 AND 160),
  lifecycle TEXT NOT NULL CHECK (lifecycle IN (
    'DRAFT','INTERNAL','COMING_SOON','BETA','AVAILABLE','MAINTENANCE',
    'DEPRECATED','RETIRED'
  )),
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  languages TEXT[] NOT NULL CHECK (cardinality(languages) BETWEEN 1 AND 20),
  audiences TEXT[] NOT NULL DEFAULT '{}',
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  launch_application_id TEXT CHECK (launch_application_id IS NULL OR
    launch_application_id IN ('marketplace','solutions','prospects','facturation')),
  launch_path TEXT CHECK (
    launch_path IS NULL OR (launch_path LIKE '/%' AND launch_path NOT LIKE '//%')
  ),
  documentation_url TEXT CHECK (
    documentation_url IS NULL OR documentation_url ~ '^https://[^[:space:]]+$'
  ),
  entitlement_key TEXT,
  requires_authentication BOOLEAN NOT NULL DEFAULT FALSE,
  requires_entitlement BOOLEAN NOT NULL DEFAULT FALSE,
  notice TEXT,
  maintenance_message TEXT,
  replacement_slug TEXT CHECK (
    replacement_slug IS NULL OR replacement_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 1000000),
  catalog_visible BOOLEAN NOT NULL DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (available_from IS NULL OR available_until IS NULL OR available_from <= available_until),
  CHECK (lifecycle <> 'AVAILABLE' OR launch_application_id IS NOT NULL),
  CHECK (NOT requires_entitlement OR entitlement_key IS NOT NULL),
  CHECK (NOT requires_entitlement OR requires_authentication),
  CHECK (lifecycle <> 'MAINTENANCE' OR char_length(trim(maintenance_message)) > 0)
);

CREATE INDEX IF NOT EXISTS solutions_public_catalog_idx
  ON public.solutions (catalog_visible, lifecycle, sort_order, name);

CREATE TABLE IF NOT EXISTS public.solution_markets (
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (solution_id, market_code)
);
CREATE INDEX IF NOT EXISTS solution_markets_market_idx
  ON public.solution_markets (market_code, solution_id);

CREATE TABLE IF NOT EXISTS public.solution_release_notes (
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL CHECK (char_length(trim(note_id)) BETWEEN 1 AND 160),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (solution_id, note_id)
);
CREATE INDEX IF NOT EXISTS solution_release_notes_publication_idx
  ON public.solution_release_notes (solution_id, published_at DESC);

CREATE TABLE IF NOT EXISTS public.solution_lifecycle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE RESTRICT,
  from_lifecycle TEXT CHECK (from_lifecycle IS NULL OR from_lifecycle IN (
    'DRAFT','INTERNAL','COMING_SOON','BETA','AVAILABLE','MAINTENANCE',
    'DEPRECATED','RETIRED'
  )),
  to_lifecycle TEXT NOT NULL CHECK (to_lifecycle IN (
    'DRAFT','INTERNAL','COMING_SOON','BETA','AVAILABLE','MAINTENANCE',
    'DEPRECATED','RETIRED'
  )),
  explanation TEXT NOT NULL CHECK (char_length(trim(explanation)) BETWEEN 1 AND 2000),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL CHECK (char_length(trim(actor_name)) BETWEEN 1 AND 255),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS solution_lifecycle_history_solution_idx
  ON public.solution_lifecycle_history (solution_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.solution_mutation_receipts (
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 255),
  operation TEXT NOT NULL CHECK (operation IN ('create','update','reorder','transition')),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  PRIMARY KEY (actor_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS solution_mutation_receipts_expiry_idx
  ON public.solution_mutation_receipts (expires_at);

CREATE OR REPLACE FUNCTION public.solution_catalog_document(p_solution_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'id', solution.id,
    'name', solution.name,
    'slug', solution.slug,
    'shortDescription', solution.short_description,
    'description', solution.description,
    'icon', solution.icon,
    'category', solution.category,
    'lifecycle', solution.lifecycle,
    'availableFrom', solution.available_from,
    'availableUntil', solution.available_until,
    'markets', COALESCE((
      SELECT jsonb_agg(association.market_code ORDER BY association.market_code)
      FROM public.solution_markets association
      WHERE association.solution_id = solution.id
    ), '[]'::jsonb),
    'languages', to_jsonb(solution.languages),
    'audiences', to_jsonb(solution.audiences),
    'capabilities', to_jsonb(solution.capabilities),
    'launchApplicationId', solution.launch_application_id,
    'launchPath', solution.launch_path,
    'documentationUrl', solution.documentation_url,
    'entitlementKey', solution.entitlement_key,
    'requiresAuthentication', solution.requires_authentication,
    'requiresEntitlement', solution.requires_entitlement,
    'releaseNotes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', note.note_id,
        'title', note.title,
        'body', note.body,
        'publishedAt', note.published_at
      ) ORDER BY note.published_at DESC, note.note_id)
      FROM public.solution_release_notes note
      WHERE note.solution_id = solution.id
    ), '[]'::jsonb),
    'notice', solution.notice,
    'maintenanceMessage', solution.maintenance_message,
    'replacementSlug', solution.replacement_slug,
    'sortOrder', solution.sort_order,
    'catalogVisible', solution.catalog_visible,
    'featured', solution.featured,
    'createdAt', solution.created_at,
    'updatedAt', solution.updated_at
  ))
  FROM public.solutions solution
  WHERE solution.id = p_solution_id;
$$;

CREATE OR REPLACE FUNCTION public.get_solution_catalog(
  p_public_only BOOLEAN,
  p_market_code TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL
)
RETURNS SETOF JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.solution_catalog_document(solution.id)
  FROM public.solutions solution
  WHERE (p_slug IS NULL OR solution.slug = p_slug)
    AND (
      NOT p_public_only OR (
        solution.catalog_visible
        AND solution.lifecycle IN ('COMING_SOON','BETA','AVAILABLE','MAINTENANCE','DEPRECATED')
      )
    )
    AND (
      p_market_code IS NULL OR EXISTS (
        SELECT 1
        FROM public.solution_markets association
        WHERE association.solution_id = solution.id
          AND association.market_code = upper(p_market_code)
      )
    )
  ORDER BY solution.sort_order, solution.name, solution.id;
$$;

CREATE OR REPLACE FUNCTION public.mutate_solution_catalog(
  p_operation TEXT,
  p_solution_id UUID,
  p_payload JSONB,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_actor_role TEXT,
  p_idempotency_key TEXT,
  p_request_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_receipt public.solution_mutation_receipts%ROWTYPE;
  current_solution public.solutions%ROWTYPE;
  resolved_solution_id UUID;
  result JSONB;
  item JSONB;
  expected_count INTEGER;
  supplied_count INTEGER;
BEGIN
  IF p_operation NOT IN ('create','update','reorder','transition') THEN
    RAISE EXCEPTION 'unsupported solution mutation' USING ERRCODE = '22023';
  END IF;
  IF char_length(p_idempotency_key) NOT BETWEEN 8 AND 255
     OR p_request_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid solution idempotency evidence' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_actor_id::TEXT || ':' || p_idempotency_key, 0)
  );
  SELECT * INTO existing_receipt
  FROM public.solution_mutation_receipts receipt
  WHERE receipt.actor_id = p_actor_id
    AND receipt.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF existing_receipt.operation <> p_operation
       OR existing_receipt.request_hash <> p_request_hash THEN
      RAISE EXCEPTION 'solution idempotency conflict' USING ERRCODE = '23505';
    END IF;
    RETURN existing_receipt.response;
  END IF;

  IF p_operation = 'create' THEN
    resolved_solution_id := gen_random_uuid();
    INSERT INTO public.solutions (
      id, name, slug, short_description, description, icon, category, lifecycle,
      available_from, available_until, languages, audiences, capabilities,
      launch_application_id, launch_path, documentation_url, entitlement_key,
      requires_authentication, requires_entitlement, notice,
      maintenance_message, replacement_slug, sort_order, catalog_visible,
      featured, created_by, updated_by
    ) VALUES (
      resolved_solution_id,
      trim(p_payload->>'name'),
      p_payload->>'slug',
      trim(p_payload->>'shortDescription'),
      trim(p_payload->>'description'),
      p_payload->>'icon',
      trim(p_payload->>'category'),
      p_payload->>'lifecycle',
      NULLIF(p_payload->>'availableFrom', '')::TIMESTAMPTZ,
      NULLIF(p_payload->>'availableUntil', '')::TIMESTAMPTZ,
      ARRAY(SELECT jsonb_array_elements_text(p_payload->'languages')),
      ARRAY(SELECT jsonb_array_elements_text(p_payload->'audiences')),
      ARRAY(SELECT jsonb_array_elements_text(p_payload->'capabilities')),
      NULLIF(p_payload->>'launchApplicationId', ''),
      NULLIF(p_payload->>'launchPath', ''),
      NULLIF(p_payload->>'documentationUrl', ''),
      NULLIF(p_payload->>'entitlementKey', ''),
      (p_payload->>'requiresAuthentication')::BOOLEAN,
      (p_payload->>'requiresEntitlement')::BOOLEAN,
      NULLIF(p_payload->>'notice', ''),
      NULLIF(p_payload->>'maintenanceMessage', ''),
      NULLIF(p_payload->>'replacementSlug', ''),
      (p_payload->>'sortOrder')::INTEGER,
      (p_payload->>'catalogVisible')::BOOLEAN,
      (p_payload->>'featured')::BOOLEAN,
      p_actor_id,
      p_actor_id
    );

    INSERT INTO public.solution_markets (solution_id, market_code)
    SELECT resolved_solution_id, upper(value)
    FROM jsonb_array_elements_text(p_payload->'markets') value;

    FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(p_payload->'releaseNotes', '[]'::jsonb)) value
    LOOP
      INSERT INTO public.solution_release_notes
        (solution_id, note_id, title, body, published_at)
      VALUES (
        resolved_solution_id,
        item->>'id',
        trim(item->>'title'),
        trim(item->>'body'),
        (item->>'publishedAt')::TIMESTAMPTZ
      );
    END LOOP;

    INSERT INTO public.solution_lifecycle_history
      (solution_id, from_lifecycle, to_lifecycle, explanation, actor_id, actor_name)
    VALUES (
      resolved_solution_id, NULL, p_payload->>'lifecycle',
      'Création de la solution.', p_actor_id, trim(p_actor_name)
    );

  ELSIF p_operation = 'update' THEN
    SELECT * INTO current_solution
    FROM public.solutions
    WHERE id = p_solution_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'solution not found' USING ERRCODE = 'P0002';
    END IF;
    resolved_solution_id := p_solution_id;

    UPDATE public.solutions SET
      name = CASE WHEN p_payload ? 'name' THEN trim(p_payload->>'name') ELSE name END,
      slug = CASE WHEN p_payload ? 'slug' THEN p_payload->>'slug' ELSE slug END,
      short_description = CASE WHEN p_payload ? 'shortDescription' THEN trim(p_payload->>'shortDescription') ELSE short_description END,
      description = CASE WHEN p_payload ? 'description' THEN trim(p_payload->>'description') ELSE description END,
      icon = CASE WHEN p_payload ? 'icon' THEN p_payload->>'icon' ELSE icon END,
      category = CASE WHEN p_payload ? 'category' THEN trim(p_payload->>'category') ELSE category END,
      available_from = CASE WHEN p_payload ? 'availableFrom' THEN NULLIF(p_payload->>'availableFrom', '')::TIMESTAMPTZ ELSE available_from END,
      available_until = CASE WHEN p_payload ? 'availableUntil' THEN NULLIF(p_payload->>'availableUntil', '')::TIMESTAMPTZ ELSE available_until END,
      languages = CASE WHEN p_payload ? 'languages' THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'languages')) ELSE languages END,
      audiences = CASE WHEN p_payload ? 'audiences' THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'audiences')) ELSE audiences END,
      capabilities = CASE WHEN p_payload ? 'capabilities' THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'capabilities')) ELSE capabilities END,
      launch_application_id = CASE WHEN p_payload ? 'launchApplicationId' THEN NULLIF(p_payload->>'launchApplicationId', '') ELSE launch_application_id END,
      launch_path = CASE WHEN p_payload ? 'launchPath' THEN NULLIF(p_payload->>'launchPath', '') ELSE launch_path END,
      documentation_url = CASE WHEN p_payload ? 'documentationUrl' THEN NULLIF(p_payload->>'documentationUrl', '') ELSE documentation_url END,
      entitlement_key = CASE WHEN p_payload ? 'entitlementKey' THEN NULLIF(p_payload->>'entitlementKey', '') ELSE entitlement_key END,
      requires_authentication = CASE WHEN p_payload ? 'requiresAuthentication' THEN (p_payload->>'requiresAuthentication')::BOOLEAN ELSE requires_authentication END,
      requires_entitlement = CASE WHEN p_payload ? 'requiresEntitlement' THEN (p_payload->>'requiresEntitlement')::BOOLEAN ELSE requires_entitlement END,
      notice = CASE WHEN p_payload ? 'notice' THEN NULLIF(p_payload->>'notice', '') ELSE notice END,
      maintenance_message = CASE WHEN p_payload ? 'maintenanceMessage' THEN NULLIF(p_payload->>'maintenanceMessage', '') ELSE maintenance_message END,
      replacement_slug = CASE WHEN p_payload ? 'replacementSlug' THEN NULLIF(p_payload->>'replacementSlug', '') ELSE replacement_slug END,
      sort_order = CASE WHEN p_payload ? 'sortOrder' THEN (p_payload->>'sortOrder')::INTEGER ELSE sort_order END,
      catalog_visible = CASE WHEN p_payload ? 'catalogVisible' THEN (p_payload->>'catalogVisible')::BOOLEAN ELSE catalog_visible END,
      featured = CASE WHEN p_payload ? 'featured' THEN (p_payload->>'featured')::BOOLEAN ELSE featured END,
      updated_by = p_actor_id,
      updated_at = NOW()
    WHERE id = resolved_solution_id;

    IF p_payload ? 'markets' THEN
      IF jsonb_array_length(p_payload->'markets') = 0 THEN
        RAISE EXCEPTION 'at least one solution market is required' USING ERRCODE = '23514';
      END IF;
      DELETE FROM public.solution_markets WHERE solution_id = resolved_solution_id;
      INSERT INTO public.solution_markets (solution_id, market_code)
      SELECT resolved_solution_id, upper(value)
      FROM jsonb_array_elements_text(p_payload->'markets') value;
    END IF;

    IF p_payload ? 'releaseNotes' THEN
      DELETE FROM public.solution_release_notes WHERE solution_id = resolved_solution_id;
      FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'releaseNotes') value
      LOOP
        INSERT INTO public.solution_release_notes
          (solution_id, note_id, title, body, published_at)
        VALUES (
          resolved_solution_id,
          item->>'id',
          trim(item->>'title'),
          trim(item->>'body'),
          (item->>'publishedAt')::TIMESTAMPTZ
        );
      END LOOP;
    END IF;

  ELSIF p_operation = 'reorder' THEN
    LOCK TABLE public.solutions IN SHARE ROW EXCLUSIVE MODE;
    SELECT count(*) INTO expected_count FROM public.solutions;
    SELECT count(*) INTO supplied_count
    FROM jsonb_array_elements_text(p_payload->'solutionIds');
    IF supplied_count <> expected_count
       OR supplied_count <> (
         SELECT count(DISTINCT value)
         FROM jsonb_array_elements_text(p_payload->'solutionIds') value
       )
       OR EXISTS (
         SELECT 1
         FROM jsonb_array_elements_text(p_payload->'solutionIds') value
         LEFT JOIN public.solutions solution ON solution.id = value::UUID
         WHERE solution.id IS NULL
       ) THEN
      RAISE EXCEPTION 'solution order must reference every solution once'
        USING ERRCODE = '23514';
    END IF;
    UPDATE public.solutions solution SET
      sort_order = ordered.ordinality * 10,
      updated_by = p_actor_id,
      updated_at = NOW()
    FROM jsonb_array_elements_text(p_payload->'solutionIds') WITH ORDINALITY
      AS ordered(id, ordinality)
    WHERE solution.id = ordered.id::UUID;
    SELECT COALESCE(jsonb_agg(public.solution_catalog_document(ordered.id::UUID)
      ORDER BY ordered.ordinality), '[]'::jsonb)
    INTO result
    FROM jsonb_array_elements_text(p_payload->'solutionIds') WITH ORDINALITY
      AS ordered(id, ordinality);

  ELSE
    SELECT * INTO current_solution
    FROM public.solutions
    WHERE id = p_solution_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'solution not found' USING ERRCODE = 'P0002';
    END IF;
    IF current_solution.lifecycle = p_payload->>'lifecycle' THEN
      RAISE EXCEPTION 'solution already uses this lifecycle' USING ERRCODE = '23514';
    END IF;
    IF current_solution.lifecycle = 'RETIRED'
       AND p_payload->>'lifecycle' IN ('COMING_SOON','BETA','AVAILABLE','MAINTENANCE','DEPRECATED') THEN
      RAISE EXCEPTION 'retired solution must return to a private lifecycle first'
        USING ERRCODE = '23514';
    END IF;
    resolved_solution_id := p_solution_id;
    UPDATE public.solutions SET
      lifecycle = p_payload->>'lifecycle',
      updated_by = p_actor_id,
      updated_at = NOW()
    WHERE id = resolved_solution_id;
    INSERT INTO public.solution_lifecycle_history
      (solution_id, from_lifecycle, to_lifecycle, explanation, actor_id, actor_name)
    VALUES (
      resolved_solution_id,
      current_solution.lifecycle,
      p_payload->>'lifecycle',
      trim(p_payload->>'explanation'),
      p_actor_id,
      trim(p_actor_name)
    );
  END IF;

  IF p_operation <> 'reorder' THEN
    result := public.solution_catalog_document(resolved_solution_id);
  END IF;

  INSERT INTO public.solution_mutation_receipts
    (actor_id, idempotency_key, operation, request_hash, response)
  VALUES (p_actor_id, p_idempotency_key, p_operation, p_request_hash, result);

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, target_id, target_name, action, details, metadata
  ) VALUES (
    p_actor_id,
    trim(p_actor_name),
    left(trim(p_actor_role), 50),
    CASE WHEN resolved_solution_id IS NULL THEN NULL ELSE resolved_solution_id::TEXT END,
    CASE WHEN resolved_solution_id IS NULL THEN 'solution-catalog' ELSE p_payload->>'name' END,
    'solution_catalog_' || p_operation,
    CASE WHEN p_operation = 'transition'
      THEN trim(p_payload->>'explanation')
      ELSE 'Mutation du catalogue Solutions validée.'
    END,
    jsonb_build_object('operation', p_operation)
  );

  RETURN result;
END;
$$;

ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_release_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_lifecycle_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_mutation_receipts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.solutions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.solution_markets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.solution_release_notes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.solution_lifecycle_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.solution_mutation_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.solutions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solution_markets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solution_release_notes TO service_role;
GRANT SELECT, INSERT ON public.solution_lifecycle_history TO service_role;
GRANT SELECT, INSERT, DELETE ON public.solution_mutation_receipts TO service_role;

REVOKE ALL ON FUNCTION public.solution_catalog_document(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_solution_catalog(BOOLEAN, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutate_solution_catalog(
  TEXT, UUID, JSONB, UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.solution_catalog_document(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_solution_catalog(BOOLEAN, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_solution_catalog(
  TEXT, UUID, JSONB, UUID, TEXT, TEXT, TEXT, TEXT
) TO service_role;
