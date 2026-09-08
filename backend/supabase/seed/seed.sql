-- Current-schema, deterministic local seed. The guarded runner bootstraps
-- missing taxonomy before this entrypoint. Classification data is owned by v1;
-- these seeds supply vertical business configuration and missing header navigation.
\ir courses.sql
\ir auto.sql
\ir real-estate.sql
\ir taxonomy-header-local.sql
