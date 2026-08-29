# Canonical taxonomy coverage

The taxonomy field matrix is generated from taxonomy v4. It is deliberately not
copied into this document: a handwritten 208-row table would become a competing
taxonomy source.

The authoritative repository source is
`backend/taxonomy/v4/taxonomy-v4.normalized.json`. Exact source, normalized,
deduplication, quarantine, and compatibility counts are recorded in
`docs/architecture/generated/taxonomy-v4-import-report.json`. The executable
coverage report is produced by:

```bash
npm run check:taxonomy -w frontend
```

Current verified coverage is 18 roots, 294 total nodes, and 208/208 active
publishable leaves with complete publication, card/detail, filter, comparison,
market, and SEO projections. Any change must enter through `make taxonomy-import`
or the reviewed normalized source and pass `make taxonomy-check`; do not add a
second manual category or attribute matrix here.
