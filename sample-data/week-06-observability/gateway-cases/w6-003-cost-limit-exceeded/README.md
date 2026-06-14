# w6-003-cost-limit-exceeded - Cost limit exceeded blocks gateway call

## Purpose

Verifies a high token synthetic call is blocked by gateway cost policy.

## Expected gateway result

```txt
status: BLOCKED
failureType: COST_LIMIT_EXCEEDED
retryable: false
```

## Notes

This is a deterministic synthetic case. It should not call a real Gemini/provider API.
