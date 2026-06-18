FROM oven/bun:1.3.2 AS build

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run db:generate
RUN bun run build

FROM oven/bun:1.3.2-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app

EXPOSE 3000
CMD ["sh", "-c", "bun run db:deploy && if [ \"${SEED_DEMO_DATA:-false}\" = \"true\" ]; then bun run demo:seed; fi && bun run --cwd apps/web start -- -p ${PORT:-3000}"]
