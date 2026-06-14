# w6-005-latency-spike - Latency spike is visible on successful gateway call

## Purpose

Verifies slow successful calls are logged with LATENCY_SPIKE warning metadata.

## Expected gateway result

```txt
status: SUCCEEDED
failureType: LATENCY_SPIKE
retryable: false
```

## Notes

This is a deterministic synthetic case. It should not call a real Gemini/provider API.
