# ClaimFlow AI

ClaimFlow AI is a document-intake workflow for insurance claims.

It lets a user upload a claim PDF or paste claim email text, extracts structured claim JSON using Gemini, validates the extracted data with deterministic rules, saves the run in Postgres, and shows a traceable timeline.

## Current Scope

Supported inputs:

- PDF claim document
- Pasted email text

Current output:

- Structured claim JSON
- Model and prompt version
- Confidence JSON
- Missing fields
- Conflicts and warnings
- Required evidence
- Final status: `COMPLETED` or `NEEDS_REVIEW`
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
→ Run validation
→ deterministic rules check missing fields, conflicts, warnings, and evidence
→ validationJson + missingFieldsJson saved in Postgres
→ status becomes COMPLETED or NEEDS_REVIEW
→ validation result + timeline shown in UI
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

### Day 4: Validation Layer

Implemented:

- Deterministic claim validation after extraction
- `validateClaimExtraction()` shared validation service
- `POST /api/extraction-runs/[runId]/validate`
- Manual **Run validation** button
- Missing fields detection
- Conflicts and warnings detection
- Required evidence detection
- Final status:
  - `COMPLETED`
  - `NEEDS_REVIEW`
- Saved `validationJson` and `missingFieldsJson`
- Validation summary UI
- Missing fields UI
- Conflicts, warnings, and required evidence UI
- Timeline events:
  - `VALIDATION_STARTED`
  - `VALIDATION_COMPLETED`
  - `MISSING_FIELDS_DETECTED`
  - `CONFLICTS_DETECTED`
  - `RUN_COMPLETED`
  - `RUN_NEEDS_REVIEW`

Day 4 flow:

```txt
Upload PDF or paste email text
→ created run
→ click Run extraction
→ Gemini extracts structured claim JSON
→ app saves extractedJson
→ status moves to VALIDATING
→ click Run validation
→ app checks missing fields, conflicts, warnings, and required evidence
→ app saves validationJson and missingFieldsJson
→ status becomes COMPLETED or NEEDS_REVIEW
→ UI explains the result
→ timeline proves what happened
```

Tested with synthetic PDFs:

- valid own-damage claim → `COMPLETED`
- missing policy number → `NEEDS_REVIEW`
- repair estimate only → `NEEDS_REVIEW`
- third-party without police report → `NEEDS_REVIEW`
- theft claim missing FIR → `NEEDS_REVIEW`

## Current Run Lifecycle

Completed lifecycle:

```txt
UPLOADED
→ EXTRACTING
→ VALIDATING
→ COMPLETED
```

Needs-review lifecycle:

```txt
UPLOADED
→ EXTRACTING
→ VALIDATING
→ NEEDS_REVIEW
```

Failure lifecycle:

```txt
UPLOADED / FAILED
→ EXTRACTING / VALIDATING
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

Week 2:

- Add human review queue
- Show runs that need review
- Allow reviewer decisions
- Store reviewer notes and corrections
- Use reviewer feedback later for memory/rule improvement
