# syntax=docker/dockerfile:1.7
# Build from the repository root:
#   docker build -f backend/Dockerfile -t shongre-backend .
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
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=backend --include-workspace-root=false

COPY backend ./backend
COPY packages ./packages

RUN npm run build --workspace=backend

FROM workspace AS runner

ENV NODE_ENV=production
ENV BACKEND_HOST=0.0.0.0
ENV BACKEND_PORT=4000

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace=backend --include-workspace-root=false && \
    npm cache clean --force

COPY --from=builder --chown=node:node /app/backend/dist ./backend/dist

WORKDIR /app/backend
EXPOSE 4000

USER node

CMD ["node", "dist/server.js"]
