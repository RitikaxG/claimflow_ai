# Review notes

## Scenario

FNOL email is missing the policy number.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because policyNumber is a required field.

## Human review

A ReviewTask should be created with status PENDING and priority NORMAL.

## Reviewer action

Reviewer should not approve this claim as-is. The reviewer should ask the claimant or internal policy system for the missing policy number.