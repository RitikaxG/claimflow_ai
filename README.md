# ClaimFlow AI

ClaimFlow AI is a production-style agentic document workflow for motor-insurance claims. It turns claim PDFs or email text into structured state, grounds decisions in policy evidence, lets an agent propose constrained actions, keeps humans in control, learns safe workflow memory from review outcomes, and records every model call through an observable AI gateway.

The agent is not an unrestricted chatbot. It operates inside a governed state machine with deterministic validation, tool permissions, guardrails, human review, traceable memory use, and regression evaluations.

## Live portfolio path

Deploy the checked-in Render Blueprint, seed the deterministic demo records, then open `/demo`. The demo gives a reviewer three proof paths:

- a completed, policy-grounded claim;
- a missing-field claim where workflow memory influences prioritization without autofilling data;
- a retryable model timeout with gateway failure metadata.

Each path links to the claim run and its end-to-end workflow trace. See [deployment instructions](docs/deployment.md).

## What the system proves

| Layer | Proof |
|---|---|
| Structured intake | PDF and email claims become schema-validated JSON and durable workflow state. |
| Deterministic validation | Missing fields, conflicts, warnings, and required evidence are calculated outside the model. |
| Policy RAG | Coverage answers retrieve policy clauses and expose supporting evidence. |
| Agent actions | A planner selects typed tools and writes an auditable rationale. |
| Guardrails | Unsafe or unsupported actions are blocked before tool execution. |
| Human review | Reviewers approve, edit, reject, or request information; decisions remain in the audit trail. |
| Workflow memory | Past corrections can influence future prioritization but cannot silently supply claim facts. |
| AI gateway | Provider, model, prompt version, trace ID, latency, tokens, cost, status, and failures are logged. |
| Evaluations | Week 1–6 suites measure extraction, review, RAG, action choice, memory safety, and gateway failures. |
| Run trace | One screen links document, extraction, RAG, memory, agent, guardrail, follow-up, review, and gateway events. |

## Architecture

```text
PDF / email
    │
    ▼
Document + ExtractionRun ──► AI Gateway ──► Gemini extraction
    │                           │
    │                           └── trace, model, prompt, latency, cost, error
    ▼
Deterministic validation
    │
    ├──► Policy RAG ──► cited coverage evidence
    ├──► Workflow memory ──► safe historical context
    ▼
Agent planner ──► guardrails ──► typed tool action
    │                                  │
    └──────── blocked / allowed ◄──────┘
                       │
                       ▼
              Human review + feedback
                       │
                       ▼
              Memory update + full trace
```

## Demo flow

1. Open `/demo` and choose **Memory-guided human review**.
2. Inspect the missing `vehicle.registrationNumber` field.
3. Open the memory panel and verify the prior correction was retrieved.
4. Confirm the agent drafted an information request instead of copying an old value.
5. Open the run trace to inspect prompt/model versions, cost, latency, guardrail decision, memory influence, and review state.
6. Open `/evals` and inspect the Week 6 deterministic gateway-failure suite.

## Technology

Next.js 16, React 19, TypeScript, Turborepo, Bun, Prisma 7, Postgres + pgvector, Zod, Gemini, and Zustand.

## Local setup

```bash
cp .env.example packages/db/.env
docker compose up -d
bun install
bun run db:generate
bun run db:migrate
bun run demo:seed
bun run dev
```

Open `http://localhost:3001/demo`. Add `GEMINI_API_KEY` to `apps/web/.env.local` for real extraction. Seeded proof paths do not call the model.

## Quality gates

```bash
bun run production:check
```

The production gate generates Prisma types, type-checks every workspace, runs lint, executes the Week 6 deterministic gateway eval, and builds the application. CI runs the same core checks for pushes and pull requests. Production builds no longer suppress TypeScript errors.

## Data and safety

- All checked-in and seeded claims are synthetic.
- Public seed/reset HTTP endpoints are intentionally absent.
- Demo records use dedicated deterministic IDs and can be refreshed with `bun run demo:seed` or removed with `bun run demo:reset`.
- Model and database secrets remain server-side.
- Memory is advisory context, not a source of truth for missing claim facts.
- Final claim decisions that require judgment remain human-reviewed.

## Repository map

```text
apps/web                 Next.js workflow UI and APIs
packages/ai              Claim extraction model integration
packages/rag             Policy ingestion, embeddings, and retrieval
packages/agent           Planner, tools, runner, and guardrails
packages/memory          Workflow memory creation, retrieval, and updates
packages/gateway         Model-call governance and observability
packages/evals           Week 1–6 evaluation runners
packages/db              Prisma schema, migrations, and demo seed
sample-data              Synthetic packets and evaluation evidence
docs                     Architecture, weekly evidence, demo, and deployment docs
```

## Production boundaries

This portfolio build demonstrates production concerns but is not a licensed claims decision system. Before handling real customer data it would still require authentication and role-based access, tenant isolation, encrypted object storage, PII retention controls, rate limiting, background jobs, provider retry queues, alerting, and an insurer-approved policy/compliance review.

> ClaimFlow AI is a production-style agentic document workflow where the agent acts inside a governed system: grounded by policy retrieval, influenced by safe workflow memory, constrained by guardrails, reviewed by humans, and measured through gateway logs and eval dashboards.
