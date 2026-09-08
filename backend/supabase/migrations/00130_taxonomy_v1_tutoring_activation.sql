-- The tutoring projection takes its category from the market activation. The
-- earlier category alias conversion changed its subcategory but retained the
-- valid, broader Services root, causing every offer upsert to undo the move.
INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
SELECT 'tutoring_activation_v1',market_code,'v1',to_jsonb(activation)
FROM public.vertical_market_activations activation
WHERE vertical_type='tutoring'
  AND category_ids=ARRAY['services']::TEXT[]
  AND subcategory_ids=ARRAY['education']::TEXT[];

UPDATE public.vertical_market_activations activation
SET category_ids=ARRAY['education'],updated_at=now()
FROM public.taxonomy_migration_records record
WHERE record.entity_type='tutoring_activation_v1'
  AND activation.vertical_type='tutoring'
  AND activation.market_code=record.identity;

INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
SELECT 'course_discovery_category_v1',listing.id::TEXT,'v1',
       jsonb_build_object('categoryId',listing.category_id,'categoryPath',listing.attributes->'categoryPath')
FROM public.listings listing
WHERE listing.category_id='services'
  AND EXISTS (
    SELECT 1 FROM public.course_offers offer
    JOIN public.taxonomy_migration_records activation
      ON activation.entity_type='tutoring_activation_v1' AND activation.identity=offer.market_code
    WHERE offer.listing_id=listing.id
  );

UPDATE public.listings listing
SET category_id='education',
    attributes=jsonb_set(listing.attributes,'{categoryPath}','["education"]'::JSONB)
FROM public.taxonomy_migration_records record
WHERE record.entity_type='course_discovery_category_v1'
  AND record.identity=listing.id::TEXT;
