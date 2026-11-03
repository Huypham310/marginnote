# Built from the repo root (npm workspaces share one lockfile):
#   docker build -f dashboard/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY dashboard/package.json dashboard/
COPY extension/package.json extension/
RUN npm ci --workspace dashboard --include-workspace-root=false --ignore-scripts
COPY dashboard ./dashboard
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w dashboard

FROM node:24-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# standalone output = server.js + only the node_modules it actually imports
COPY --from=build /app/dashboard/.next/standalone ./
COPY --from=build /app/dashboard/.next/static ./dashboard/.next/static
USER node
EXPOSE 3000
CMD ["node", "dashboard/server.js"]
