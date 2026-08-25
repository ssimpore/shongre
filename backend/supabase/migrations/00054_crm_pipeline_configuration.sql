-- Atomic, versioned CRM pipeline configuration. The API validates the public
-- contract first; this function keeps the pipeline and its ordered stages in a
-- single PostgreSQL transaction and remains callable only by the backend.

CREATE OR REPLACE FUNCTION public.save_crm_pipeline(
  p_tenant_id UUID,
  p_workspace_id UUID,
  p_pipeline_id UUID,
  p_expected_version INTEGER,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pipeline_id UUID := p_pipeline_id;
  v_current_version INTEGER;
  v_stage JSONB;
  v_stage_id UUID;
  v_retained_stage_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'CRM_PIPELINE_INVALID';
  END IF;
  IF jsonb_typeof(p_payload->'stages') <> 'array'
     OR jsonb_array_length(p_payload->'stages') < 3
     OR jsonb_array_length(p_payload->'stages') > 30 THEN
    RAISE EXCEPTION 'CRM_PIPELINE_INVALID_STAGES';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.crm_workspaces
    WHERE id = p_workspace_id AND tenant_id = p_tenant_id AND is_active
  ) THEN
    RAISE EXCEPTION 'CRM_WORKSPACE_NOT_FOUND';
  END IF;

  IF COALESCE((p_payload->>'isDefault')::BOOLEAN, FALSE) THEN
    UPDATE public.crm_pipelines
    SET is_default = FALSE
    WHERE tenant_id = p_tenant_id
      AND workspace_id = p_workspace_id
      AND is_default
      AND (p_pipeline_id IS NULL OR id <> p_pipeline_id);
  END IF;

  IF v_pipeline_id IS NULL THEN
    INSERT INTO public.crm_pipelines (
      tenant_id, workspace_id, name, description, is_default, is_active
    ) VALUES (
      p_tenant_id,
      p_workspace_id,
      p_payload->>'name',
      NULLIF(p_payload->>'description', ''),
      COALESCE((p_payload->>'isDefault')::BOOLEAN, FALSE),
      TRUE
    )
    RETURNING id INTO v_pipeline_id;
  ELSE
    SELECT version INTO v_current_version
    FROM public.crm_pipelines
    WHERE id = v_pipeline_id
      AND tenant_id = p_tenant_id
      AND workspace_id = p_workspace_id
      AND is_active
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CRM_PIPELINE_NOT_FOUND';
    END IF;
    IF p_expected_version IS NULL OR v_current_version <> p_expected_version THEN
      RAISE EXCEPTION 'CRM_CONFLICT' USING ERRCODE = '40001';
    END IF;

    UPDATE public.crm_pipelines
    SET name = p_payload->>'name',
        description = NULLIF(p_payload->>'description', ''),
        is_default = COALESCE((p_payload->>'isDefault')::BOOLEAN, FALSE)
    WHERE id = v_pipeline_id;

    -- Vacate unique positions before reordering existing stages.
    UPDATE public.crm_pipeline_stages
    SET position = position + 1000
    WHERE tenant_id = p_tenant_id AND pipeline_id = v_pipeline_id;
  END IF;

  FOR v_stage IN SELECT value FROM jsonb_array_elements(p_payload->'stages')
  LOOP
    v_stage_id := NULLIF(v_stage->>'id', '')::UUID;
    IF v_stage_id IS NULL THEN
      INSERT INTO public.crm_pipeline_stages (
        tenant_id, pipeline_id, name, position, default_probability,
        color_token, is_open, is_won, is_lost, required_fields, sla_hours
      ) VALUES (
        p_tenant_id,
        v_pipeline_id,
        v_stage->>'name',
        (v_stage->>'position')::INTEGER,
        (v_stage->>'defaultProbability')::INTEGER,
        COALESCE(NULLIF(v_stage->>'colorToken', ''), 'neutral'),
        COALESCE((v_stage->>'isOpen')::BOOLEAN, TRUE),
        COALESCE((v_stage->>'isWon')::BOOLEAN, FALSE),
        COALESCE((v_stage->>'isLost')::BOOLEAN, FALSE),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_stage->'requiredFields')), ARRAY[]::TEXT[]),
        NULLIF(v_stage->>'slaHours', '')::INTEGER
      )
      RETURNING id INTO v_stage_id;
    ELSE
      UPDATE public.crm_pipeline_stages
      SET name = v_stage->>'name',
          position = (v_stage->>'position')::INTEGER,
          default_probability = (v_stage->>'defaultProbability')::INTEGER,
          color_token = COALESCE(NULLIF(v_stage->>'colorToken', ''), 'neutral'),
          is_open = COALESCE((v_stage->>'isOpen')::BOOLEAN, TRUE),
          is_won = COALESCE((v_stage->>'isWon')::BOOLEAN, FALSE),
          is_lost = COALESCE((v_stage->>'isLost')::BOOLEAN, FALSE),
          required_fields = COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_stage->'requiredFields')), ARRAY[]::TEXT[]),
          sla_hours = NULLIF(v_stage->>'slaHours', '')::INTEGER,
          version = version + 1,
          updated_at = now()
      WHERE id = v_stage_id
        AND tenant_id = p_tenant_id
        AND pipeline_id = v_pipeline_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'CRM_STAGE_NOT_FOUND';
      END IF;
    END IF;
    v_retained_stage_ids := array_append(v_retained_stage_ids, v_stage_id);
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.crm_opportunities opportunity
    JOIN public.crm_pipeline_stages stage ON stage.id = opportunity.stage_id
    WHERE opportunity.tenant_id = p_tenant_id
      AND stage.pipeline_id = v_pipeline_id
      AND NOT (stage.id = ANY(v_retained_stage_ids))
  ) THEN
    RAISE EXCEPTION 'CRM_STAGE_IN_USE';
  END IF;

  DELETE FROM public.crm_pipeline_stages
  WHERE tenant_id = p_tenant_id
    AND pipeline_id = v_pipeline_id
    AND NOT (id = ANY(v_retained_stage_ids));

  RETURN v_pipeline_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_crm_pipeline(UUID,UUID,UUID,INTEGER,JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_crm_pipeline(UUID,UUID,UUID,INTEGER,JSONB)
  TO service_role;
