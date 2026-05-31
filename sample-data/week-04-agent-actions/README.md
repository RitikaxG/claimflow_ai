# Week 4 Agent Action Dataset

This dataset evaluates whether the ClaimFlow AI agent chooses safe and correct workflow actions.

## Packet structure

Each packet contains:

- `manifest.json`
- `claim-state.json`
- `available-tools.json`
- `documents/`
- `gold/actions.expected.json`
- `gold/guardrails.expected.json`
- `gold/final-state.expected.json`
- `annotations/reviewer-notes.md`

## What this dataset covers

- unreadable source documents
- missing policy lookup
- invalid JSON extraction
- clean claim approval-note drafting
- policy exclusion blocking approval
- repeated extraction failure
- final human review state
- multiple claims in one email
- document mismatch
- conflicting invoice amount
- theft claim missing FIR
- additional evidence received and review reopened

## Important implementation note

The original Week 4 plan used `DRAFT_FOLLOWUP_REQUEST` and `MARK_NEEDS_MORE_EVIDENCE`.

The current ClaimFlow implementation also supports the more general pair:

- `DRAFT_INFORMATION_REQUEST`
- `MARK_NEEDS_MORE_INFO`

This is intentional because a claim can be missing both documents and extracted field values.
