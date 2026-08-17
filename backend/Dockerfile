# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
COPY generated ./generated

RUN npm run build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY supabase ./supabase
COPY docs ./docs

EXPOSE 4000

USER node

CMD ["node", "dist/app/server/index.js"]
