# w6-009-missing-model-version - Missing model version is blocked

## Purpose

Verifies governed calls cannot proceed without modelVersion.

## Expected gateway result

```txt
status: BLOCKED
failureType: MISSING_MODEL_VERSION
retryable: false
```

## Notes

This is a deterministic synthetic case. It should not call a real Gemini/provider API.
