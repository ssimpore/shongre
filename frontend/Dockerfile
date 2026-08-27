# syntax=docker/dockerfile:1.7
# Build from the repository root. Environment-specific public values are
# injected by the Next.js server at runtime; this image is promotion-safe.
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS workspace

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY mobile/package.json ./mobile/package.json
COPY packages/brand/package.json ./packages/brand/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/design-tokens/package.json ./packages/design-tokens/package.json
COPY packages/features/package.json ./packages/features/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ui/package.json ./packages/ui/package.json

FROM workspace AS builder

ARG VCS_REF=""

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=frontend --include-workspace-root=false

COPY frontend ./frontend
COPY packages ./packages
COPY scripts/upload-sentry-sourcemaps.sh ./scripts/upload-sentry-sourcemaps.sh

RUN npm run build --workspace=frontend
RUN --mount=type=secret,id=sentry_auth_token \
    --mount=type=secret,id=sentry_org \
    --mount=type=secret,id=sentry_frontend_project \
    --mount=type=secret,id=sentry_url \
    VCS_REF="$VCS_REF" sh ./scripts/upload-sentry-sourcemaps.sh \
      /app/frontend/.next /run/secrets/sentry_frontend_project

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runner

ARG BUILD_DATE=""
ARG VCS_REF=""
ARG VERSION=""
ARG SOURCE_URL=""

LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.source=$SOURCE_URL \
      org.opencontainers.image.title="Shongre Web"

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app/frontend

# The standalone server needs Node, not npm/yarn/corepack. Upgrade patched
# Alpine libraries and remove package-manager tooling from the runtime image.
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
       /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=builder --chown=node:node /app/frontend/.next/standalone /app
COPY --from=builder --chown=node:node /app/frontend/.next/static /app/frontend/.next/static
COPY --from=builder --chown=node:node /app/frontend/public /app/frontend/public
COPY --chown=node:node frontend/scripts/validate-runtime-config.mjs ./scripts/validate-runtime-config.mjs

RUN find /app -type f -name '*.map' -delete

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

USER node

CMD ["sh", "-c", "node scripts/validate-runtime-config.mjs && exec node server.js"]
