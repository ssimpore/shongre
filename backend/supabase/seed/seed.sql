-- Current-schema, deterministic local seed. The guarded runner bootstraps
-- missing taxonomy before this entrypoint. Complete its canonical references
-- after migrations, then supply business configuration and missing navigation.
\ir taxonomy-references.generated.sql
\ir courses.sql
\ir auto.sql
\ir real-estate.sql
\ir taxonomy-header-local.sql
