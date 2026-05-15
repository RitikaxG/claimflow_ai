# Review notes

## Scenario

The extracted claim has all required fields, but overallConfidence is below the review threshold.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because overallConfidence is below 0.75.

## Human review

A ReviewTask should be created with status PENDING.

## Reviewer action

Reviewer should inspect the extracted JSON against the source email. If the fields are correct, this can later be approved by a human reviewer.