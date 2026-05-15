# Review notes

## Scenario

Theft claim is submitted without FIR number and without police report evidence.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because theft claims require FIR/police evidence.

## Human review

A ReviewTask should be created with status PENDING.

## Reviewer action

Reviewer should request FIR number and police report before approving the claim.
