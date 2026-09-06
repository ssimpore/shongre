-- Current-schema, deterministic local catalogue seed. The guarded seed runner
-- applies the generated taxonomy v4 projection first; this entrypoint then
-- seeds vertical reference data and database-owned local header navigation.
\ir courses.sql
\ir auto.sql
\ir real-estate.sql
\ir taxonomy-header-local.sql
