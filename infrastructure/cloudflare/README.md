# Cloudflare Tunnel production contract

Cloudflare Tunnel is Shongre's only hosted public ingress. The Docker hosts do
not publish frontend port 3000, backend port 4000, or cloudflared metrics port 2000. Containers can reach dependencies outbound on the project-scoped bridge;
Cloudflare connectors establish outbound-only edge sessions.

## Persistent remote-managed Tunnels

Create these once in Cloudflare Zero Trust, never during an application release:

| Environment | Tunnel name          | Public hostname          | Private service        |
| ----------- | -------------------- | ------------------------ | ---------------------- |
| DEV         | `shongre-dev`        | `dev.shongre.fr`         | `http://frontend:3000` |
| DEV         | `shongre-dev`        | `dev.shongre.com`        | `http://frontend:3000` |
| DEV         | `shongre-dev`        | `api-dev.shongre.fr`     | `http://backend:4000`  |
| STAGING     | `shongre-staging`    | `staging.shongre.fr`     | `http://frontend:3000` |
| STAGING     | `shongre-staging`    | `staging.shongre.com`    | `http://frontend:3000` |
| STAGING     | `shongre-staging`    | `api-staging.shongre.fr` | `http://backend:4000`  |
| PRODUCTION  | `shongre-production` | `shongre.fr`             | `http://frontend:3000` |
| PRODUCTION  | `shongre-production` | `www.shongre.fr`         | `http://frontend:3000` |
| PRODUCTION  | `shongre-production` | `shongre.com`            | `http://frontend:3000` |
| PRODUCTION  | `shongre-production` | `www.shongre.com`        | `http://frontend:3000` |
| PRODUCTION  | `shongre-production` | `api.shongre.fr`         | `http://backend:4000`  |

Cloudflare creates the proxied DNS routes for these hostnames. Keep access to
the dashboard restricted and audited. Do not give an application host a broad
Cloudflare API token; normal deployment changes only image digests.

## Host token boundary

Install each environment's scoped Tunnel token as a root-managed file such as
`/etc/shongre/cloudflared-token`. Mode `0400`/`0440` and a deployment-runner
group are appropriate. GitHub stores only the non-secret file path in the
environment variable `CLOUDFLARE_TUNNEL_TOKEN_FILE`; it does not store or print
the token. Compose mounts it as `/run/secrets/cloudflare_tunnel_token`, and the
connector reads it with `--token-file`.

Rotate a token from the Zero Trust dashboard, replace the file atomically on
all connector hosts, then recreate only `cloudflared`. Confirm
`make tunnel-health` before revoking the old token. A release or rollback must
never delete or recreate a Tunnel or DNS record.

## Health and availability

The container image is pinned to `cloudflare/cloudflared:2026.5.2` and its OCI
digest; automatic self-update is disabled. The host deployment starts two connector replicas;
the private Prometheus metric `cloudflared_tunnel_ha_connections` must have a
positive value. Run:

```bash
make tunnel-status SHONGRE_ENV=staging
make tunnel-health SHONGRE_ENV=staging
make tunnel-logs SHONGRE_ENV=staging
```

Two connectors on one host tolerate connector restarts, not host loss. For
production host-level HA, run the same `shongre-production` Tunnel on a second
independent outbound host and keep application/database behavior safe for that
topology. Monitor connector count from Cloudflare and alert when it drops below
the intended floor.

Cloudflare must overwrite trusted proxy headers. Shongre enables
`SHONGRE_TRUST_PROXY_HOST=true` only in hosted profiles; direct developer
execution keeps it false. The application still owns authentication,
authorization, CSRF/CORS, request limits and input validation—Tunnel/WAF is an
additional edge control.
