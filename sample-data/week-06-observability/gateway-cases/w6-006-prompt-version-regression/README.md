# w6-006-prompt-version-regression - Prompt version regression is detected

## Purpose

Verifies eval/governance can represent prompt version regression as a gateway failure case.

## Expected gateway result

```txt
status: FAILED
failureType: PROMPT_VERSION_REGRESSION
retryable: false
```

## Notes

This is a deterministic synthetic case. It should not call a real Gemini/provider API.
