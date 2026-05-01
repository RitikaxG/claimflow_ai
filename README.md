# ClaimFlow AI

ClaimFlow AI is a production-style AI workflow project for document intake, claim extraction, validation, review, memory, and observability.

## Week 1: Document Intake Reviewer

### Goal

Build a working document intake screen where a user uploads a claim PDF or pastes email text and receives structured JSON extracted by an AI model.

The system validates the extracted fields, detects missing/conflicting information, saves the run in Postgres, and displays a basic workflow timeline.

### Week 1 Scope

Input:

- PDF claim document
- Email text as fallback

Output:

- Structured claim JSON
- Missing fields
- Conflicting fields
- Confidence/status
- Saved extraction run
- Timeline events

### Day 1 Foundation

Implemented:

- Turborepo setup
- Next.js app
- Shared Zod schemas
- Prisma + Postgres setup
- Core database models:
  - documents
  - extraction_runs
  - extraction_events

### Not in Day 1 Scope

- Gemini extraction call
- File upload UI
- Review queue
- RAG
- Agents
- Workers
- OCR
- S3 storage

## Week 1 Demo Target

I uploaded a claim document. The system extracted structured fields, validated them, showed missing/conflicting fields, and saved a run timeline.