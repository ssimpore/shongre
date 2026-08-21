# Monitoring contract

Production monitoring must consume the backend `/health` endpoint and
structured JSON logs without recording authorization headers, tokens, payment
data, private messages, or identity documents. Provider-specific dashboards and
credentials are intentionally not committed.

