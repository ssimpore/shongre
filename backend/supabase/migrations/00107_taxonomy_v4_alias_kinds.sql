-- Preserve the provenance of compatibility aliases imported from taxonomy v3
-- and earlier v4 identities instead of collapsing every redirect to `id` or
-- `slug`.

ALTER TABLE public.taxonomy_aliases
    DROP CONSTRAINT IF EXISTS taxonomy_aliases_alias_kind_check;

ALTER TABLE public.taxonomy_aliases
    ADD CONSTRAINT taxonomy_aliases_alias_kind_check
    CHECK (alias_kind IN (
        'id', 'slug', 'label', 'translation',
        'canonical_id', 'canonical_slug',
        'v3_id', 'v3_slug', 'previous_v4_id'
    ));

