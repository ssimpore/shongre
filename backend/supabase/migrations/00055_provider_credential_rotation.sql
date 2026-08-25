-- Server-only atomic credential installation and rotation. Plaintext never
-- reaches PostgreSQL: the backend encrypts with AES-256-GCM before this call.

CREATE OR REPLACE FUNCTION public.rotate_provider_credential(
  p_connection_id UUID,
  p_expected_version INTEGER,
  p_encrypted_secret_base64 TEXT,
  p_encryption_iv_base64 TEXT,
  p_encryption_tag_base64 TEXT,
  p_key_version TEXT,
  p_credential_hint TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_current_version INTEGER;
  v_next_version INTEGER;
BEGIN
  SELECT version INTO v_current_version
  FROM public.provider_connections
  WHERE id = p_connection_id
    AND status <> 'REVOKED'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVIDER_CONNECTION_NOT_FOUND';
  END IF;
  IF v_current_version <> p_expected_version THEN
    RAISE EXCEPTION 'PROVIDER_CONNECTION_CONFLICT' USING ERRCODE = '40001';
  END IF;
  IF p_key_version IS NULL OR char_length(p_key_version) < 1 THEN
    RAISE EXCEPTION 'PROVIDER_CREDENTIAL_KEY_VERSION_REQUIRED';
  END IF;

  UPDATE public.provider_credentials
  SET revoked_at = now()
  WHERE provider_connection_id = p_connection_id
    AND revoked_at IS NULL;

  INSERT INTO public.provider_credentials (
    provider_connection_id,
    encrypted_secret,
    encryption_iv,
    encryption_tag,
    key_version,
    credential_hint,
    rotated_at
  ) VALUES (
    p_connection_id,
    decode(p_encrypted_secret_base64, 'base64'),
    decode(p_encryption_iv_base64, 'base64'),
    decode(p_encryption_tag_base64, 'base64'),
    p_key_version,
    p_credential_hint,
    now()
  );

  UPDATE public.provider_connections
  SET status = 'DRAFT',
      last_validated_at = NULL,
      last_error_code = NULL
  WHERE id = p_connection_id
  RETURNING version INTO v_next_version;

  RETURN v_next_version;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_provider_credential(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_provider_credential(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,TEXT)
  TO service_role;
