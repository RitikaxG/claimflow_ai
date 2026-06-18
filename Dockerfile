FROM oven/bun:1.3.2 AS build

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Prisma's config validates that DATABASE_URL exists even though client
# generation and the Next.js build do not connect to the database. Use a
# non-secret placeholder during image construction; Render injects the real
# Neon DATABASE_URL only when the runtime container starts.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/claimflow_ai bun run db:generate
RUN DATABASE_URL=postgresql://build:build@localhost:5432/claimflow_ai bun run build

FROM oven/bun:1.3.2-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app

EXPOSE 3000
CMD ["sh", "-c", "bun run db:deploy && if [ \"${SEED_DEMO_DATA:-false}\" = \"true\" ]; then bun run demo:seed; fi && bun run --cwd apps/web start -- -p ${PORT:-3000}"]
