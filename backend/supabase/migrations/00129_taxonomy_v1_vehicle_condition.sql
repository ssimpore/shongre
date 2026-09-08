-- Preserve the vehicle condition codes formerly rendered by the Web form. The
-- "excellent" identity is distinct from the general "very_good" option; no
-- stored listing/draft values are rewritten. Existing authoring is never replaced.
DO $import$
DECLARE proposed JSONB := $payload${"id":"condition","market_code":"FR","label":"État","field_type":"single_select","vehicle_types":["agricultural","parts","car","motorcycle","utility","truck","motorhome","boat","other","construction"],"options":[{"value":"new","label":"Neuf","sortOrder":10},{"value":"excellent","label":"Excellent","sortOrder":20},{"value":"good","label":"Bon","sortOrder":30},{"value":"fair","label":"Correct","sortOrder":40},{"value":"damaged","label":"Endommagé","sortOrder":50},{"value":"for_parts","label":"Pour pièces","sortOrder":60}],"is_required":true,"is_filterable":true,"is_public":true,"schema_version":1,"is_active":true,"sort_order":60,"public_payload":{}}$payload$::JSONB;
  entry JSONB; c public.taxonomy_configuration; previous public.taxonomy_publications;
  payload JSONB; result BIGINT;
BEGIN
  IF EXISTS(SELECT 1 FROM auto_attribute_definitions WHERE id='condition' AND market_code='FR') THEN
    RAISE EXCEPTION 'Vehicle condition already authored; reconcile the explicit import before applying';
  END IF;
  INSERT INTO public.auto_attribute_definitions(id,market_code,label,field_type,vehicle_types,options,is_required,is_filterable,is_public,schema_version,is_active,sort_order,public_payload)
  SELECT r.id,r.market_code,r.label,r.field_type,r.vehicle_types,r.options,r.is_required,r.is_filterable,r.is_public,r.schema_version,r.is_active,r.sort_order,r.public_payload
  FROM jsonb_populate_record(NULL::public.auto_attribute_definitions,proposed) r;
  SELECT value INTO STRICT entry FROM jsonb_array_elements(public.read_taxonomy_references()) WHERE value->>'id'='auto_attribute_definitions:FR:condition';
  INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
    VALUES ('client_reference_v1',entry->>'id','unversioned',jsonb_build_object('source','AutoPublishWizardPage condition + vehicleConditionSchema','reference',entry));
  SELECT * INTO c FROM public.taxonomy_configuration WHERE singleton FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO STRICT previous FROM public.taxonomy_publications WHERE revision=c.published_revision;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(previous.snapshot->'referenceEntries') r WHERE r->>'id'=entry->>'id') THEN
    RAISE EXCEPTION 'Vehicle condition already published; reconcile the explicit import before applying';
  END IF;
  payload := jsonb_set(previous.snapshot,'{referenceEntries}',(previous.snapshot->'referenceEntries') || jsonb_build_array(entry));
  INSERT INTO public.taxonomy_publications(taxonomy_version_id,draft_revision,checksum,snapshot,change_reason)
  VALUES(previous.taxonomy_version_id,c.draft_revision+1,encode(sha256(convert_to(payload::text,'UTF8')),'hex'),payload,'Import vehicle condition into canonical v1 without changing recorded values') RETURNING revision INTO result;
  INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
    VALUES ('client_reference_publication_v1',result::TEXT,'v1',jsonb_build_object('sourceRevision',previous.revision,'sourceChecksum',previous.checksum,'targetRevision',result));
  UPDATE public.taxonomy_configuration SET draft_revision=draft_revision+1,published_revision=result,updated_at=now() WHERE singleton;
  PERFORM public.refresh_taxonomy_draft_snapshot();
END; $import$;
