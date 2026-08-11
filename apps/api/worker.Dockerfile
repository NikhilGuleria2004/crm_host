FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @crm/api build

FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && addgroup --system --gid 1001 crm && adduser --system --uid 1001 crm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/

RUN pnpm install --frozen-lockfile

COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/ui ./packages/ui
COPY --from=builder /app/packages/config ./packages/config

USER crm

WORKDIR /app/apps/api

CMD ["npx", "tsx", "src/worker/index.ts"]
