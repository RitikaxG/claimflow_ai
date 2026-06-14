# w6-001-model-timeout - Model timeout becomes retryable gateway failure

## Purpose

Verifies timeout is logged as RETRYABLE with MODEL_TIMEOUT.

## Expected gateway result

```txt
status: RETRYABLE
failureType: MODEL_TIMEOUT
retryable: true
```

## Notes

This is a deterministic synthetic case. It should not call a real Gemini/provider API.
