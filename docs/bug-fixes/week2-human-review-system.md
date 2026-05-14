# Week 2 Bugs + Fixes — Human Review System

Week 2 turned `NEEDS_REVIEW` from a label into a real human review workflow.  
These are the main bugs/failure cases fixed while implementing the review system.

---

## 1. `NEEDS_REVIEW` did not create real review work

### Problem

In Week 1, validation could mark an `ExtractionRun` as `NEEDS_REVIEW`, but there was no separate task for a human reviewer.

```txt
ExtractionRun.status = NEEDS_REVIEW
```

This was useful for display, but not enough for a workflow.

### Fix

When validation returns `NEEDS_REVIEW`, the backend now creates a `ReviewTask`.

```txt
ExtractionRun.status = NEEDS_REVIEW
→ ReviewTask.status = PENDING
→ ReviewTask.priority = NORMAL
→ ReviewEvent.type = REVIEW_TASK_CREATED
```

### Why it matters

A reviewer now has a real unit of work instead of just seeing a flagged extraction run.

---

## 2. Review reasons needed to be stored separately

### Problem

The UI needed to explain *why* a claim required review, but that reason was spread across validation fields.

### Fix

Created `ReviewTask.reasonJson` from the validation result.

It stores:

```txt
missingFields
conflicts
warnings
requiredEvidence
sourceFinalStatus
```

### Why it matters

The review queue can show clear review reasons without recalculating them from the original validation response.

---

## 3. Review actions needed strict state transitions

### Problem

Without state guards, a task could accidentally be approved, rejected, or requested for more info from the wrong status.

### Fix

Review APIs now enforce valid transitions:

```txt
PENDING → IN_REVIEW
IN_REVIEW → APPROVED
IN_REVIEW → EDITED_AND_APPROVED
IN_REVIEW → REJECTED
IN_REVIEW → NEEDS_MORE_INFO
```

Invalid transitions return `409`.

### Why it matters

The workflow behaves like a state machine. A completed task cannot be completed again by another action.

---

## 4. Start review needed to be safe and mostly idempotent

### Problem

Clicking start multiple times could create confusing behavior.

### Fix

If the task is already `IN_REVIEW`, the start endpoint returns the existing task with `alreadyStarted: true`.

If the task is already completed, it returns `409`.

### Why it matters

A reviewer can safely start a task once, and completed tasks remain final.

---

## 5. Final review decisions were not being stored

### Problem

Changing `ReviewTask.status` alone was not enough. The system needed to know:

```txt
who decided
what decision was made
what corrected JSON was approved
what notes were added
```

### Fix

Final human actions now create `ReviewDecision`.

Decision types:

```txt
APPROVE_AS_IS
EDIT_AND_APPROVE
REJECT
REQUEST_MORE_INFO
```

### Why it matters

The review decision is queryable and auditable separately from the task status.

---

## 6. Human actions needed their own audit timeline

### Problem

`ExtractionEvent` explains AI extraction/validation events, but human review needed a separate timeline.

### Fix

Created `ReviewEvent`.

Important events:

```txt
REVIEW_TASK_CREATED
REVIEW_STARTED
REVIEW_APPROVED_AS_IS
REVIEW_EDITED_AND_APPROVED
REVIEW_REJECTED
REVIEW_MORE_INFO_REQUESTED
```

### Why it matters

AI workflow history and human review history are both preserved.

---

## 7. Approval needed to re-run validation

### Problem

A reviewer could edit JSON and approve it even if important fields were still missing.

### Fix

The approval path now validates corrected JSON again:

```txt
correctedJson
→ ClaimExtractionSchema validation
→ deterministic rule validation
→ block approval if required fields/evidence are still missing
```

Approval is blocked if issues like these remain:

```txt
policyNumber missing
FIR missing for theft claim
required evidence still missing
error-level conflicts still present
```

### Why it matters

Human approval does not bypass business rules.

---

## 8. `missingEvidence` needed backend normalization

### Problem

The reviewer should not manually keep `missingEvidence` in sync.

### Fix

The backend recomputes required evidence during review approval and normalizes:

```txt
correctedJson.missingEvidence = validation.requiredEvidence
```

### Why it matters

The approved JSON stays consistent with the validation rules.

---

## 9. Original AI output needed to stay unchanged

### Problem

If approval overwrote `ExtractionRun.extractedJson` or `ExtractionRun.validationJson`, audit history would be lost.

### Fix

Original AI output remains immutable:

```txt
ExtractionRun.extractedJson      unchanged
ExtractionRun.validationJson     unchanged
```

Corrected human output is stored separately in `ReviewDecision`:

```txt
ReviewDecision.correctedJson
ReviewDecision.correctedValidationJson
```

### Why it matters

The system can compare:

```txt
what AI extracted
vs
what human approved
```

That is important for audits, evals, and future learning loops.

---

## 10. Reject and request-more-info needed notes

### Problem

A reviewer could reject or request more information without explaining why.

### Fix

Both actions now require notes.

```txt
POST /reject              requires notes
POST /request-more-info   requires notes
```

### Why it matters

Negative decisions are explainable and useful for future claim handling.
