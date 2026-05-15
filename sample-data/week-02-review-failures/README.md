# Week 02 Review Failure Dataset

This folder contains controlled synthetic claim packets for testing the Week 2 human review workflow in ClaimFlow AI.

The goal of this dataset is not to train a model. The goal is to verify that bad, incomplete, low-confidence, conflicting, duplicate, or failed extraction cases move through the correct workflow states.

## What this dataset tests

These packets test whether ClaimFlow AI correctly handles:

- missing required claim fields
- low-confidence AI extraction
- repair-estimate-only uploads
- third-party claims without police report evidence
- theft claims without FIR number
- invalid repair cost values
- repair cost with missing currency
- unknown loss type
- clean completed claims
- duplicate email uploads
- unreadable PDF extraction failure
- edit-and-approve review decisions
- reject review decisions
- request-more-info review decisions

## Folder structure

Each packet follows this structure:

```txt
packets/
  w2-001-missing-policy-number/
    manifest.json
    documents/
      fnol-email.txt
    gold/
      extraction.gold.json
      validation.expected.json
      workflow.expected.json
    annotations/
      review-notes.md
```

Some packets may have additional files. For example:

```txt
w2-013-edit-and-approve/
  gold/
    corrected-extraction.expected.json
    corrected-validation.expected.json
```

The extraction-failure packet is special:

```txt
w2-012-unreadable-pdf/
  manifest.json
  documents/
    unreadable-claim-form.pdf
  gold/
    workflow.expected.json
  annotations/
    review-notes.md
```

`w2-012-unreadable-pdf` intentionally does not have `extraction.gold.json` or `validation.expected.json` because extraction is expected to fail before validation runs.

## Packet contract

Every non-failure packet should include:

- `manifest.json`
- one source document under `documents/`
- `gold/extraction.gold.json`
- `gold/validation.expected.json`
- `gold/workflow.expected.json`
- `annotations/review-notes.md`

Every source document should include a packet marker near the top:

```txt
CLAIMFLOW_PACKET_ID: w2-001-missing-policy-number
```

This marker makes mock extraction deterministic.

## Manifest fields

Each `manifest.json` describes:

- `packetId`: stable packet identifier
- `claimId`: synthetic claim ID
- `scenario`: what the packet is testing
- `sourceType`: `EMAIL_TEXT` or `PDF`
- `documentPath`: relative path to the source document inside the packet
- `mockBehavior`: how the mock extraction layer should behave
- `expected`: expected run, validation, review, duplicate, or failure behavior

Example:

```json
{
  "packetId": "w2-001-missing-policy-number",
  "claimId": "CLM-W2-001",
  "scenario": "FNOL email is missing policy number",
  "sourceType": "EMAIL_TEXT",
  "documentPath": "documents/fnol-email.txt",
  "mockBehavior": "RETURN_GOLD_EXTRACTION",
  "expected": {
    "runStatusAfterValidation": "NEEDS_REVIEW",
    "reviewTaskShouldExist": true,
    "reviewTaskStatus": "PENDING",
    "reviewTaskPriority": "NORMAL",
    "missingFields": ["policyNumber"],
    "conflicts": [],
    "warnings": [],
    "requiredEvidence": [],
    "reviewEvents": ["REVIEW_TASK_CREATED"]
  }
}
```

## Packet list

| Packet | Scenario | Expected behavior |
|---|---|---|
| `w2-001-missing-policy-number` | Policy number is missing | `NEEDS_REVIEW`, review task created |
| `w2-002-missing-incident-location` | Incident location is missing | `NEEDS_REVIEW`, review task created |
| `w2-003-low-confidence` | Overall confidence is below threshold | `NEEDS_REVIEW`, review task created |
| `w2-004-repair-estimate-only` | Uploaded document is only a repair estimate | `NEEDS_REVIEW`, required evidence: `claimForm` |
| `w2-005-third-party-no-police-report` | Third-party claim has no police report | `NEEDS_REVIEW`, required evidence: `policeReport` |
| `w2-006-theft-missing-fir` | Theft claim has no FIR number | `NEEDS_REVIEW`, missing `police.firNumber` |
| `w2-007-invalid-repair-cost` | Repair cost is zero or invalid | `NEEDS_REVIEW`, conflict: `INVALID_REPAIR_COST` |
| `w2-008-currency-missing` | Repair cost exists but currency is missing | `NEEDS_REVIEW`, conflict: `CURRENCY_REQUIRED_WITH_REPAIR_COST` |
| `w2-009-unknown-loss-type` | Loss type cannot be classified | `NEEDS_REVIEW`, conflict: `LOSS_TYPE_UNKNOWN` |
| `w2-010-clean-completed` | Clean claim with all required fields | `COMPLETED`, no review task |
| `w2-011-duplicate-email` | Same email uploaded twice | duplicate upload detected |
| `w2-012-unreadable-pdf` | Mock unreadable PDF extraction failure | `FAILED`, no review task |
| `w2-013-edit-and-approve` | AI misses a field, reviewer corrects it | `EDITED_AND_APPROVED` |
| `w2-014-reject` | Suspicious claim is rejected | `REJECTED` |
| `w2-015-request-more-info` | Insufficient evidence | `NEEDS_MORE_INFO` |

## How this fits the Week 2 workflow

The intended test path is:

```txt
source document
→ mock extraction
→ extraction.gold.json
→ validateClaimExtraction()
→ validation.expected.json
→ workflow.expected.json
```

For `NEEDS_REVIEW` packets, validation should create:

- `ExtractionRun.status = NEEDS_REVIEW`
- `ReviewTask.status = PENDING`
- `ReviewTask.priority = NORMAL`
- `ReviewTask.reasonJson` containing missing fields, conflicts, warnings, and required evidence
- `ReviewEvent.type = REVIEW_TASK_CREATED`

For review-decision packets, the workflow should also test:

- `REVIEW_STARTED`
- `REVIEW_EDITED_AND_APPROVED`
- `REVIEW_REJECTED`
- `REVIEW_MORE_INFO_REQUESTED`

## Safety

All data in this folder is synthetic.

Do not commit:

- real customer claim documents
- real policy numbers
- real phone numbers or emails
- private insurance data
- API keys
- large raw datasets

Synthetic packet IDs, claim IDs, emails, and phone numbers are intentionally fake and stable for repeatable workflow testing.
