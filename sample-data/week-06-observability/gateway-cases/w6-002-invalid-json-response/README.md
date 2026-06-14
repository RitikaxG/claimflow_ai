# w6-002-invalid-json-response - Invalid JSON response becomes failed gateway call

## Purpose

Verifies malformed model JSON is logged as FAILED with INVALID_JSON_RESPONSE.

## Expected gateway result

```txt
status: FAILED
failureType: INVALID_JSON_RESPONSE
retryable: false
```

## Notes

This is a deterministic synthetic case. It should not call a real Gemini/provider API.
