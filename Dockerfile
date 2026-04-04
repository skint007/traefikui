# ============================================================
# Stage 1: base
# Shared foundation for deps and builder stages.
# Alpine keeps the base ~50 MB. Native build tools are here
# because better-sqlite3 needs them at install time.
# ============================================================
FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ============================================================
# Stage 2: deps
# Install dependencies in isolation so they're cached
# independently from source code changes.
# ============================================================
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================================
# Stage 3: builder
# Compile the app. Has access to all dev dependencies and
# source code, but only build artifacts are copied forward.
# ============================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Config files first — change less often than source code
COPY package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.mjs ./

# Source code — changes on nearly every build
COPY app ./app
COPY components ./components
COPY hooks ./hooks
COPY lib ./lib
COPY store ./store
COPY middleware.ts ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Placeholder secrets for build — real values injected at runtime
RUN BETTER_AUTH_SECRET=build-placeholder \
    BETTER_AUTH_URL=http://localhost:3000 \
    pnpm build

# ============================================================
# Stage 4: runner
# Minimal production image. No build tools, no dev deps,
# no source code — only standalone output + runtime needs.
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache sqlite

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy database init script
COPY --chown=nextjs:nodejs scripts/init-db.sh ./scripts/init-db.sh
RUN chmod +x ./scripts/init-db.sh

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["sh", "-c", "./scripts/init-db.sh && node server.js"]
