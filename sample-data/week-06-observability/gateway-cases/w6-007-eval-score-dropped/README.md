# w6-007-eval-score-dropped - Eval score drop is represented as observability failure

## Purpose

Verifies Week 6 can represent score regression from a previous eval run.

## Expected gateway result

```txt
status: FAILED
failureType: EVAL_SCORE_DROPPED
retryable: false
```

## Notes

This is a deterministic synthetic case. It should not call a real Gemini/provider API.
