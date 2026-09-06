-- Current-schema, deterministic local vertical-catalogue seed. Immutable
-- reference data is owned by migrations and must never be replayed against the
-- evolved schema. Draft taxonomy v4 has its own approved taxonomy-db-import
-- workflow and is intentionally not activated by ordinary local startup.
\ir courses.sql
\ir auto.sql
\ir real-estate.sql
