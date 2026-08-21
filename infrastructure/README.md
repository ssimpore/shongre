# Infrastructure

This boundary owns deployment/runtime orchestration, monitoring guidance, and
generated configuration. Shongre's application source remains in `frontend/`,
`backend/`, and `mobile/`.

The canonical Supabase migrations and functions remain under
`backend/supabase/` because they are backend implementation. Root scripts render
its local host-port configuration from the root environment before invoking the
Supabase CLI. Generated runtime state is written only to ignored paths.

