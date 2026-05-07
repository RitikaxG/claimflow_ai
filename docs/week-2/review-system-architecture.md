# ClaimFlow AI — Week 2 Review System Architecture

## Goal

Convert `NEEDS_REVIEW` extraction runs into a human review workflow.

```txt
Document → Gemini extractedJson → validationJson
→ NEEDS_REVIEW → ReviewTask
→ reviewer decision/correction → ReviewDecision
→ audit trail → ReviewEvent
```

---

## Key references

### Label Studio takeaway

Label Studio separates:

```txt
data → prediction → annotation
```

ClaimFlow mapping:

```txt
Document = original PDF/email
ExtractionRun.extractedJson = Gemini prediction
ReviewDecision.correctedJson = human corrected output
```

Decision:

```txt
Do not overwrite extractedJson.
Store human corrections separately as correctedJson.
```

### Amazon A2I takeaway

A2I creates a human review task when an ML workflow sends a data object for review.

ClaimFlow mapping:

```txt
finalStatus === "NEEDS_REVIEW" → create ReviewTask
/review page → reviewer task inbox
review detail page → worker UI
ReviewDecision → reviewer output
ReviewEvent → review metadata/audit trail
```

---

## Core architecture decisions

### 1. Review is separate from extraction

Keep extraction lifecycle in `ExtractionRun.status`:

```txt
UPLOADED
EXTRACTING
VALIDATING
COMPLETED
NEEDS_REVIEW
FAILED
```

Keep human review lifecycle in `ReviewTask.status`:

```txt
PENDING
IN_REVIEW
APPROVED
EDITED_AND_APPROVED
REJECTED
NEEDS_MORE_INFO
```

### 2. Review task trigger

Create a `ReviewTask` when validation returns:

```ts
finalStatus === "NEEDS_REVIEW"
```

### 3. Idempotency

One extraction run should create only one review task.

```txt
review_tasks.runId must be unique
```

### 4. Snapshot review reason

Store why review was needed in `ReviewTask.reasonJson`.

Example:

```json
{
  "missingFields": ["policyNumber", "incident.incidentDate"],
  "conflicts": [],
  "warnings": [],
  "requiredEvidence": ["policeReport"],
  "sourceFinalStatus": "NEEDS_REVIEW"
}
```

---

## Proposed tables

### ReviewTask

```txt
id
runId unique
status
priority
reasonJson
assignedTo
startedAt
completedAt
createdAt
updatedAt
```

Purpose:

```txt
Queue item / human loop for one extraction run.
```

### ReviewDecision

```txt
id
reviewTaskId
decision
correctedJson
notes
reviewerName
createdAt
```

Decision types:

```txt
APPROVE_AS_IS
EDIT_AND_APPROVE
REJECT
REQUEST_MORE_INFO
```

Purpose:

```txt
Stores reviewer output.
```

### ReviewEvent

```txt
id
reviewTaskId
type
message
metadata
createdAt
```

Event types:

```txt
REVIEW_TASK_CREATED
REVIEW_STARTED
REVIEW_APPROVED_AS_IS
REVIEW_EDITED_AND_APPROVED
REVIEW_REJECTED
REVIEW_MORE_INFO_REQUESTED
```

Purpose:

```txt
Audit trail for human review.
```

---

## Backend flow

### 1. Validation creates review task

```txt
POST /api/extraction-runs/:runId/validate
→ validateClaimExtraction()
→ save validationJson
→ set run.status = COMPLETED or NEEDS_REVIEW
→ if NEEDS_REVIEW, upsert ReviewTask
```

### 2. Review queue reads from ReviewTask

Current Day 5 queue:

```txt
extraction_runs where status = NEEDS_REVIEW
```

Week 2 queue:

```txt
review_tasks where status in PENDING, IN_REVIEW, NEEDS_MORE_INFO
```

### 3. Review actions

```txt
POST /api/review-tasks/:taskId/start
PENDING → IN_REVIEW

POST /api/review-tasks/:taskId/approve
APPROVE_AS_IS → final data = extractedJson

POST /api/review-tasks/:taskId/edit-and-approve
EDIT_AND_APPROVE → final data = correctedJson

POST /api/review-tasks/:taskId/reject
REJECT → no final data

POST /api/review-tasks/:taskId/request-more-info
NEEDS_MORE_INFO → wait for more evidence
```

---

## API route plan

```txt
GET  /api/review-tasks
GET  /api/review-tasks/:taskId

POST /api/review-tasks/:taskId/start
POST /api/review-tasks/:taskId/approve
POST /api/review-tasks/:taskId/edit-and-approve
POST /api/review-tasks/:taskId/reject
POST /api/review-tasks/:taskId/request-more-info
```

---

## Final accepted data rule

```txt
APPROVE_AS_IS
→ final data = ExtractionRun.extractedJson

EDIT_AND_APPROVE
→ final data = ReviewDecision.correctedJson

REJECT
→ no final accepted data

REQUEST_MORE_INFO
→ wait for more evidence
```

Do not add `finalJson` yet. Keep Week 2 simple.

---

## Storage decisions

```txt
Postgres:
- extractedJson
- validationJson
- reasonJson
- correctedJson
- review decisions
- review events

Local storage for now:
- uploaded PDFs

Future object storage:
- S3 / R2 / Supabase Storage / GCS for documents

Redis later:
- queues
- locks
- retries
- temporary workflow state
```

---

## Implementation order

```txt
1. Add Prisma enums and models:
   ReviewTaskStatus
   ReviewPriority
   ReviewDecisionType
   ReviewEventType
   ReviewTask
   ReviewDecision
   ReviewEvent

2. Run migration and generate Prisma client.

3. Create:
   apps/web/lib/review/create-review-task-from-validation.ts

4. Update validation route to create/upsert ReviewTask.

5. Add GET /api/review-tasks.

6. Add GET /api/review-tasks/:taskId.

7. Add review action APIs:
   start
   approve
   edit-and-approve
   reject
   request-more-info
```

---

## Week 2 backend done condition

```txt
1. NEEDS_REVIEW validation creates one ReviewTask.
2. Retrying validation does not create duplicates.
3. Review task list API works.
4. Review task detail API works.
5. Reviewer can start review.
6. Reviewer can approve as-is.
7. Reviewer can edit and approve correctedJson.
8. Reviewer can reject.
9. Reviewer can request more info.
10. Every action creates ReviewDecision and ReviewEvent records.
```

---

## Final summary

```txt
A2I-inspired:
NEEDS_REVIEW run creates a human loop → ReviewTask

Label-Studio-inspired:
Gemini extractedJson is immutable prediction
Human correctedJson is separate annotation

ClaimFlow-specific:
ReviewTask tracks lifecycle
ReviewDecision stores human output
ReviewEvent stores audit trail
```
