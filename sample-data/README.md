# ClaimFlow AI Sample Data

This folder contains the synthetic and public sample data used to test ClaimFlow AI across the 8-week build.

The sample-data folder should now be treated as a growing evaluation workspace, not as a Week 1-only dataset. Each week can add its own dataset, gold expectations, actual outputs, and eval results.

## Current datasets

| Week | Dataset | Purpose | Eval results |
|---|---|---|---|
| Week 1 | [`auto-insurance/v1`](./auto-insurance/v1) | Auto insurance document extraction + deterministic validation | [`auto-insurance/v1/eval-results`](./auto-insurance/v1/eval-results) |
| Week 2 | [`week-02-review-failures`](./week-02-review-failures) | Human-review routing, failure handling, review decisions, and workflow-state correctness | [`week-02-review-failures/eval-results`](./week-02-review-failures/eval-results) |

## Folder contract

Each dataset should own its own README and, when relevant, these folders:

```txt
sample-data/
  <dataset-name>/
    README.md
    source-docs/ or packets/
    expected-extractions/ or gold/
    expected-validations/ or gold/
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
```

That makes failures easier to debug than with uncontrolled public documents.

## How to run current evals

From the repo root:

```bash
bun run eval:week1:export
bun run eval:week1
bun run eval:week2:review
```

Week 1 checks extraction and validation behavior.

Week 2 checks whether bad, incomplete, low-confidence, duplicate, failed, or human-decision packets move through the correct workflow states.

## Safety

Do not commit:

- private customer claim documents
- real policy numbers
- real phone numbers or emails
- private insurance data
- API keys
- large raw datasets

All committed synthetic packet IDs, claim IDs, emails, and phone numbers should stay fake and stable for repeatable workflow testing.
