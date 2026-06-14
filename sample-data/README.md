# ClaimFlow AI Sample Data

This folder is the dataset and evaluation workspace for ClaimFlow AI.

Each week adds a small, controlled dataset that tests one new system capability:

```txt
Week 1 -> extraction and validation failures
Week 2 -> human review workflow failures
Week 3 -> policy RAG and citation failures
Week 4 -> agent action routing and guardrail failures
Week 5 -> workflow memory from past corrections and review outcomes
Week 6 -> AI gateway, observability, cost, latency, and failure cases
Future weeks -> repo assistant and tuning-decision failures, if the project continues
```

The goal is not to collect random sample files.

The goal is to grow a repeatable failure dataset that proves ClaimFlow AI behaves safely when model output is incomplete, uncertain, unsupported, stale, memory-influenced, expensive, slow, or wrong.

---

## Dataset lookup

| Week | Dataset | Failure surface added | What it proves | Eval command | Eval reports |
| --- | --- | --- | --- | --- | --- |
| Week 1 | [`auto-insurance/v1`](./auto-insurance/v1) | Missing fields, extraction mismatch, invalid or partial claim data, required evidence gaps | Claim documents can be extracted into structured JSON and validated deterministically | `bun run eval:week1:export` + `bun run eval:week1` | [`week-1-eval.md`](./auto-insurance/v1/eval-results/week-1-eval.md), [`week-1-eval.json`](./auto-insurance/v1/eval-results/week-1-eval.json) |
| Week 2 | [`week-02-review-failures`](./week-02-review-failures) | Low-confidence extraction, duplicate uploads, unreadable files, missing evidence, bad workflow states, reviewer decisions | Unsafe or incomplete AI output is routed into human review instead of silently completing | `bun run eval:week2:review` | [`week-2-review-workflow-eval.md`](./week-02-review-failures/eval-results/week-2-review-workflow-eval.md), [`week-2-review-workflow-eval.json`](./week-02-review-failures/eval-results/week-2-review-workflow-eval.json) |
| Week 3 | [`week-03-policy-rag`](./week-03-policy-rag) | Wrong policy retrieval, missing citations, unsupported coverage answers, false approvals, weak retrieval evidence | Coverage answers are grounded in retrieved policy clauses and refuse or route to review when evidence is insufficient | `bun run rag:load-policies`, `bun run rag:embed-policies`, `bun run rag:smoke:retrieval-cases`, `bun run eval:week3:rag` | [`week-3-policy-rag-eval.md`](./week-03-policy-rag/eval-results/week-3-policy-rag-eval.md), [`week-3-policy-rag-eval.json`](./week-03-policy-rag/eval-results/week-3-policy-rag-eval.json) |
| Week 4 | [`week-04-agent-actions`](./week-04-agent-actions) | Wrong tool choice, unsafe final actions, missing-information routing failures, policy-lookup ordering errors, duplicate/conflict/mismatch routing | The agent can choose the next safe workflow action while guardrails block approval, rejection, email sending, deletion, bypass, and final-decision tools | `bun run eval:week4:agent` | [`week-4-agent-actions-eval.md`](./week-04-agent-actions/eval-results/week-4-agent-actions-eval.md), [`week-4-agent-actions-eval.json`](./week-04-agent-actions/eval-results/week-4-agent-actions-eval.json) |
| Week 5 | [`week-05-memory`](./week-05-memory) | Memory write/retrieval errors, irrelevant memory matches, unsafe memory-based approval/rejection, stale memory conflicts, memory update mistakes, pattern generalization mistakes | Workflow memory can use past corrections/review outcomes safely without overwriting current evidence or replacing source-of-truth policy/document data | `bun run memory:seed:week5`, `bun run eval:week5:memory` | [`week-5-memory-eval.md`](./week-05-memory/eval-results/week-5-memory-eval.md), [`week-5-memory-eval.json`](./week-05-memory/eval-results/week-5-memory-eval.json) |
| Week 6 | [`week-06-observability`](./week-06-observability) | Model timeout, invalid JSON, provider errors, cost limits, latency spikes, prompt/eval regressions, missing trace/model version | AI calls are governed through gateway logs with trace ID, model/prompt versions, cost, latency, retryability, and dashboard-ready failure metadata | `bun run eval:week6:gateway` after Day 4 | [`week-6-gateway-observability-eval.md`](./week-06-observability/eval-results/week-6-gateway-observability-eval.md), [`week-6-gateway-observability-eval.json`](./week-06-observability/eval-results/week-6-gateway-observability-eval.json) |

---

## How the failure dataset expands week by week

