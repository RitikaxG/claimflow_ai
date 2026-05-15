# Review notes

## Scenario

AI extraction misses policyNumber even though the source email contains it.

## Expected behavior

Validation should create a ReviewTask because policyNumber is missing from extractedJson.

## Human review

Reviewer should start the task, correct policyNumber to POL-W2-013, and use Edit & approve.

## Expected decision

ReviewDecision should be EDIT_AND_APPROVE. correctedJson and correctedValidationJson should be stored.
