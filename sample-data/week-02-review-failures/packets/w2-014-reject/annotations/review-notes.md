# Review notes

## Scenario

The claim is missing both claimantName and insuredName and looks suspicious.

## Expected behavior

Validation should create a ReviewTask because claimantName_or_insuredName is missing.

## Human review

Reviewer should start the task and reject it with notes.

## Expected decision notes

Suspicious claimant details. Claimant and insured identity are missing, and the sender did not provide supporting evidence.
