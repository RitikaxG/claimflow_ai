# ClaimFlow AI

### A governed agentic workflow for motor-insurance claim operations

ClaimFlow AI turns an unstructured claim PDF or email into a traceable workflow: it extracts claim data, validates it, retrieves policy evidence, proposes the next safe action, routes uncertainty to a human reviewer, learns from reviewed outcomes, and records every model call for evaluation and audit.

It was built to answer a harder question than “can an LLM read a claim?”:

> Can an AI-assisted claims workflow remain useful when the input is incomplete, the model is uncertain, policy evidence is missing, a past memory conflicts with the current claim, or a provider call fails?

The answer in ClaimFlow is a deliberately constrained form of agentic AI. The model does not approve or reject claims. It operates inside a durable state machine with deterministic validation, retrieved policy evidence, typed tools, guardrails, human review, safe workflow memory, regression evals, and an observable AI gateway.

## The use case

Motor-insurance claims arrive as PDFs and emails containing policy details, claimant information, vehicle data, incident descriptions, estimates, invoices, and supporting evidence. Before a claim can move forward, an operations team must repeatedly:

- turn those documents into structured data;
- identify missing, conflicting, or low-confidence information;
- check the current policy wording;
- request additional information when needed;
- decide which cases require human attention;
- preserve why each workflow decision was made.

A standalone extraction prompt solves only the first part. A standalone chatbot adds another interface, but it does not create reliable workflow state. ClaimFlow AI was built as the system around the model: the model handles ambiguity, while deterministic software controls state, permissions, evidence, and accountability.

## What happens to one claim

```text
Claim PDF / email
        │
        ▼
1. Intake and AI extraction
   Unstructured content becomes schema-validated claim JSON.
        │
        ▼
2. Deterministic validation
   Rules calculate missing fields, conflicts, warnings,
   confidence issues, and required evidence.
        │
        ├──────── incomplete / uncertain ────────┐
        ▼                                         │
3. Policy RAG                                    │
   Current policy clauses are retrieved and      │
   coverage answers carry citations.              │
        │                                         │
        ▼                                         │
4. Workflow memory                                │
   Relevant past reviewer corrections and         │
   workflow outcomes are retrieved as guidance.   │
        │                                         │
        ▼                                         │
5. Guarded agent step                             │
   The agent selects one typed next action;        │
   guardrails allow or block execution.            │
        │                                         │
        ▼                                         ▼
6. Human review ◄──────────────────────── review queue
   A reviewer approves, edits, rejects, or requests information.
        │
        ▼
7. Feedback and memory update
   Reviewed outcomes create, strengthen, weaken,
   retire, or supersede safe workflow memories.

Across every model-backed step:
AI Gateway → trace ID, model and prompt version, latency,
tokens, estimated cost, status, retryability, and failure type
```

This is one connected product loop, not a collection of unrelated AI demos. Extraction creates the claim state that validation inspects. Validation determines what RAG, the agent, and the reviewer need. RAG supplies current policy evidence. Memory supplies historical workflow context without replacing current evidence. The agent proposes the next bounded action. Human decisions update durable state and become the trusted signal for future memory. The gateway makes the model-backed parts traceable, while evals test the safety contracts between every layer.

## System architecture

![ClaimFlow AI architecture](docs/week-05/images/memory-architecture.png)

The architecture has three kinds of control:

| Control | Responsibility |
|---|---|
| **Model intelligence** | Extract messy documents, generate grounded coverage explanations, and propose a typed workflow action. |
| **Deterministic application logic** | Validate schemas and business rules, calculate workflow state, enforce tool contracts, verify citations, score memory, and persist transitions. |
| **Human authority** | Resolve ambiguity, correct extracted data, request evidence, and make the final review decision. |

That separation is central to the design. The model can interpret and propose; the application verifies and constrains; the reviewer remains accountable for consequential decisions.

## Where the agentic AI is

ClaimFlow implements a guarded, single-step agent loop rather than an open-ended autonomous ReAct loop.

| Agent stage | ClaimFlow implementation |
|---|---|
| **Perceive** | Load the current extraction, validation result, policy retrieval state, review state, previous actions, and relevant memories. |
| **Reason** | Prefer deterministic routing for obvious states; use model reasoning only when a tool choice needs interpretation. |
| **Plan** | Produce one structured action with a rationale and typed tool arguments. |
| **Act** | Execute only a registered tool after guardrail evaluation. |
| **Observe** | Persist the tool result, events, review-state transition, memory usage, and gateway trace. |
| **Pause** | Return control to the workflow or a human instead of looping toward an autonomous claim decision. |

Examples of allowed actions include drafting an information request, retrieving policy clauses, creating or escalating a review task, and asking a reviewer to verify a field. Approval, rejection, deletion, bypassing review, sending an email, and creating a final claim decision are outside the agent’s authority or explicitly blocked.

