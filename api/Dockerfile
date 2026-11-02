# Built from the repo root (npm workspaces share one lockfile):
#   docker build -f api/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /app
# every workspace's package.json is needed for `npm ci` to accept the lockfile
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY dashboard/package.json dashboard/
COPY extension/package.json extension/
RUN npm ci --workspace api --include-workspace-root=false --ignore-scripts
COPY api/tsconfig.json api/
COPY api/src api/src
RUN npm run build -w api

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY dashboard/package.json dashboard/
COPY extension/package.json extension/
# runtime deps only, no tsx / types / test tools
RUN npm ci --workspace api --include-workspace-root=false --omit=dev --ignore-scripts

FROM node:24-alpine
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/api/dist ./api/dist
COPY api/package.json ./api/
# migrations run on startup, read relative to dist/db
COPY api/migrations ./api/migrations
WORKDIR /app/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "dist/index.js"]
