-- =============================================================================
-- Complete foreign-key index coverage
-- Migration: 00020_foreign_key_indexes.sql
--
-- The schema is still pre-production, so this is the safe window to add the
-- indexes required for predictable joins and parent-row updates/deletes. New
-- migrations must continue to add an index beside every new foreign key.
-- =============================================================================

DO $$
DECLARE
  foreign_key RECORD;
  index_name TEXT;
  column_list TEXT;
BEGIN
  FOR foreign_key IN
    SELECT constraint_row.oid,
           constraint_row.conrelid,
           constraint_row.conname,
           constraint_row.conkey
    FROM pg_constraint constraint_row
    WHERE constraint_row.contype = 'f'
      AND constraint_row.connamespace = 'public'::REGNAMESPACE
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index index_row
        WHERE index_row.indrelid = constraint_row.conrelid
          AND index_row.indisvalid
          AND (index_row.indkey::SMALLINT[])[0:CARDINALITY(constraint_row.conkey) - 1]
                = constraint_row.conkey
      )
  LOOP
    SELECT STRING_AGG(QUOTE_IDENT(attribute_row.attname), ', ' ORDER BY key_column.ordinality)
    INTO column_list
    FROM UNNEST(foreign_key.conkey) WITH ORDINALITY AS key_column(attribute_number, ordinality)
    JOIN pg_attribute attribute_row
      ON attribute_row.attrelid = foreign_key.conrelid
     AND attribute_row.attnum = key_column.attribute_number;

    index_name := FORMAT(
      'fk_%s_%s_idx',
      LEFT(REGEXP_REPLACE(foreign_key.conrelid::REGCLASS::TEXT, '[^a-zA-Z0-9]+', '_', 'g'), 24),
      SUBSTR(MD5(foreign_key.conrelid::REGCLASS::TEXT || ':' || foreign_key.conname), 1, 12)
    );

    EXECUTE FORMAT(
      'CREATE INDEX IF NOT EXISTS %I ON %s (%s)',
      index_name,
      foreign_key.conrelid::REGCLASS,
      column_list
    );
  END LOOP;
END;
$$;
