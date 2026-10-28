# Ingest image (scheduled jobs). Build context = repo root:  docker build -f scripts/Dockerfile .
# Runs one-shot `tsx src/run-job.ts <job>` commands started by host cron (infra/vps/run-ingest.sh); no long-running process.
FROM node:24-slim
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY scripts/package.json scripts/
# Full install, not --prod: tsx runs the TypeScript sources directly.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @carplates/scripts...

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY scripts scripts
RUN pnpm --filter @carplates/shared --filter @carplates/db build

# CKAN ZIP cache + the backed-up archive are bind mounts owned by the host's deploy user (compose runs the container as that uid).
RUN mkdir -p /archive scripts/.data && chmod 777 /archive scripts/.data
ENV NODE_ENV=production PATH=/repo/scripts/node_modules/.bin:$PATH HOME=/tmp
WORKDIR /repo/scripts
USER node
CMD ["tsx", "src/run-job.ts"]