See the [ClaimFlow agent loop](docs/ai-systems/claimflow-agent-loop.md) and the [guarded agent workflow](docs/week-04/agentic-workflow.md).

## How the AI layers connect

### 1. Extraction: convert documents into workflow state

Gemini extracts a PDF or pasted email into a typed claim schema. ClaimFlow persists the original source, extracted JSON, confidence metadata, model and prompt version, and an event timeline. A content hash detects duplicate uploads and allows a soft-deleted document to be restored without paying for another extraction.

The extraction is not treated as truth. It is the first proposed state of the claim.

### 2. Validation: decide whether the state is safe to advance

Deterministic rules—not another model opinion—check required fields, conflicts, warnings, evidence requirements, and low-confidence values. A run becomes `COMPLETED` only when the workflow rules allow it; otherwise it becomes `NEEDS_REVIEW` with explicit reasons.

This is the first governance boundary: malformed, incomplete, or uncertain model output cannot silently become an accepted claim record.

### 3. Policy RAG: ground coverage reasoning in current evidence

Policy documents are parsed, chunked, embedded, and stored in Postgres with pgvector. Claim-aware query planning retrieves relevant clauses for a coverage question. The answer generator can cite only retrieved chunks, and citation verification checks that quoted evidence exists in the retrieved policy text.

When evidence is weak or missing, the safe result is insufficient evidence or `NEEDS_REVIEW`—not a guessed approval. Reviewed claim data takes precedence over the original extraction when building retrieval context.

See the [Policy RAG architecture](docs/week-03/policy-rag-architecture.md).

### 4. Guarded agent: choose the next safe workflow action

The agent receives current claim state, validation issues, policy retrieval state, prior actions, review state, and compact memory guidance. A deterministic router handles obvious cases before model tool-calling, reducing cost and making common behavior predictable. When model reasoning is needed, the output must parse into a registered tool call.

Guardrails then evaluate the proposal. An allowed tool can create durable workflow state—for example, an information-request draft and a `NEEDS_MORE_INFO` review transition. A blocked proposal is recorded but cannot mutate the claim.

### 5. Human review: preserve decision authority and create trusted feedback

Unsafe or incomplete cases enter a review queue. Reviewers can approve as-is, edit and approve, reject, or request more information. Review decisions, corrections, and events are persisted so the system can explain not only the final state, but how it arrived there.

The review outcome is also the trusted learning signal. The agent proposing an action does not prove that its reasoning was correct; a later human outcome can confirm or contradict the workflow guidance.

### 6. Memory: learn workflow lessons without inventing claim facts

ClaimFlow memory is not chat history and is not a database of values to copy into new claims. It stores bounded workflow lessons derived from reviewer corrections, prior review decisions, and repeated patterns.

Each memory carries its entity scope, risk, confidence, source trail, safe use, and explicit `mustNotDo` guidance. Retrieval uses structured signals such as stable claimant/vendor/policy IDs, field paths, missing fields, required evidence, and trust level. Similar names alone are intentionally insufficient.

Memory can make the workflow more specific—“ask for `vehicle.registrationNumber`” or “route this vendor invoice conflict to review.” It cannot autofill that registration number, replace current documents or policy evidence, or approve/reject the claim. Retrieval is logged through `MemoryHit`; reviewer feedback can later strengthen, weaken, retire, or supersede the memory. Repeated episodic memories can form conservative semantic patterns.

> Memory can influence workflow routing. Memory cannot decide claim truth.

See the [memory architecture](docs/week-05/memory-architecture.md) and the [memory flow evidence](docs/week-05/memory-flow-evidence.md).

### 7. AI gateway: make every model call governable

Extraction, grounded generation, and agent reasoning call providers through a shared gateway. The gateway records trace ID, provider, model and prompt versions, latency, token usage, estimated cost, status, retryability, and normalized failure metadata in `AiCallLog`.

It also enforces operational policy. Missing model-version metadata or an exceeded cost limit can block a call before the provider is invoked. Timeouts and provider failures are classified as retryable where appropriate; malformed JSON is recorded as a distinct failure. The one-run trace joins these calls to document, extraction, RAG, memory, agent, guardrail, follow-up, and review events.

See the [gateway observability evidence](docs/week-06/observability-flow-evidence.md).

### 8. Evaluations: test workflow behavior, not just model output

Each layer has a synthetic failure dataset and a repeatable runner. The evals ask whether the whole system reaches the expected safe state when a component is wrong, incomplete, unsupported, or unavailable.

