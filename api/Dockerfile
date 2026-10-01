# syntax=docker/dockerfile:1.7
# Optional self-host / Cloud Run image for the API (production runs on Vercel, which ignores it).
# Build from the repo root:  docker build -f api/Dockerfile -t fellow-owners-api .

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ---- dependencies (cached on lockfile + manifests only)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@fellow-owners/api..."

# ---- build shared, then the api
FROM deps AS build
COPY shared/ shared/
COPY api/ api/
RUN pnpm --filter @fellow-owners/shared build \
 && pnpm --filter @fellow-owners/api exec tsc -p tsconfig.build.json \
 && cp -r api/src/db/migrations api/dist/db/migrations
# Self-contained production install of the api with the built shared package.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @fellow-owners/api deploy --legacy --prod /prod/api \
 && rm -rf /prod/api/dist && cp -r api/dist /prod/api/dist

# ---- runtime
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
CMD ["node", "dist/local.js"]
