-- Taxonomy v4 contains exact fulfillment addresses that are neither public nor
-- moderator-only. Preserve that explicit private classification in PostgreSQL;
-- public taxonomy projections continue to expose only `privacy = 'public'`.

ALTER TABLE public.taxonomy_attributes
    DROP CONSTRAINT IF EXISTS taxonomy_attributes_privacy_check;

ALTER TABLE public.taxonomy_attributes
    ADD CONSTRAINT taxonomy_attributes_privacy_check
    CHECK (privacy IN ('public', 'seller_only', 'moderator_only', 'private'));

