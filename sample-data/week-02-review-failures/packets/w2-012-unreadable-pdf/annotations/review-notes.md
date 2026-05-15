# Review notes

## Scenario

Unreadable scanned PDF causes extraction failure.

## Expected behavior

The extraction step should fail and mark the run as FAILED.

## Human review

No ReviewTask should be created because validation never runs. This is an extraction failure, not a validation review case.

## Test note

The mock extraction behavior should throw an error containing the word "unreadable".