ClaimFlow AI is built as a layered AI workflow.

Each week adds a new failure class to test.

```txt
Week 1:
Can the system extract and validate claim data?

Week 2:
When extraction or validation is unsafe, can the system route to human review?

Week 3:
When answering coverage questions, can the system retrieve policy evidence, cite it, and refuse unsupported answers?

Week 4:
When an agent chooses an action, can the system select the safest workflow tool and block unsafe final actions?

Week 5:
When workflow memory is introduced, can the system reuse past corrections, review outcomes, and patterns safely without overwriting source-of-truth evidence?

Week 6:
When gateway and observability are introduced, can the system track prompt, model, version, cost, latency, retryability, and error behavior?
```

---

## Current evaluation layers

| Layer | Dataset | Checks |
| --- | --- | --- |
| Extraction eval | `auto-insurance/v1` | schema validity, field match, missing fields, required evidence, final validation status |
| Review workflow eval | `week-02-review-failures` | review task creation, review status transitions, review decisions, review events, duplicate/failure handling |
| Policy RAG eval | `week-03-policy-rag` | required clause retrieval, decision correctness, citation presence, citation support, unsupported-answer refusal, false approval rate |
| Agent action eval | `week-04-agent-actions` | tool selection, guardrail blocking, unsafe action rate, false approval rate, final workflow state match, information-request post-action behavior |
| Workflow memory eval | `week-05-memory` | memory writing, memory retrieval recall/precision, top-k hits, MemoryHit audit logging, safe memory-supported review routing, memory conflict blocking, confidence update behavior, semantic pattern creation |
| Gateway observability eval | `week-06-observability` | timeout classification, invalid JSON handling, provider retryability, cost policy blocks, latency warnings, trace/model/prompt version recording, governance regression visibility |

---

## Dataset folder contract

Each weekly dataset should own its own README and evaluation outputs.

Recommended structure:

```txt
sample-data/
  <dataset-name>/
    README.md

    source-docs/ or policies/ or packets/ or gateway-cases/
      ...

    expected/ or gold/
      ...

    eval-results/
      <eval-name>.md
      <eval-name>.json
```

The root `sample-data/README.md` is only the lookup/index.

Detailed explanations belong inside each dataset README.

---

## Evaluation artifact contract

Every eval should produce two report formats:

```txt
eval-results/*.md
eval-results/*.json
```

Markdown reports are for human review.

JSON reports are for future regression checks, dashboards, CI gates, and observability.

For reader-facing Markdown reports, avoid exposing meaningless local runtime IDs when possible.

Raw JSON reports may keep full debug detail.

---

## Current eval commands

From the repo root:

```bash
bun run eval:week1:export
bun run eval:week1

bun run eval:week2:review

bun run rag:load-policies
bun run rag:embed-policies
bun run rag:smoke:retrieval-cases
bun run eval:week3:rag

bun run eval:week4:agent

bun run memory:seed:week5
bun run memory:smoke:write
bun run memory:smoke:retrieval
bun run agent:smoke:memory
bun run memory:smoke:update
bun run memory:smoke:patterns
bun run eval:week5:memory

# Added on Week 6 Day 4.
bun run eval:week6:gateway

bun run check-types
```

For Week 6 Day 3 only, validate the JSON dataset before the eval runner exists:

```bash
find sample-data/week-06-observability -name "*.json" -print0 \
  | xargs -0 -n1 node -e 'const fs=require("node:fs"); JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log("valid", process.argv[1]);'
```

---

## What each week proved

### Week 1 - Extraction and validation

Proved:

```txt
raw claim document
-> AI extraction
-> structured JSON
-> deterministic validation
-> COMPLETED or NEEDS_REVIEW
```

Main safety property:

```txt
Incomplete claim data should not be treated as clean.
```

---

### Week 2 - Human review workflow

Proved:

```txt
bad / incomplete / low-confidence AI output
-> ReviewTask
-> reviewer action
-> ReviewDecision
-> ReviewEvent audit trail
```

Main safety property:

```txt
Unsafe AI output creates human work instead of silently passing.
```

---

### Week 3 - Policy RAG and citations

Proved:

```txt
claim context
+ coverage question
-> policy retrieval
-> grounded answer
-> citation verification
-> COVERED / NOT_COVERED / PARTIALLY_COVERED / NEEDS_REVIEW
```

Main safety property:

```txt
Coverage answers must be supported by retrieved policy clauses.
Unsupported or weakly grounded answers must not become approvals.
```

---

### Week 4 - Agent actions and guardrails

Proved:

```txt
claim state
+ available tools
-> agent proposes one workflow action
-> guardrails allow or block
-> safe workflow state transition
```

