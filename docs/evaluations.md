# ClaimFlow AI Evaluations

This document tracks how ClaimFlow AI is evaluated as the project grows week by week.

The project should not only ship UI demos. Each week should also leave behind a small repeatable eval that proves the workflow still behaves correctly.

## Current eval layers

| Week | Eval | Dataset | What it proves |
|---|---|---|---|
| Week 1 | Extraction + validation eval | `sample-data/auto-insurance/v1` | Gemini output can be compared against gold extraction JSON, and deterministic validation produces expected `COMPLETED` / `NEEDS_REVIEW` behavior |
| Week 2 | Review workflow eval | `sample-data/week-02-review-failures` | Bad or incomplete AI output is routed into human review instead of silently completing or breaking the app |
| Week 3 | Policy RAG + citations eval | `sample-data/week-03-policy-rag` | Coverage questions retrieve required policy clauses, cite only retrieved evidence, refuse weak evidence, and avoid false approvals |

## Eval artifacts

| Week | Markdown report | JSON report |
|---|---|---|
| Week 1 | `sample-data/auto-insurance/v1/eval-results/week-1-eval.md` | `sample-data/auto-insurance/v1/eval-results/week-1-eval.json` |
| Week 2 | `sample-data/week-02-review-failures/eval-results/week-2-review-workflow-eval.md` | `sample-data/week-02-review-failures/eval-results/week-2-review-workflow-eval.json` |
| Week 3 | `sample-data/week-03-policy-rag/eval-results/week-3-policy-rag-eval.md` | `sample-data/week-03-policy-rag/eval-results/week-3-policy-rag-eval.json` |

Markdown reports are for human review and documentation.

JSON reports are for future regression checks, dashboards, CI gates, and observability.

## How to run evals

From the repo root:

```bash
bun run eval:week1:export
bun run eval:week1
bun run eval:week2:review
bun run rag:load-policies
bun run rag:embed-policies
bun run rag:smoke:retrieval-cases
bun run eval:week3:rag
```

Week 1 checks extraction and validation behavior.

Week 2 checks whether bad, incomplete, low-confidence, duplicate, failed, or human-decision packets move through the correct workflow states.

Week 3 checks whether coverage answers are grounded in retrieved policy clauses and safely refuse unsupported answers.

## Week 1 eval: extraction + validation

Goal:

```txt
source document
→ AI extraction
→ ClaimExtractionSchema
→ deterministic validation
→ compare actual vs expected
```

Current result:

![Week 1 Eval Result](../sample-data/images/eval-results-week1.png)

- Samples evaluated: 5
- Blockers: 0
- Extraction schema passed for all samples
- Validation schema passed for all samples
- Final statuses matched expected workflow behavior
- One non-blocking warning mismatch exists in `repair-estimate-only`

What it measures:

- field-level extraction match
- extraction schema validity
- validation schema validity
- missing fields
- required evidence
- conflict rule IDs
- warning rule IDs
- expected final status vs actual final status

## Week 2 eval: human review workflow

Goal:

```txt
bad / incomplete / duplicate / failed / review-decision packet
→ upload
→ extract
→ validate
→ review task routing
→ optional reviewer action
→ assert database state
```

![Week 2 Eval Result](../sample-data/images/eval-results-week2.png)

Current result:

- Total packets: 15
- Passed: 15
- Failed: 0
- Review routing accuracy: 100.0%
- Risky packets did not get incorrectly completed

What it measures:

- `ExtractionRun.status`
- `ReviewTask` existence
- `ReviewTask.status`
- `ReviewTask.priority`
- `ReviewTask.reasonJson`
- expected review events
- expected final review decisions
- duplicate upload behavior
- extraction failure behavior

## Week 3 eval: policy RAG + citations

Goal:

```txt
claim context
+ coverage question
→ query planning
→ policy clause retrieval
→ grounded answer generation
→ citation verification
→ compare against expected retrieval and decision behavior
```

Current status:

- Retrieval smoke tests are implemented.
- The full answer-generation eval should be re-run after Gemini API quota refresh.
- Until the final rerun is complete, treat Week 3 eval status as pending final confirmation.

What it measures:

- required policy clauses retrieved
- expected decision matched
- citations present when required
- citations point only to retrieved chunks
- cited quotes exist in retrieved policy text
- unsupported questions return `NEEDS_REVIEW` / insufficient evidence
- missing evidence is mentioned when required
- false approval rate stays at `0%`

Important Week 3 metrics:

```txt
retrieval_hit_rate
coverage_decision_match_rate
citation_present_rate
citation_support_rate
unsupported_refusal_rate
false_approval_rate
```

Most important safety metric:

```txt
false_approval_rate = 0
```

A false approval means the system returned `COVERED` when the expected safe answer was not `COVERED`.

## Why evals matter for this project

ClaimFlow AI is a workflow reliability project, not just a prompt demo.

The important question is not only:

```txt
Did the model extract JSON?
```

The stronger question is:

```txt
When the model is wrong, incomplete, uncertain, unsupported, or blocked, does the system move safely into the right product state?
```

That is why the evals include workflow assertions, retrieval assertions, citation assertions, and final-state assertions.

## How evals should grow in future weeks

| Future week | Eval direction |
|---|---|
| Week 4 — agentic workflow | Tool-selection correctness, guardrail behavior, invalid-action blocking, final-state correctness |
| Week 5 — memory | Whether past human corrections are reused safely without overwriting source-of-truth evidence |
| Week 6 — gateway + observability | Eval dashboard, latency/cost/error metrics, prompt/model version tracking |
| Week 7 — repo assistant | Terminal-agent command safety, patch correctness, repo-context retrieval quality |
| Week 8 — fine-tuning decision | Evidence-based decision on whether RAG, rules, memory, or fine-tuning is the right next move |

## Rule for adding new evals

Every new eval should produce:

```txt
sample-data/<dataset>/eval-results/<eval-name>.md
sample-data/<dataset>/eval-results/<eval-name>.json
```

Every eval should answer four questions:

1. What dataset was used?
2. What behavior was expected?
3. What behavior actually happened?
4. Did any blocker appear that should stop shipping?

## Current status

Week 1 and Week 2 have committed eval reports.

Week 3 has the RAG eval script and report paths ready. The final full answer-generation eval should be re-run after API quota refresh.

```txt
Week 1: Can extract and validate claim data.
Week 2: Can route unsafe AI output into human review.
Week 3: Can retrieve policy evidence and generate cited coverage answers, with final eval rerun pending.
```
