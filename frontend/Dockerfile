# syntax=docker/dockerfile:1.7
# Build from the repository root. Public Next.js values are compiled into the
# browser bundle and therefore must be supplied at build time.
FROM node:22-alpine AS workspace

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

ARG APP_ENV=production
ARG NEXT_PUBLIC_DATA_MODE=api
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ENABLE_MOCK_STORAGE=false
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV APP_ENV=$APP_ENV
ENV NEXT_PUBLIC_DATA_MODE=$NEXT_PUBLIC_DATA_MODE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_ENABLE_MOCK_STORAGE=$NEXT_PUBLIC_ENABLE_MOCK_STORAGE
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=frontend --include-workspace-root=false

COPY frontend ./frontend
COPY packages ./packages

RUN npm run build --workspace=frontend

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app/frontend

COPY --from=builder --chown=node:node /app/frontend/.next/standalone /app
COPY --from=builder --chown=node:node /app/frontend/.next/static /app/frontend/.next/static
COPY --from=builder --chown=node:node /app/frontend/public /app/frontend/public

EXPOSE 3000

USER node

CMD ["node", "server.js"]
