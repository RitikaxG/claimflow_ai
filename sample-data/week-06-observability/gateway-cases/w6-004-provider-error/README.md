# w6-004-provider-error - Provider 500 becomes retryable gateway failure

## Purpose

Verifies provider-side errors are classified as retryable provider failures.

## Expected gateway result

```txt
status: RETRYABLE
failureType: PROVIDER_ERROR
retryable: true
```

## Notes

This is a deterministic synthetic case. It should not call a real Gemini/provider API.
