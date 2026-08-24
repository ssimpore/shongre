INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('private-documents-staging', 'private-documents-staging', FALSE, 10485760,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('private-documents', 'private-documents', FALSE, 10485760,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.private_document_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staging_path TEXT NOT NULL UNIQUE,
  private_path TEXT UNIQUE,
  original_file_name VARCHAR(255) NOT NULL,
  declared_content_type VARCHAR(50) NOT NULL,
  detected_content_type VARCHAR(50),
  declared_size_bytes BIGINT NOT NULL CHECK (declared_size_bytes BETWEEN 1 AND 10485760),
  actual_size_bytes BIGINT CHECK (actual_size_bytes BETWEEN 1 AND 10485760),
  status VARCHAR(30) NOT NULL DEFAULT 'upload_pending'
    CHECK (status IN ('upload_pending', 'ready', 'attached', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS private_document_assets_owner_status_idx
  ON public.private_document_assets (owner_user_id, status, created_at DESC);

ALTER TABLE public.private_document_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.private_document_assets FROM anon, authenticated;
