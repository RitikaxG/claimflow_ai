# Review notes

## Scenario

FNOL email has policy number and claim details, but the incident location is missing.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because incident.incidentLocation is required.

## Human review

A ReviewTask should be created with status PENDING.

## Reviewer action

Reviewer should ask the claimant where the incident happened before approving the claim.