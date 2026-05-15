# Review notes

## Scenario

Repair cost is extracted, but currency is missing.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because currency is required when estimatedRepairCost is present.

## Human review

A ReviewTask should be created with status PENDING.

## Reviewer action

Reviewer should confirm the repair estimate currency and correct the extracted JSON.
