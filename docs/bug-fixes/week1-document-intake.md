# Week 1 Bugs + Failure Cases

## 1. Duplicate upload

### Problem

The same PDF/email could create duplicate `Document` rows and duplicate `ExtractionRun` rows.

### Fix

Made upload idempotent using:

```txt
sourceType + contentHash
```

### Why it matters

Prevents duplicate extraction runs, duplicate review items, and wasted Gemini calls.

---

## 2. Filename was not a reliable document identity

### Problem

Different documents can have the same filename, and the same document can be renamed.

### Fix

Used content hash instead of filename.

```txt
PDF → SHA-256(file bytes)
EMAIL_TEXT → SHA-256(normalized email text)
```

### Why it matters

The actual content identifies the document, not the user-provided filename.

---

## 3. Hard delete would destroy workflow history

### Problem

Deleting a document permanently would remove useful extraction, validation, and timeline history.

### Fix

Implemented soft delete.

```txt
Set deletedAt
Set deletedReason
Hide from active dashboard/review queue
Keep Document
Keep ExtractionRun
Keep ExtractionEvent
Keep extractedJson
Keep validationJson
```

### Why it matters

Insurance workflows need traceability and restore capability.

---

## 4. Re-upload after soft delete should not call Gemini again

### Problem

Re-uploading the same soft-deleted document could trigger a new extraction unnecessarily.

### Fix

If the same `sourceType + contentHash` exists with `deletedAt`, restore the document and reuse the latest run.

```txt
same deleted document
→ restore document
→ reuse extractedJson
→ reuse validationJson
→ add DOCUMENT_RESTORED event
```

### Why it matters

Saves Gemini API calls and keeps workflow history clean.

---

## 5. Soft delete event used the wrong id

### Problem

`ExtractionEvent.runId` must use `ExtractionRun.id`, not `Document.id`.

### Fix

Fetched the document with its runs and created events using `run.id`.

### Why it matters

Timeline events must attach to the correct run.

---

## 6. Soft delete needed transaction consistency

### Problem

Document update and event creation could become inconsistent if one succeeded and the other failed.

### Fix

Used a transaction and transaction client:

```txt
tx.document.update
tx.extractionEvent.create
```

### Why it matters

Workflow state and audit events should update atomically.

---

## 7. Restored response was stale

### Problem

Restore initially returned a run object fetched before `deletedAt` was cleared.

### Fix

Refetched latest run after restore and returned:

```txt
restored.document
restored.run
```

### Why it matters

API response reflects the restored state immediately.

---

## 8. Deleted documents still needed to be hidden

### Problem

Soft-deleted documents could still appear in active dashboard/review queries.

### Fix

Filtered active queries by:

```txt
document.deletedAt === null
```

### Why it matters

Deleted records remain recoverable but do not appear in active work queues.
