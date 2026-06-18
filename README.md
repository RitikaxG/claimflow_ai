# ClaimFlow AI

**A governed agentic workflow for motor-insurance claim intake, policy-grounded reasoning, human review, safe memory, and end-to-end observability.**

## Demo

[![Watch the guarded agent workflow](./docs/week-04/images/next-recommended-action.png)](https://x.com/RitikaxG/status/2061398296137199908?s=20)

[![Watch the memory-guided workflow](./docs/week-05/images/02-memory-retrieval.png)](https://x.com/RitikaxG/status/2065037735145205775?s=20)

ClaimFlow AI turns an unstructured claim PDF or email into a traceable workflow. It extracts claim data, validates required fields and evidence, retrieves policy clauses, proposes one safe next action, routes consequential decisions to a human reviewer, learns from trusted review outcomes, and records the complete run for audit and evaluation.

It was built to answer a harder question than “can an LLM read a claim?”:

> Can an AI-assisted claims workflow remain useful when the input is incomplete, policy evidence is weak, a previous memory may be relevant, or a model call fails—without allowing the model to make the final claim decision?

![Guarded agent workflow](./docs/week-04/images/agentic-workflow.png)
![Policy RAG workflow](./docs/week-03/images/rag-workflow.png)
![Memory architecture](./docs/week-05/images/memory-architecture.png)

---

## What ClaimFlow AI does

ClaimFlow AI supports one connected motor-claim workflow with:

- PDF and pasted-email claim intake
- structured claim JSON extraction
- deterministic field, evidence, conflict, and warning validation
- explicit `COMPLETED`, `NEEDS_REVIEW`, and `FAILED` extraction states
- policy retrieval with pgvector
- grounded coverage assessments with verified citations
- a guarded single-step agent
- typed backend tools and deterministic routing
- human review and corrected claim JSON
- workflow memory with retrieval, feedback, and lifecycle controls
- an AI gateway for model, prompt, latency, cost, and failure metadata
- per-run traces and Week 1–6 evaluation dashboards

This is not a claim chatbot and not an autonomous approval system. The AI interprets and proposes; deterministic software verifies and constrains; the human reviewer owns the final decision.

---

## Core highlights

- **Schema-shaped extraction** from PDFs and claim emails
- **Deterministic validation** instead of trusting raw model output
- **Claim-aware policy RAG** with multi-query retrieval and citation checks
- **Single safe action per agent step**
- **Deterministic routing before LangChain**
- **Registered tools + guardrails** around every agent proposal
- **Human-in-the-loop review** for correction and final decisions
- **Safe workflow memory** that cannot overwrite current claim evidence
- **Auditable memory lifecycle**: create, strengthen, weaken, retire, supersede
- **Central AI gateway** for governed model calls
- **Complete run trace** across extraction, RAG, memory, agent, review, and gateway events
- **Layer-specific evaluations** covering Weeks 1–6

---

## End-to-end claim workflow

The complete product is easiest to understand by following one claim.

```txt
PDF or email
→ extract structured claim JSON
→ validate required fields, evidence, conflicts, and warnings
→ set extraction status: COMPLETED / NEEDS_REVIEW / FAILED

If NEEDS_REVIEW
→ show the exact validation reasons
→ retrieve relevant workflow memory
→ run one guarded agent step
→ propose one registered tool
→ allow or block it through guardrails

If a field or evidence item is missing
→ draft an information request
→ pause the review in NEEDS_MORE_INFO
→ record the requested information
→ reopen the review as PENDING

When policy evidence is needed
→ retrieve relevant policy clauses
→ threshold the retrieved evidence
→ generate a grounded assessment only when evidence is sufficient
→ verify citations

Final step
→ human reviewer approves, edits and approves, rejects, or requests more information
→ trusted review outcome updates memory
→ one run trace explains the complete workflow
```

### Two related state machines

ClaimFlow keeps extraction state and human-review state separate.

| State owner | Important states | Meaning |
|---|---|---|
| **Extraction run** | `COMPLETED`, `NEEDS_REVIEW`, `FAILED` | Result of extraction and deterministic validation. |
| **Review task** | `PENDING`, `NEEDS_MORE_INFO`, `IN_REVIEW`, `APPROVED`, `EDITED_AND_APPROVED`, `REJECTED` | State of the human review workflow. |

A run can remain `NEEDS_REVIEW` while its review task moves from `NEEDS_MORE_INFO` to `PENDING`, then to a final human decision.

---

## Architecture

ClaimFlow is split into connected AI and workflow layers.

- **Document intake**  
  Persists the source PDF or email, detects duplicate content, and creates an extraction run.

- **Extraction**  
  Uses Gemini to convert unstructured content into versioned, structured claim JSON.

- **Validation**  
  Applies deterministic schema and business rules to calculate missing fields, required evidence, conflicts, warnings, and run status.

- **Policy RAG**  
  Parses and chunks policy documents, stores embeddings in Postgres/pgvector, retrieves relevant clauses, thresholds evidence, generates grounded answers, and verifies citations.

- **Workflow memory**  
  Retrieves prior corrections and recurring workflow patterns using stable entity, field, and evidence signals.

- **Agent runner**  
  Builds current context, applies deterministic routing, asks LangChain for one tool only when needed, and records the proposal.

- **Guardrails and tools**  
  Block unsupported actions and execute only registered backend tools.

- **Human review**  
  Allows a reviewer to supply missing information, correct claim JSON, and make the final approval or rejection decision.

- **AI gateway**  
  Records trace ID, provider, model, prompt version, latency, token usage, estimated cost, retryability, and normalized failure type.

- **Trace and evaluations**  
  Explain one real run and measure system behavior across controlled synthetic cases.

The authority boundary is deliberate:

| Authority | Responsibility |
|---|---|
| **Model** | Interpret documents, generate grounded explanations, or propose a typed tool. |
| **Application** | Validate, retrieve, threshold, verify, enforce guardrails, execute tools, and persist state. |
| **Human reviewer** | Correct data and make the final claim decision. |

---

## How one claim moves through ClaimFlow

### 1. Document intake and extraction

A reviewer submits a PDF or pastes a claim email. ClaimFlow creates a `Document` and `ExtractionRun`, calls the extraction model, and stores the raw response, structured JSON, confidence metadata, prompt version, model version, and timeline events.

The extraction is the first proposed claim state. It is not treated as accepted truth.

See [Week 1 — Document Intake Reviewer](./docs/week-01/document-intake-reviewer.md).

### 2. Deterministic validation

ClaimFlow checks:

- whether required fields exist
- whether required evidence exists for the claim type
- whether extracted values conflict
- whether warnings or low-confidence values require review
- whether the output matches the expected schema

![Validation summary](./docs/week-01/images/validation-summary.png)

Validation then sets the extraction-run state:

- `COMPLETED` — required claim information passed the current rules
- `NEEDS_REVIEW` — missing information, evidence, conflicts, warnings, or uncertainty require attention
- `FAILED` — extraction or processing could not produce usable workflow state

`NEEDS_REVIEW` is an explainable review boundary, not a model failure.

### 3. Relevant memory is retrieved

Before memory can influence an agent action, ClaimFlow retrieves it using structured matching signals:

- claimant, policy, or vendor identity
- the same missing field
- the same required evidence
- a recurring extraction or validation pattern
- memory status, risk, confidence, and provenance

![Memory retrieval in the claim workflow](./docs/week-05/images/02-memory-retrieval.png)

A previous correction can suggest that `vehicle.registrationNumber` should be requested again. It cannot supply the previous registration value or treat an old claim as evidence for the current claim.

Retrieval and agent use are tracked separately through `MemoryHit`.

> Memory is workflow context, not claim evidence.

See [Week 5 — Memory Flow Evidence](./docs/week-05/memory-flow-evidence.md).

### 4. One guarded agent step runs

The run page recommends the next agent action when workflow progress is required.

The agent context contains:

- current claim and validation state
- unresolved fields and evidence
- review-task status
- latest policy-retrieval status and coverage decision
- duplicate and retry signals
- previous agent actions
- relevant memory and its safety instructions

ClaimFlow handles obvious cases deterministically before calling LangChain:

```txt
final review state
→ no_action

high-risk memory
→ escalate_to_human

missing required field or evidence
→ draft_information_request

otherwise
→ ask the model to propose exactly one registered tool
```

![Agent action suggested](./docs/week-04/images/agent-action-suggested.png)

The proposal then passes through guardrails. ClaimFlow blocks actions such as approving or rejecting a claim, sending an email, deleting a claim, bypassing review, mutating a finalized review, or producing unsupported decision notes.

See [Week 4 — Guarded Agentic Workflow](./docs/week-04/agentic-workflow.md).

### 5. Missing information follows a request-and-reopen loop

For a missing field or evidence item, the allowed tool creates a durable information-request draft.

![Information request drafted](./docs/week-04/images/information-request-drafted.png)

```txt
draft_information_request
→ persist FollowupDraft
→ mark review as NEEDS_MORE_INFO
→ wait for the requested information
```

The review-task page shows the requested fields or evidence and whether memory was used by the agent. The draft is not automatically sent as an email.

The review cannot advance until the requested information is recorded.

```txt
requested information received
→ record field value and/or evidence
→ remove the resolved item from future agent context
→ reopen review as PENDING
```

![Review reopened](./docs/week-04/images/review-reopened.png)

The original extraction is not silently changed. The reviewer applies the final corrected value through edit-and-approve.

### 6. Policy RAG supplies current policy evidence

RAG is a conditional evidence path, not a mandatory step before every agent action.

It has two entry points:

1. A reviewer can open the Coverage page for a `COMPLETED` or `NEEDS_REVIEW` run.
2. The agent can select the read-only `retrieve_policy_clauses` tool when missing information no longer takes precedence.

Both use the same retrieval core:

```txt
coverage question + current claim context
→ build claim-aware query plan
→ embed queries
→ search PolicyChunk with pgvector
→ merge and rank clauses
→ evaluate retrieval strength
```

![Policy RAG architecture](./docs/week-03/images/rag-workflow.png)

The two entry points produce different workflow artifacts:

| Entry point | Result |
|---|---|
| **Agent tool** | Returns retrieval status and relevant policy matches in the tool output. It does not create a final claim decision. |
| **Coverage page** | Generates a grounded assessment only when evidence is sufficient, verifies citations, and persists a `CoverageQuestion`. |

If retrieval is insufficient, answer generation is skipped and the safe result is `NEEDS_REVIEW`. If citations are unsupported, guardrails also force review.

Reviewed corrected JSON takes precedence over stale original extraction when coverage context is built.

![Policy evidence cited by the coverage assessment](./docs/week-03/images/coverage-page-3.png)

See [Week 3 — Policy RAG Architecture](./docs/week-03/policy-rag-architecture.md).

### 7. Human review makes the final decision

After requested information is received, the reviewer starts review with:

- extracted or corrected claim JSON
- validation findings
- requested information and evidence
- memory guidance
- agent rationale and tool result
- policy clauses and coverage assessment, when available

The reviewer can:

- approve as-is
- edit and approve
- reject
- request more information

For a missing-field claim, the reviewer adds the received value to corrected claim JSON and submits `EDIT_AND_APPROVE`. The review task becomes `EDITED_AND_APPROVED`.

The agent can route, retrieve, draft, or escalate. Only the human reviewer can approve or reject the claim.

### 8. Human outcomes update memory

Memory confidence does not change merely because a memory was retrieved or displayed. It changes after a trusted human outcome.

![Memory update loop](./docs/week-05/images/memory-update-loop.png)

A review outcome can:

- create memory from a useful correction
- strengthen confirmed memory
- weaken contradicted memory
- retire repeatedly contradicted memory
- supersede older same-scope memory
- generalize repeated episodic lessons into a conservative semantic pattern

The reviewer can mark whether the memory was relevant. ClaimFlow compares extracted JSON with corrected JSON and records the update with its source trail.

### 9. The run trace connects every subsystem

The trace page explains the complete claim in workflow order:

```txt
document intake
→ extraction and validation
→ gateway calls
→ memory retrieval and agent use
→ agent proposal and guardrail decision
→ tool execution and information request
→ received information and review reopening
→ policy retrieval and coverage answer
→ human decision
→ memory update
```

![Run trace summary](./docs/week-06/images/trace-workflow-1.png)

![Review outcome and memory update trace](./docs/week-06/images/trace-workflow-9.png)

The trace answers “what happened in this claim?” The eval dashboard answers “does the system behave reliably across controlled cases?”

See [Week 6 — Observability Flow Evidence](./docs/week-06/observability-flow-evidence.md).

---

## Frontend product views

### Run detail and validation

The run page shows structured extraction, validation findings, missing fields, required evidence, conflicts, warnings, and the next recommended action.

![Run detail](./docs/week-01/images/run-detail-1.png)
![Validation findings](./docs/week-01/images/conflicts.png)

### Coverage assessment

The Coverage page shows the saved decision-support assessment, retrieval status, confidence, cited clauses, and retrieval trace.

![Coverage assessment](./docs/week-03/images/coverage-page-2.png)
![Supporting retrieval trace](./docs/week-03/images/coverage-page-4.png)

### Agent and information request

The Agent Step page shows the proposed action, rationale, selected tool, guardrail result, and resulting workflow artifact.

![Agent action](./docs/week-04/images/agent-action-suggested.png)
![Information request](./docs/week-04/images/information-request-drafted.png)

### Memory guidance and audit

The product shows why memory matched, how it may be used safely, what it must not do, whether the agent used it, and how the reviewer rated it.

![Reviewer memory guidance](./docs/week-05/images/03-memory-guidance-for-reviewer.png)
![Memory audit](./docs/week-05/images/05-memory-audit-1.png)

### Run trace and eval dashboard

The run trace explains one claim. The eval dashboard summarizes reliability across extraction, review, RAG, agent, memory, and gateway cases.

![Run trace](./docs/week-06/images/trace-workflow-1.png)
![Evaluation dashboard](./docs/week-06/images/eval-dashboard.png)

---

## Key features

### Intake and extraction

- PDF and pasted-email intake
- structured claim schema
- raw and parsed model output persistence
- model, prompt, and schema version tracking
- duplicate-content detection
- soft delete and restore

### Validation and review routing

- deterministic required-field checks
- claim-type evidence requirements
- conflict, warning, and confidence checks
- explicit run states and review reasons
- durable review queue

### Policy RAG

- policy parsing and clause-aware chunking
- embeddings stored in Postgres with pgvector
- claim-aware multi-query planning
- coverage, evidence, exclusion, and limit retrieval intents
- retrieval thresholds
- grounded answer generation
- citation verification
- persisted coverage questions and retrieval traces

### Guarded agent

- current-state context builder
- deterministic routing before model planning
- exactly one tool per agent step
- registered backend tool execution
- proposal, block, execution, and failure logs
- final-state protection

### Workflow memory

- episodic and semantic workflow lessons
- structured entity, field, evidence, and pattern matching
- relevance scoring and provenance
- safe-use and `mustNotDo` instructions
- separate retrieval and agent-use audit
- create, strengthen, weaken, retire, and supersede lifecycle

### Gateway and observability

- trace IDs across model-backed work
- provider, model, prompt, and schema metadata
- latency, token, and estimated-cost tracking
- normalized failure classification
- cost and metadata governance
- per-run workflow trace
- Week 1–6 evaluation dashboard

---

## Repository structure

```txt
claimflow_ai/
├── apps/
│   └── web/              # Next.js workflow UI and APIs
├── packages/
│   ├── ai/               # Extraction and model-backed generation
│   ├── agent/            # Context, routing, planner, tools, guardrails, runner
│   ├── db/               # Prisma schema, migrations, and deterministic demo seed
│   ├── evals/            # Week 1–6 evaluation runners and reports
│   ├── gateway/          # Governed model calls and AiCallLog persistence
│   ├── memory/           # Memory writing, retrieval, scoring, audit, lifecycle
│   ├── rag/              # Policy ingestion, embeddings, retrieval, citations
│   └── shared/           # Shared schemas and types
├── sample-data/          # Synthetic packets, gold expectations, eval reports
├── docs/                 # Architecture, evidence, demos, and ship logs
├── Dockerfile
├── docker-compose.yml
└── render.yaml
```

---

## Technology

| Area | Stack |
|---|---|
| Web application | Next.js 16, React 19, TypeScript, Zustand |
| Monorepo and runtime | Turborepo, Bun |
| Data | Postgres, Prisma 7, pgvector |
| AI | Gemini, LangChain tool-calling, Zod schemas |
| Reliability | Deterministic rules, typed tools, guardrails, eval runners, AI gateway |
| Deployment | Docker and Render blueprint |

---

## Local development

### 1. Create the environment file

```bash
cp .env.example packages/db/.env
```

Add the required database URL and Gemini API key values described in `.env.example`.

### 2. Start Postgres

```bash
docker compose up -d
```

### 3. Install dependencies

```bash
bun install
```

### 4. Generate Prisma and run migrations

```bash
bun run db:generate
bun run db:migrate
```

### 5. Seed the deterministic demo

```bash
bun run demo:seed
```

### 6. Start the application

```bash
bun run dev
```

Open `http://localhost:3001/demo`.

The seeded demo paths do not call the model. Add `GEMINI_API_KEY` to `apps/web/.env.local` when running real extraction from the web application.

---

## Proof of implementation

### Production quality gate

```bash
bun run production:check
```

This command generates Prisma types, type-checks the workspaces, runs lint, executes the deterministic Week 6 gateway evaluation, and builds the application.

### Evaluation coverage

| Week | Capability | What is measured |
|---|---|---|
| Week 1 | Extraction + validation | Structured output and final run state |
| Week 2 | Human review | Routing, priority, events, and decision state |
| Week 3 | Policy RAG | Retrieval quality, citations, abstention, false approval |
| Week 4 | Agent + guardrails | Tool selection, blocking, final-state safety |
| Week 5 | Workflow memory | Retrieval, safe use, feedback, and lifecycle |
| Week 6 | Gateway observability | Trace completeness, failures, retries, cost, metadata |

![Week 1–6 evaluation dashboard](./docs/week-06/images/eval-dashboard.png)

See [evaluation design and results](./docs/evaluations.md) and the [synthetic datasets](./sample-data/README.md).

---

## Detailed documentation

| Capability | Walkthrough |
|---|---|
| Intake, extraction, validation, and initial review boundary | [Week 1 — Document Intake Reviewer](./docs/week-01/document-intake-reviewer.md) |
| Policy ingestion, retrieval, thresholds, citations, and Coverage UI | [Week 3 — Policy RAG Architecture](./docs/week-03/policy-rag-architecture.md) |
| Agent context, tools, guardrails, information request, and review loop | [Week 4 — Guarded Agentic Workflow](./docs/week-04/agentic-workflow.md) |
| Memory retrieval, agent use, feedback, lifecycle, and patterns | [Week 5 — Memory Flow Evidence](./docs/week-05/memory-flow-evidence.md) |
| Gateway, final schema, complete run trace, and Week 1–6 proof | [Week 6 — Observability Flow Evidence](./docs/week-06/observability-flow-evidence.md) |

---

## Safety and production boundaries

- All checked-in and seeded claims are synthetic.
- Model and database secrets remain server-side.
- Extraction is validated before it becomes trusted workflow state.
- Weak retrieval or unsupported citations force human review.
- Memory is advisory context and cannot overwrite claim data.
- The agent cannot approve, reject, delete, send email, or bypass review.
- Final claim decisions remain human-owned.
- Public seed and reset HTTP endpoints are intentionally absent.

Real insurer deployment would additionally require authentication and role-based access, tenant isolation, encrypted object storage, PII retention controls, background jobs and retry queues, rate limiting, alerting, and insurer-approved legal and compliance review.

---

## Status

- Document intake and extraction: **implemented**
- Deterministic validation: **implemented**
- Human review workflow: **implemented**
- Policy RAG and citation checks: **implemented**
- Guarded agent and tools: **implemented**
- Workflow memory and lifecycle: **implemented**
- AI gateway and run trace: **implemented**
- Week 1–6 evaluations: **implemented**
- Docker and Render deployment configuration: **implemented**

---

**ClaimFlow AI demonstrates agentic AI as a governed product workflow: grounded by current policy evidence, informed by safe memory, constrained by registered tools and guardrails, accountable to human review, and measurable through traces and evaluations.**
