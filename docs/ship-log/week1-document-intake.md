# Week 1 Ship Log — Document Intake + Extraction + Validation

## Summary

Built the first working ClaimFlow AI workflow:

```txt
PDF / Email text
→ Gemini extraction
→ structured claim JSON
→ deterministic validation
→ COMPLETED or NEEDS_REVIEW
→ timeline + review explanation
```

## Problem

AI extraction output is unreliable unless it becomes validated product state.

Raw LLM JSON is not enough for an insurance workflow. The system must check whether required claim data is present, whether evidence is missing, and whether the claim can proceed or needs review.

## Built

- PDF claim upload
- Email text intake
- Local PDF storage
- Email text persistence in `Document.contentText`
- Gemini structured extraction
- Zod/schema-based output parsing
- Deterministic validation rules
- Missing field detection
- Conflict detection
- Warning detection
- Required evidence detection
- Run status lifecycle:
  - `UPLOADED`
  - `EXTRACTING`
  - `VALIDATING`
  - `COMPLETED`
  - `NEEDS_REVIEW`
  - `FAILED`
- Persisted `Document`
- Persisted `ExtractionRun`
- Persisted `ExtractionEvent`
- Timeline from upload to final status
- Basic review queue for `NEEDS_REVIEW`
- Soft delete and restore
- Duplicate upload handling using `sourceType + contentHash`

## Demo

Demo: https://x.com/RitikaxG/status/2052737543192629329?s=20

Design doc: `docs/week-1/document-intake-reviewer.md`

## What this proves

- I can build AI workflows beyond simple prompt calls.
- I can turn LLM output into validated app state.
- I can persist extraction results and validation results.
- I can route incomplete AI output to review.
- I can design workflow states and timeline events.
- I can handle real document workflow edge cases like duplicate uploads and restore.

## Week 1 result

```txt
Upload PDF/email
→ Extract JSON
→ Validate JSON
→ Show COMPLETED or NEEDS_REVIEW
→ Explain missing fields/conflicts/evidence
→ Store timeline
```

Week 1 is complete.
