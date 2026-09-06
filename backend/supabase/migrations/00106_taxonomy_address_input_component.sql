-- The delivery taxonomy owns exact pickup/drop-off address fields. Keep their
-- private `address_input` control distinct from public address autocomplete.

ALTER TABLE public.taxonomy_attributes
    DROP CONSTRAINT IF EXISTS taxonomy_attributes_ui_component_check;

ALTER TABLE public.taxonomy_attributes
    ADD CONSTRAINT taxonomy_attributes_ui_component_check
    CHECK (ui_component IS NULL OR ui_component IN (
        'select', 'number_input', 'switch', 'text_input', 'money_input',
        'checkbox_group', 'stepper', 'radio_group', 'autocomplete',
        'date_picker', 'segmented_control', 'textarea', 'hidden',
        'cascading_select', 'location_picker', 'readonly_text', 'size_grid',
        'media_uploader', 'document_uploader', 'tag_input', 'slider',
        'checkbox', 'date_range_picker', 'rich_textarea',
        'hierarchical_select', 'multiselect', 'country_select',
        'location_autocomplete', 'postal_code_input', 'address_autocomplete',
        'address_input', 'hidden_geo', 'radius_input', 'image_uploader',
        'video_uploader', 'file_uploader', 'url_input', 'schedule_editor',
        'business_id_input', 'year_picker', 'secure_text_input',
        'computed_readonly', 'energy_rating', 'time_picker',
        'structured_textarea', 'tags_input', 'evidence_editor',
        'status_badge', 'document_status', 'datetime_picker', 'barcode_input'
    ));

