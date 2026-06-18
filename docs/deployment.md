# Live demo deployment

ClaimFlow AI ships with a Docker image, a database health check, production migrations, and an idempotent portfolio seed. The checked-in `render.yaml` can create the web service and Postgres database together.

## Deploy on Render

1. Create a new Blueprint from this repository.
2. Confirm the web service and Postgres database from `render.yaml`.
3. Set `GEMINI_API_KEY` as a secret environment variable.
4. Deploy. The container runs committed Prisma migrations before starting Next.js.
5. Open `/demo` to verify the three seeded proof paths and `/api/health` to verify database connectivity.

`SEED_DEMO_DATA=true` refreshes only records whose IDs start with the dedicated demo identifiers. It does not truncate or replace user-created claims. Set it to `false` after the first successful deployment if you want demo timestamps to remain unchanged between restarts.

## Required environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Postgres connection string. Use a provider URL with TLS in production. |
| `GEMINI_API_KEY` | Yes for live extraction | Server-only Gemini credential. Seeded proof paths work without model calls. |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash`. |
| `SEED_DEMO_DATA` | No | Set to `true` to refresh deterministic portfolio records at startup. |
| `USE_MOCK_EXTRACTION` | No | Local evaluation switch; keep `false` in the public app. |

## Manual production commands

```bash
bun install --frozen-lockfile
bun run db:generate
bun run db:deploy
bun run demo:seed
bun run build
bun run --cwd apps/web start -- -p 3000
```

## Public-demo checks

- `/api/health` returns HTTP 200 and `database: connected`.
- `/demo` exposes completed, needs-review, and retryable-failure examples.
- Each example opens both a run detail and end-to-end trace.
- `/review` contains the pending seeded task.
- `/evals` shows all Week 1–6 suites.
- A real extraction succeeds when `GEMINI_API_KEY` is configured.

Never expose the database or Gemini credentials through `NEXT_PUBLIC_*` variables. The public demo intentionally provides no seed/reset HTTP endpoint; seed maintenance remains an operator-only command.
