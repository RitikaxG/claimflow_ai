# Week 2 Ship Log — Human Review System

## Summary

Week 2 upgraded ClaimFlow AI from simple validation status handling to a real human-in-the-loop review workflow.

Week 1 flow:

```txt
PDF / Email text
→ AI extraction
→ validation
→ COMPLETED or NEEDS_REVIEW
```

Week 2 flow:

```txt
PDF / Email text
→ AI extraction
→ validation
→ NEEDS_REVIEW
→ ReviewTask created
→ human starts review
→ approve / edit & approve / reject / request more info
→ ReviewDecision + ReviewEvent stored
```

Demo: https://x.com/RitikaxG/status/2054898032509108266?s=20

---

## What shipped

### 1. Real review task creation

When validation returns `NEEDS_REVIEW`, the backend now creates a `ReviewTask`.

```txt
ExtractionRun.status = NEEDS_REVIEW
ReviewTask.status = PENDING
ReviewTask.priority = NORMAL
ReviewTask.reasonJson = validation reasons
ReviewEvent.type = REVIEW_TASK_CREATED
```

This means AI validation no longer only flags a run. It opens real work for a human reviewer.

---

### 2. Review task APIs

Implemented review task backend APIs:

```txt
GET /api/review-tasks
GET /api/review-tasks/[taskId]
POST /api/review-tasks/[taskId]/start
POST /api/review-tasks/[taskId]/approve
POST /api/review-tasks/[taskId]/edit-and-approve
POST /api/review-tasks/[taskId]/reject
POST /api/review-tasks/[taskId]/request-more-info
```

The APIs return review task details with:

```txt
run
document
extraction events
review events
review decisions
```

---

### 3. Review state machine

Supported transitions:

```txt
PENDING → IN_REVIEW
IN_REVIEW → APPROVED
IN_REVIEW → EDITED_AND_APPROVED
IN_REVIEW → REJECTED
IN_REVIEW → NEEDS_MORE_INFO
```

Invalid transitions return `409`. This prevents unsafe actions like approving a task that was already rejected.

---

### 4. Human review audit trail

Every human action creates a `ReviewEvent`.

Examples:

```txt
REVIEW_STARTED
REVIEW_APPROVED_AS_IS
REVIEW_EDITED_AND_APPROVED
REVIEW_REJECTED
REVIEW_MORE_INFO_REQUESTED
```

Final actions also create a `ReviewDecision`.

This separates:

```txt
task state
human decision
human timeline
```

---

### 5. Edit and approve workflow

Implemented the main Week 2 goal: corrected JSON review.

The reviewer can edit extracted JSON and submit it for approval.

Backend flow:

```txt
correctedJson
→ schema validation
→ deterministic rule validation
→ normalize missingEvidence
→ block approval if still incomplete
→ save correctedJson
→ save correctedValidationJson
→ mark ReviewTask as EDITED_AND_APPROVED
```

Approval is blocked if required fields or evidence are still missing.

---

### 6. Original AI output stays unchanged

The system does not overwrite original AI output.

Immutable AI fields:

```txt
ExtractionRun.extractedJson
ExtractionRun.validationJson
```

Human-corrected fields:

```txt
ReviewDecision.correctedJson
ReviewDecision.correctedValidationJson
```

This keeps a clean audit trail:

```txt
AI output
→ human correction
→ final decision
```

---

### 7. Frontend review flow

The UI now supports:

```txt
review queue
review task detail
start review
view review reasons
edit extracted JSON
approve as-is
edit and approve
reject with notes
request more info with notes
view corrected JSON after approval
view corrected validation after approval
```

---

### 8. Review workflow failure dataset

Added a controlled Week 2 dataset:

```txt
sample-data/week-02-review-failures/
```

The dataset contains 15 synthetic review packets covering:

```txt
missing required fields
low confidence extraction
repair-estimate-only uploads
third-party claims without police report
missing FIR for theft claims
invalid repair cost
missing currency
unknown loss type
clean completed claim
duplicate email upload
unreadable PDF failure
edit-and-approve decision
reject decision
request-more-info decision
```

Each packet stores source input, gold extraction/validation expectations, workflow expectations, and review notes.

---

### 9. Week 2 review workflow eval

Added a repeatable Week 2 eval:

```txt
bun run eval:week2:review
```

The eval executes the workflow against the synthetic packets:

```txt
upload packet
→ extract
→ validate
→ assert run state
→ assert review task state
→ run reviewer action when required
→ assert ReviewDecision
→ assert ReviewEvent
→ write eval report
```

Eval report files:

```txt
sample-data/week-02-review-failures/eval-results/week-2-review-workflow-eval.md
sample-data/week-02-review-failures/eval-results/week-2-review-workflow-eval.json
```

Current result:

```txt
Total packets: 15
Passed: 15
Failed: 0
review_routing_accuracy: 100.0%
false_approval_rate: 0% when no risky packet was marked COMPLETED
```

---

## What this proves

Week 2 proves that ClaimFlow AI can handle bad or incomplete AI output safely.

```txt
Bad AI output
→ does not break the app
→ moves to human review
→ can be corrected
→ is validated again
→ final decision is stored
→ original AI output remains auditable
```

The eval now proves this beyond the UI demo:

```txt
15 controlled failure/review packets
→ 15 passed workflow assertions
→ no unsafe review routing failures
```

---

## Week 2 result

By the end of Week 2, ClaimFlow AI has a working human review system:

```txt
NEEDS_REVIEW validation
→ ReviewTask
→ reviewer action
→ ReviewDecision
→ ReviewEvent timeline
→ corrected JSON stored separately
```

Week 2 is complete and has evaluation evidence.
