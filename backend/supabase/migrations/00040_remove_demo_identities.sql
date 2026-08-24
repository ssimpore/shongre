-- Demo identities were historically inserted by 00004 alongside immutable
-- reference data. Production must never ship those predictable accounts. The
-- exact id/email predicates deliberately fail closed and cannot match a real
-- account that merely shares a display name.
DELETE FROM public.profiles
WHERE (id, email) IN (
  ('00000000-0000-0000-0000-000000000001'::uuid, 'thomas.laurent@example.fr'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'camille.martin@example.fr'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'lucas.bernard@example.fr'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'admin@shongre.com')
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id IN (
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000003'::uuid,
      '00000000-0000-0000-0000-000000000004'::uuid
    )
  ) THEN
    RAISE EXCEPTION 'A historical demo profile still exists after production cleanup';
  END IF;
END;
$$;
