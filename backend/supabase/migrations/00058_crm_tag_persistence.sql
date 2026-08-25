-- CRM tags are normalized relational data. The service-role-only replacement
-- function keeps an entity's tag set deterministic and tenant scoped.

WITH ranked_tags AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY tenant_id, lower(name)
      ORDER BY created_at, id
    ) AS canonical_id
  FROM public.crm_tags
)
INSERT INTO public.crm_entity_tags (
  tenant_id,
  tag_id,
  entity_type,
  entity_id,
  created_at
)
SELECT
  entity_tag.tenant_id,
  ranked.canonical_id,
  entity_tag.entity_type,
  entity_tag.entity_id,
  entity_tag.created_at
FROM public.crm_entity_tags entity_tag
JOIN ranked_tags ranked ON ranked.id = entity_tag.tag_id
WHERE ranked.id <> ranked.canonical_id
ON CONFLICT DO NOTHING;

WITH ranked_tags AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY tenant_id, lower(name)
      ORDER BY created_at, id
    ) AS canonical_id
  FROM public.crm_tags
)
DELETE FROM public.crm_entity_tags entity_tag
USING ranked_tags ranked
WHERE entity_tag.tag_id = ranked.id
  AND ranked.id <> ranked.canonical_id;

WITH ranked_tags AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY tenant_id, lower(name)
      ORDER BY created_at, id
    ) AS canonical_id
  FROM public.crm_tags
)
DELETE FROM public.crm_tags tag
USING ranked_tags ranked
WHERE tag.id = ranked.id
  AND ranked.id <> ranked.canonical_id;

CREATE UNIQUE INDEX IF NOT EXISTS crm_tags_tenant_lower_name_uidx
  ON public.crm_tags (tenant_id, lower(name));

CREATE OR REPLACE FUNCTION public.replace_crm_entity_tags(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_tag_names TEXT[]
)
RETURNS TABLE(tag_id UUID, name TEXT, color_token TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  normalized_names TEXT[];
  selected_name TEXT;
  selected_tag_id UUID;
  target_exists BOOLEAN := FALSE;
BEGIN
  IF p_entity_type NOT IN ('account', 'contact', 'opportunity') THEN
    RAISE EXCEPTION 'CRM_TAG_ENTITY_TYPE_INVALID';
  END IF;

  CASE p_entity_type
    WHEN 'account' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.crm_accounts
        WHERE tenant_id = p_tenant_id AND id = p_entity_id
      ) INTO target_exists;
    WHEN 'contact' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.crm_contacts
        WHERE tenant_id = p_tenant_id AND id = p_entity_id
      ) INTO target_exists;
    WHEN 'opportunity' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.crm_opportunities
        WHERE tenant_id = p_tenant_id AND id = p_entity_id
      ) INTO target_exists;
  END CASE;

  IF NOT target_exists THEN
    RAISE EXCEPTION 'CRM_TAG_ENTITY_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_tag_names, ARRAY[]::TEXT[])) AS value
    WHERE char_length(btrim(value)) > 80
  ) THEN
    RAISE EXCEPTION 'CRM_TAG_NAME_TOO_LONG';
  END IF;

  SELECT coalesce(array_agg(value ORDER BY lower(value)), ARRAY[]::TEXT[])
  INTO normalized_names
  FROM (
    SELECT DISTINCT ON (lower(btrim(raw_value))) btrim(raw_value) AS value
    FROM unnest(coalesce(p_tag_names, ARRAY[]::TEXT[]))
      WITH ORDINALITY AS input(raw_value, input_position)
    WHERE btrim(raw_value) <> ''
    ORDER BY lower(btrim(raw_value)), input_position
  ) normalized;

  IF cardinality(normalized_names) > 50 THEN
    RAISE EXCEPTION 'CRM_TAG_LIMIT_EXCEEDED';
  END IF;

  DELETE FROM public.crm_entity_tags
  WHERE tenant_id = p_tenant_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id;

  FOREACH selected_name IN ARRAY normalized_names LOOP
    INSERT INTO public.crm_tags (tenant_id, name)
    VALUES (p_tenant_id, selected_name)
    ON CONFLICT DO NOTHING;

    SELECT tag.id INTO selected_tag_id
    FROM public.crm_tags tag
    WHERE tag.tenant_id = p_tenant_id
      AND lower(tag.name) = lower(selected_name)
    LIMIT 1;

    INSERT INTO public.crm_entity_tags (
      tenant_id,
      tag_id,
      entity_type,
      entity_id
    ) VALUES (
      p_tenant_id,
      selected_tag_id,
      p_entity_type,
      p_entity_id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN QUERY
  SELECT tag.id, tag.name, tag.color_token
  FROM public.crm_entity_tags entity_tag
  JOIN public.crm_tags tag ON tag.id = entity_tag.tag_id
  WHERE entity_tag.tenant_id = p_tenant_id
    AND entity_tag.entity_type = p_entity_type
    AND entity_tag.entity_id = p_entity_id
  ORDER BY lower(tag.name);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_crm_entity_tags(UUID, TEXT, UUID, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_crm_entity_tags(UUID, TEXT, UUID, TEXT[])
  TO service_role;

REVOKE ALL ON TABLE public.crm_tags, public.crm_entity_tags
  FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.crm_tags, public.crm_entity_tags
  TO service_role;

COMMENT ON FUNCTION public.replace_crm_entity_tags(UUID, TEXT, UUID, TEXT[]) IS
  'Atomically replaces normalized tags for one tenant-owned CRM entity.';
