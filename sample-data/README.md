# ClaimFlow AI Sample Data

This folder contains the synthetic and public sample data used to test ClaimFlow AI across the 8-week build.

The sample-data folder should now be treated as a growing evaluation workspace, not as a Week 1-only dataset. Each week can add its own dataset, gold expectations, actual outputs, and eval results.

## Current datasets

| Week | Dataset | Purpose | Eval results |
|---|---|---|---|
| Week 1 | [`auto-insurance/v1`](./auto-insurance/v1) | Auto insurance document extraction + deterministic validation | [`auto-insurance/v1/eval-results`](./auto-insurance/v1/eval-results) |
| Week 2 | [`week-02-review-failures`](./week-02-review-failures) | Human-review routing, failure handling, review decisions, and workflow-state correctness | [`week-02-review-failures/eval-results`](./week-02-review-failures/eval-results) |
| Week 3 | [`week-03-policy-rag`](./week-03-policy-rag) | Policy clause retrieval, grounded coverage answers, citations, insufficient-evidence refusal, and false-approval prevention | [`week-03-policy-rag/eval-results`](./week-03-policy-rag/eval-results) |

## Folder contract

Each dataset should own its own README and, when relevant, these folders:

```txt
sample-data/
  <dataset-name>/
    README.md
    source-docs/ or policies/ or packets/
    questions/
    expected-extractions/ or expected/ or gold/
    expected-validations/ or expected/ or gold/
    actual-extractions/
    actual-validations/
    eval-results/
```

Use this pattern so future weeks can add RAG, memory, gateway, agent, and fine-tuning decision datasets without mixing responsibilities.

## Evaluation artifacts

Eval outputs should be committed in two forms:

```txt
eval-results/*.md    # human-readable report for docs/review
eval-results/*.json  # machine-readable result for future dashboards/regression checks
```

Current eval reports:

- Week 1: [`auto-insurance/v1/eval-results/week-1-eval.md`](./auto-insurance/v1/eval-results/week-1-eval.md)
- Week 1 JSON: [`auto-insurance/v1/eval-results/week-1-eval.json`](./auto-insurance/v1/eval-results/week-1-eval.json)
- Week 2: [`week-02-review-failures/eval-results/week-2-review-workflow-eval.md`](./week-02-review-failures/eval-results/week-2-review-workflow-eval.md)
- Week 2 JSON: [`week-02-review-failures/eval-results/week-2-review-workflow-eval.json`](./week-02-review-failures/eval-results/week-2-review-workflow-eval.json)
- Week 3: [`week-03-policy-rag/eval-results/week-3-policy-rag-eval.md`](./week-03-policy-rag/eval-results/week-3-policy-rag-eval.md)
- Week 3 JSON: [`week-03-policy-rag/eval-results/week-3-policy-rag-eval.json`](./week-03-policy-rag/eval-results/week-3-policy-rag-eval.json)

## Current domain

Auto insurance claim intake.

## Why synthetic data exists

Synthetic data gives ClaimFlow AI stable, repeatable, safe examples without exposing real customer information.

Synthetic data is especially useful for this project because every packet can define:

```txt
input document
expected extraction
expected validation
expected workflow state
expected review task behavior
expected human decision behavior
expected policy clauses
expected coverage answer behavior
expected refusal behavior
```

That makes failures easier to debug than with uncontrolled public documents.

## Week 3 policy RAG dataset

Week 3 adds a deterministic RAG dataset:

```txt
sample-data/week-03-policy-rag/
```

It contains:

```txt
policies/      synthetic policy markdown used as the RAG knowledge base
questions/     coverage eval questions
packets/       claim contexts that simulate extraction/review output
expected/      retrieval and answer quality expectations
eval-results/  generated eval reports
```

The Week 3 dataset is designed to test:

```txt
policy clause retrieval
citation presence
citation support
coverage decision correctness
unsupported answer refusal
false approval prevention
```

## How to run current evals

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

Week 3 checks whether policy coverage answers are grounded in retrieved clauses and safely refuse insufficient evidence.

## Safety

Do not commit:

- private customer claim documents
- real policy numbers
- real phone numbers or emails
- private insurance data
- API keys
- large raw datasets

All committed synthetic packet IDs, claim IDs, emails, phone numbers, and policy documents should stay fake and stable for repeatable workflow testing.
