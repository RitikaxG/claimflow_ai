# Review notes

## Scenario

The extracted claim has estimatedRepairCost set to 0.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because repair cost must be greater than 0.

## Human review

A ReviewTask should be created with status PENDING.

## Reviewer action

Reviewer should verify the repair estimate and correct the repair cost before approval.
