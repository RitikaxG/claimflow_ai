# Week 4 Agent Action Dataset

This dataset evaluates whether the ClaimFlow AI agent chooses safe and correct workflow actions for the updated Week 4 agentic workflow.

## Updated Week 4 workflow

The current workflow unifies missing documents and missing extracted fields under one information-request loop:

`missing evidence / missing fields → DRAFT_INFORMATION_REQUEST → MARK_NEEDS_MORE_INFO → ADDITIONAL_INFORMATION_RECEIVED → review reopened`

The agent must not approve claims, reject claims, send emails, delete claims, bypass review, or create final claim decisions.

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
- missing extracted fields
- mixed missing fields and missing evidence
- additional information received and review reopened
- duplicate claim signal
- insufficient policy evidence
- final review mutation blocking

## Current tool preference

The preferred missing-information path is:

- `draft_information_request`
- deterministic post-action: `mark_needs_more_info`

Legacy evidence-only/follow-up tools are intentionally not included in the packet gold files or available tool lists.
