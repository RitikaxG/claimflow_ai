# ClaimFlow AI

ClaimFlow AI is a document-intake workflow for insurance claims.

It lets a user upload a claim PDF or paste claim email text, extracts structured claim JSON using Gemini, saves the run in Postgres, and shows a traceable timeline.

## Current Scope

Supported inputs:

- PDF claim document
- Pasted email text

Current output:

- Structured claim JSON
- Model and prompt version
- Confidence JSON
- Saved extraction run
- Timeline events

## Tech Stack

- Turborepo
- Next.js
- TypeScript
- Prisma
- Postgres
- Zod
- Gemini API
- Zustand

## Workflow

```txt
PDF / email text
→ Document row
→ ExtractionRun row
→ DOCUMENT_UPLOADED event
→ Run extraction
→ Gemini extraction
→ Zod-parsed structured JSON
→ extractedJson saved in Postgres
→ status moves to VALIDATING
→ JSON + timeline shown in UI
```

## Progress

### Day 1: Foundation

Implemented:

- Turborepo setup
- Next.js app
- Prisma + Postgres
- Shared Zod schemas
- DB models:
  - `documents`
  - `extraction_runs`
  - `extraction_events`

### Day 2: Upload + Run Creation

Implemented:

- PDF upload
- Email text submission
- Local PDF storage
- `POST /api/documents/upload`
- Run creation with `UPLOADED` status
- Dashboard recent runs list
- Run detail timeline

### Day 3: Gemini Extraction

Implemented:

- `@repo/ai` package
- Gemini client
- Prompt versioning
- PDF extraction
- Email text extraction
- `POST /api/extraction-runs/[runId]/extract`
- Manual **Run extraction** button
- Extracted JSON panel
- Timeline events:
  - `EXTRACTION_STARTED`
  - `MODEL_RESPONSE_RECEIVED`
  - `EXTRACTION_COMPLETED`
  - `RUN_FAILED`

## Current Run Lifecycle

```txt
UPLOADED
→ EXTRACTING
→ VALIDATING
```

Failure lifecycle:

```txt
UPLOADED / FAILED
→ EXTRACTING
→ FAILED
```

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/claimflow_ai?sslmode=disable
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

For local extraction, keep Gemini variables in:

```txt
apps/web/.env.local
```

## Run Locally

```bash
bun install
bun run db:migrate
bun run dev
```

App runs at:

```txt
http://localhost:3001
```

## Next Step

Day 4:

- Validate extracted JSON
- Detect missing fields
- Detect conflicting fields
- Set final status:
  - `COMPLETED`
  - `NEEDS_REVIEW`
