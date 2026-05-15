# Review notes

## Scenario

The uploaded document is only a repair estimate. It is not a complete claim form.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because documentType is repair_estimate and claimForm is required evidence.

## Human review

A ReviewTask should be created with status PENDING.

## Reviewer action

Reviewer should request or attach the original claim form before approving the claim.