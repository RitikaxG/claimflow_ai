# Review notes

## Scenario

The email contains a valid claim, but the loss type cannot be confidently classified.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because incident.lossType is unknown.

## Human review

A ReviewTask should be created with status PENDING.

## Reviewer action

Reviewer should inspect the source email and classify the loss type manually before approval.
