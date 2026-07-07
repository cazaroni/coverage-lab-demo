FROM node:22-alpine

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages/schemas ./packages/schemas

RUN pnpm --filter @projectedge/web build

EXPOSE 3000

CMD ["pnpm", "--filter", "@projectedge/web", "start"]