Main safety property:

```txt
The agent can draft workflow notes and requests, but it cannot approve, reject, send, delete, bypass review, or finalize claims.
```

The updated missing-information loop is:

```txt
missing evidence / missing fields
-> DRAFT_INFORMATION_REQUEST
-> MARK_NEEDS_MORE_INFO
-> ADDITIONAL_INFORMATION_RECEIVED
-> review reopened
```

---

### Week 5 - Workflow memory

Proved:

```txt
past workflow event
-> memory observation
-> WorkflowMemory card
-> relevant memory retrieval
-> safe agent/reviewer context
-> memory update or pattern creation
```

Week 5 memory is not generic chat memory.

It is workflow memory from:

```txt
human corrections
prior review decisions
agent action history
claimant patterns
vendor patterns
policy-history signals
recurring field/workflow mistakes
```

Main safety property:

```txt
Memory can warn, route, verify, update, and generalize.
Memory cannot approve, reject, overwrite current extracted JSON, replace current document evidence, or replace current policy/RAG evidence.
```

The Week 5 eval covers:

```txt
memory_writer      -> observations become safe WorkflowMemory cards
memory_retrieval   -> relevant memories are retrieved and irrelevant matches are ignored
memory_safety      -> unsafe memory-based actions are blocked
memory_conflict    -> current evidence beats old memory
memory_update      -> memory strengthens, weakens, or retires from feedback
semantic_pattern   -> repeated episodic memories become reusable pattern memory
```

Current Week 5 eval result:

```txt
totalPackets = 15
passed = 15
failed = 0

memory_write_accuracy = 100%
memory_recall_rate = 100%
memory_precision_rate = 100%
memory_top_k_hit_rate = 100%
memory_hit_logging_rate = 100%
memory_supported_review_rate = 100%
memory_update_accuracy = 100%
semantic_pattern_creation_accuracy = 100%

unsafe_memory_overwrite_rate = 0%
false_approval_rate = 0%
source_of_truth_violation_rate = 0%
```

---

### Week 6 - AI gateway and observability

Proved by the dataset:

```txt
synthetic model call
-> gateway wrapper
-> AiCallLog-compatible fields
-> expected status/failure type/retryability
-> dashboard-compatible eval signal
```

Week 6 observability is not claim logic.

It is governance around all AI behavior:

```txt
trace ID
model version
prompt version
schema version
latency
token usage
estimated cost
failure classification
retryability
dashboard visibility
```

Main safety property:

```txt
AI failures should be visible, classified, auditable, and evaluable.
The workflow should not silently lose model errors, parse failures, cost spikes, latency spikes, or missing governance metadata.
```

The Week 6 dataset covers:

```txt
w6-001-model-timeout
w6-002-invalid-json-response
w6-003-cost-limit-exceeded
w6-004-provider-error
w6-005-latency-spike
w6-006-prompt-version-regression
w6-007-eval-score-dropped
w6-008-missing-trace-id
w6-009-missing-model-version
```

The Week 6 eval should report:

```txt
eval_pass_rate
cost_per_run
latency_p95
model_error_rate
invalid_json_rate
prompt_version_regression_rate
missing_trace_rate
missing_model_version_rate
retryable_failure_rate
blocked_by_cost_policy_rate
```

---

## Most important regression metrics

Across weeks, the most important safety metrics are:

```txt
false_completion_rate = 0
false_approval_rate = 0
unsupported_answer_rate = 0
unsafe_action_rate = 0
unsafe_memory_overwrite_rate = 0
source_of_truth_violation_rate = 0
blocked_invalid_action_rate should stay high
citation_support_rate should stay high once RAG is introduced
review_routing_accuracy should stay high after Week 2
post_action_accuracy should stay high after Week 4
memory_precision_rate should stay high after Week 5
memory_supported_review_rate should stay high after Week 5
memory_update_accuracy should stay high after Week 5
missing_trace_rate should stay 0 after Week 6
unclassified_gateway_failure_rate should stay 0 after Week 6
ungoverned_model_call_rate should stay 0 after Week 6
```

For this project, a flashy demo is not enough.

A feature is only considered shipped when it has:

```txt
dataset
expected behavior
repeatable eval
human-readable report
machine-readable report
```

---

## Safety rules for sample data

Do not commit:

```txt
private customer claim documents
real policy numbers
real phone numbers or emails
private insurance data
API keys
large raw datasets
```

All committed claim IDs, policy numbers, names, emails, and phone numbers should stay fake and stable.

Synthetic data is intentional because it makes failure cases repeatable and safe to debug.