| Layer | What the eval proves | Key safety signal |
|---|---|---|
| Extraction + validation | Structured output and final workflow status match expectations. | Incomplete claims do not silently complete. |
| Human review | Risky packets create the correct task, priority, events, and decision state. | Review routing accuracy; no unsafe completion. |
| Policy RAG | Required clauses are retrieved and citations support the answer. | False approval rate stays at zero. |
| Agent + guardrails | The correct tool is selected and unsafe proposals are blocked. | Unsafe action rate stays at zero. |
| Workflow memory | Relevant memory is retrieved and updated without replacing evidence. | Unsafe overwrite and source-of-truth violation rates stay at zero. |
| Gateway observability | Controlled timeouts, invalid JSON, cost blocks, and metadata failures are correctly classified and persisted. | Missing trace rate stays at zero; governance blocks are visible. |

The synthetic eval dashboard proves behavior across controlled scenarios. The run trace explains one real claim from intake to review. Together they answer both “does the system behave reliably?” and “what happened in this particular run?”

See [evaluation design and results](docs/evaluations.md) and the [synthetic datasets](sample-data/README.md).

## What the product proves

- **AI output can become durable product state** without being blindly trusted.
- **RAG can support a consequential workflow** with retrieved clauses and verifiable citations.
- **An agent can take useful action without owning the final decision**, using typed tools and explicit authority boundaries.
- **Human feedback can become safe operational memory** rather than an unbounded prompt history.
- **Model calls can be governed as production dependencies**, with version, trace, latency, cost, status, and failure metadata.
- **Evaluations can measure workflow safety**, not merely prompt quality.
- **One trace can connect the complete system**, from the uploaded document through extraction, retrieval, memory, agent action, guardrail decision, follow-up, review, and model calls.

## Demo paths

After deployment and seeding, open `/demo`. The deterministic demo records do not call the model and provide three reviewer-friendly paths:

1. **Policy-grounded completed claim** — inspect structured intake and cited policy evidence.
2. **Memory-guided human review** — see a missing field retrieve prior guidance, then verify that the agent requests information instead of copying an old value.
3. **Retryable model timeout** — inspect normalized gateway failure metadata and the connected workflow trace.

For the memory path, open the run, inspect the missing `vehicle.registrationNumber`, retrieve memory, confirm the drafted information request, then open the trace to follow the claim across every layer. The eval dashboard at `/evals` provides the system-wide reliability view.

## Technology

| Area | Stack |
|---|---|
| Web application | Next.js 16, React 19, TypeScript, Zustand |
| Monorepo/runtime | Turborepo, Bun |
| Data | Postgres, Prisma 7, pgvector |
| AI | Gemini, LangChain structured tool-calling, Zod schemas |
| Reliability | Typed tools, deterministic rules, guardrails, eval runners, AI gateway tracing |

## Repository map

```text
apps/web        Workflow UI, APIs, review queue, traces, and eval dashboards
packages/ai     Claim extraction and model-backed AI integration
packages/rag    Policy loading, chunking, embeddings, retrieval, and citations
packages/agent  State builder, router, planner, typed tools, runner, and guardrails
packages/memory Memory writing, retrieval, scoring, audit hits, and update lifecycle
packages/gateway Governed model calls, AiCallLog persistence, cost and failure metadata
packages/evals  Week 1–6 evaluation runners and report generation
packages/db     Prisma schema, migrations, and deterministic demo seed
sample-data     Synthetic claim packets, failure cases, gold expectations, and reports
docs            Architecture decisions, implementation evidence, demos, and ship logs
```

## Run locally

Prerequisites: Bun, Docker, and a Gemini API key for real model-backed extraction.

```bash
cp .env.example packages/db/.env
docker compose up -d
bun install
bun run db:generate
bun run db:migrate
bun run demo:seed
bun run dev
```

Open `http://localhost:3001/demo`. Add `GEMINI_API_KEY` to `apps/web/.env.local` when you want to run real extraction; the seeded proof paths work without model calls.

Run the production quality gate with:

```bash
bun run production:check
```

It generates Prisma types, type-checks the workspaces, runs lint, executes the deterministic Week 6 gateway eval, and builds the application. Individual Week 1–6 commands and committed reports are listed in [docs/evaluations.md](docs/evaluations.md).

For a public deployment, follow [docs/deployment.md](docs/deployment.md).

## Safety and production boundaries

- All checked-in and seeded claims are synthetic.
- Model and database secrets remain server-side.
- Memory is advisory workflow context, never source-of-truth evidence.
- The agent cannot make or bypass the final human review decision.
- Public seed/reset HTTP endpoints are intentionally absent.
- Demo records use deterministic IDs and can be refreshed with `bun run demo:seed` or removed with `bun run demo:reset`.

This is a production-style portfolio system, not a licensed claims adjudication platform. Real customer deployment would additionally require authentication and role-based access, tenant isolation, encrypted object storage, PII retention controls, rate limiting, background jobs and retry queues, alerting, and insurer-approved legal/compliance review.

---

**ClaimFlow AI demonstrates agentic AI as a governed workflow system: grounded by current policy evidence, informed by safe memory, constrained by tools and guardrails, accountable to human review, and measurable through traces and evals.**
