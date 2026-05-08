# Week 1 — Auto Insurance Document Intake

## What was built

ClaimFlow AI Week 1 built an **Auto Insurance Document Intake Reviewer**.

It accepts:

- PDF claim documents
- Pasted email text

It then runs:

```txt
PDF / Email text
→ Gemini extraction
→ structured claim JSON
→ deterministic validation
→ final status: COMPLETED or NEEDS_REVIEW
→ timeline + validation explanation
```

The goal was to turn messy insurance claim inputs into structured, reviewable product data.

---

## Why this matters

Insurance claims often arrive as incomplete PDFs, repair estimates, police reports, or emails.

The system should not blindly trust AI output. It should:

- extract claim data
- validate required fields
- detect missing information
- detect conflicts
- identify required evidence
- decide whether the claim can proceed or needs review

`NEEDS_REVIEW` is not a failure. It means the system correctly found that human attention is needed.

---

## Demo flow

### Complete claim

```txt
Upload PDF / email
→ Run extraction
→ View extracted JSON
→ Run validation
→ Status becomes COMPLETED
→ Timeline shows upload → extraction → validation → completed
```

### Incomplete claim

```txt
Upload incomplete claim
→ Run extraction
→ Run validation
→ Status becomes NEEDS_REVIEW
→ UI shows missing fields, conflicts, warnings, required evidence
→ Timeline explains why review is needed
```

### Soft delete + restore

```txt
Upload document
→ Extract and validate
→ Soft delete document
→ Document disappears from active dashboard/review queue
→ Re-upload same document
→ Existing document is restored
→ Previous extractedJson and validationJson are reused
```

---

## What was achieved

### 1. Document intake

Supported source types:

- `PDF`
- `EMAIL_TEXT`

PDFs are stored locally during development using `Document.storagePath`.

Email text is saved directly in Postgres using `Document.contentText`.

---

### 2. Structured AI extraction

Gemini extracts auto insurance claim data into structured JSON.

The app stores:

- `rawModelOutput`
- `extractedJson`
- `model`
- `promptVersion`
- `confidenceJson`

---

### 3. Deterministic validation

The extracted JSON is validated with rules for:

- missing fields
- conflicts
- warnings
- required evidence
- low confidence

Validation produces:

```txt
COMPLETED
NEEDS_REVIEW
```

---

### 4. Timeline events

Every important workflow step is stored as an event.

Examples:

```txt
DOCUMENT_UPLOADED
EXTRACTION_STARTED
MODEL_RESPONSE_RECEIVED
EXTRACTION_COMPLETED
VALIDATION_STARTED
VALIDATION_COMPLETED
MISSING_FIELDS_DETECTED
CONFLICTS_DETECTED
RUN_COMPLETED
RUN_NEEDS_REVIEW
RUN_FAILED
DOCUMENT_SOFT_DELETED
DOCUMENT_RESTORED
DUPLICATE_UPLOAD_DETECTED
```

This gives the run an audit-style history.

---

## Week 1 schema design

### Document

Represents the original source input.

Important fields:

```txt
filename
mimeType
sizeBytes
sourceType
storagePath
contentText
contentHash
deletedAt
deletedReason
```

Design decision:

```txt
PDF → local file path
EMAIL_TEXT → stored in Postgres
```

---

### ExtractionRun

Represents one workflow attempt for a document.

Important fields:

```txt
status
model
promptVersion
schemaVersion
rawModelOutput
extractedJson
validationJson
missingFieldsJson
confidenceJson
errorMessage
```

Statuses:

```txt
UPLOADED
EXTRACTING
VALIDATING
COMPLETED
NEEDS_REVIEW
FAILED
```

---

### ExtractionEvent

Represents the timeline of what happened during a run.

It answers:

```txt
What happened?
When did it happen?
Why did the status change?
What metadata explains the event?
```

---

## Key architecture decisions

### 1. AI output is not trusted directly

The app does not stop at:

```txt
PDF → Gemini → JSON
```

It continues with:

```txt
JSON → validation → status decision → timeline
```

This makes the workflow safer and more product-like.

---

### 2. `NEEDS_REVIEW` is a valid workflow state

Incomplete or uncertain claims move to review instead of breaking the app.

This prepares the system for Week 2 human-in-the-loop review.

---

### 3. Soft delete instead of hard delete

Soft delete means:

```txt
Keep the document
Keep extraction runs
Keep extractedJson
Keep validationJson
Keep timeline events
Set deletedAt and deletedReason
Hide from active dashboard/review queue
```

Reason:

Insurance workflows need traceability. Deleted records may still need to be audited or restored.

---

### 4. Restore avoids extra Gemini calls

If a soft-deleted document is uploaded again:

```txt
same sourceType + same contentHash
→ restore existing document
→ return existing latest run
→ reuse extractedJson and validationJson
→ no Gemini call needed
```

This saves API cost and keeps workflow history clean.

---

### 5. Upload is idempotent by `sourceType + contentHash`

Filename is not used as the source of truth.

Behavior:

| Case | Result |
|---|---|
| Same active document uploaded again | Return existing document/run |
| Same soft-deleted document uploaded again | Restore existing document |
| Same filename, different content | Create new document/run |
| Same content, different filename | Return or restore existing document |

Reason:

Filenames are unreliable. Content hash identifies the actual document.

---

## What Week 1 did not build

Week 1 intentionally did not build:

- full human review system
- corrected JSON editor
- reviewer assignment
- multi-reviewer review
- policy RAG
- S3 storage
- background worker queue
- production auth

These are Week 2+ concerns.

---

## Week 2 bridge

Week 2 will turn `NEEDS_REVIEW` into a real human review workflow:

```txt
ExtractionRun.status === NEEDS_REVIEW
→ create ReviewTask
→ reviewer opens task
→ reviewer approves / edits / rejects
→ correctedJson is stored separately
→ ReviewEvent stores audit trail
```

---

## Final Week 1 summary

By the end of Week 1, ClaimFlow AI can:

```txt
Upload PDF or email text
Extract structured auto insurance claim JSON
Validate the extracted JSON
Mark the run COMPLETED or NEEDS_REVIEW
Show missing fields, conflicts, warnings, and required evidence
Store timeline events
Soft delete and restore documents
Avoid duplicate uploads using sourceType + contentHash
Reuse old extraction/validation results on restore
```

This is the foundation for a reliable insurance document workflow where AI assists the process, but validation and review keep the system safe.
