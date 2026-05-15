# Review notes

## Scenario

The same email text is uploaded twice.

## Expected behavior

The first upload should create a new document and run. The second upload should not create a new active document. It should return duplicate: true and create a DUPLICATE_UPLOAD_DETECTED event on the existing latest run.

## Human review

No review task should be created because the claim itself is clean.

## Test note

The second upload must use the exact same email text content. Do not modify whitespace, packet ID, timestamps, or claim text between first and second upload.
