# Week 2 Review Workflow Eval

## Summary

- Total packets: **15**
- Passed: **15**
- Failed: **0**
- review_routing_accuracy: **100.0%**
- false_approval_rate: **0% if no risky packet was marked COMPLETED**

## Results

### PASS w2-001-missing-policy-number

FNOL email is missing policy number

- w2-001-missing-policy-number: FNOL email is missing policy number
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING
- missingFields: policyNumber

### PASS w2-002-missing-incident-location

FNOL email is missing incident location

- w2-002-missing-incident-location: FNOL email is missing incident location
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING
- missingFields: incident.incidentLocation

### PASS w2-003-low-confidence

Extraction is complete but model confidence is below review threshold

- w2-003-low-confidence: Extraction is complete but model confidence is below review threshold
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING
- warnings: LOW_CONFIDENCE_REVIEW

### PASS w2-004-repair-estimate-only

Uploaded document is only a repair estimate and not a complete claim form

- w2-004-repair-estimate-only: Uploaded document is only a repair estimate and not a complete claim form
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING
- warnings: DOCUMENT_TYPE_REPAIR_ESTIMATE_ONLY

### PASS w2-005-third-party-no-police-report

Third-party claim is submitted without police report

- w2-005-third-party-no-police-report: Third-party claim is submitted without police report
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING
- warnings: THIRD_PARTY_POLICE_REPORT_RECOMMENDED

### PASS w2-006-theft-missing-fir

Theft claim is missing FIR number and police report evidence

- w2-006-theft-missing-fir: Theft claim is missing FIR number and police report evidence
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING
- missingFields: police.firNumber
- warnings: THEFT_POLICE_REPORT_REQUIRED

### PASS w2-007-invalid-repair-cost

Repair cost is zero, which is invalid

- w2-007-invalid-repair-cost: Repair cost is zero, which is invalid
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING

### PASS w2-008-currency-missing

Repair cost is present but currency is missing

- w2-008-currency-missing: Repair cost is present but currency is missing
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING

### PASS w2-009-unknown-loss-type

Loss type cannot be classified from the email

- w2-009-unknown-loss-type: Loss type cannot be classified from the email
- run.status: NEEDS_REVIEW
- reviewTask.status: PENDING

### PASS w2-010-clean-completed

Clean FNOL email with all required fields present

- w2-010-clean-completed: Clean FNOL email with all required fields present
- run.status: COMPLETED
- reviewTask.status: -

### PASS w2-011-duplicate-email

Same email text is uploaded twice and should be detected as duplicate

- w2-011-duplicate-email: Same email text is uploaded twice and should be detected as duplicate
- run.status: COMPLETED
- reviewTask.status: -

### PASS w2-012-unreadable-pdf

Unreadable scanned PDF causes extraction failure

- w2-012-unreadable-pdf: Unreadable scanned PDF causes extraction failure
- run.status: FAILED
- errorMessage: Mock extraction failed: unreadable document for packet w2-012-unreadable-pdf

### PASS w2-013-edit-and-approve

AI misses policy number, human reviewer corrects JSON and approves

- w2-013-edit-and-approve: AI misses policy number, human reviewer corrects JSON and approves
- run.status: NEEDS_REVIEW
- reviewTask.status: EDITED_AND_APPROVED
- missingFields: policyNumber

### PASS w2-014-reject

Suspicious claim is rejected by human reviewer

- w2-014-reject: Suspicious claim is rejected by human reviewer
- run.status: NEEDS_REVIEW
- reviewTask.status: REJECTED
- missingFields: claimantName_or_insuredName

### PASS w2-015-request-more-info

Insufficient evidence requires reviewer to request more information

- w2-015-request-more-info: Insufficient evidence requires reviewer to request more information
- run.status: NEEDS_REVIEW
- reviewTask.status: NEEDS_MORE_INFO
- warnings: THIRD_PARTY_POLICE_REPORT_RECOMMENDED
