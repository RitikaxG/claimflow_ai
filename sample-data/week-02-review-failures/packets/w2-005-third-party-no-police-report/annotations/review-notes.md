# Review notes

## Scenario

Third-party claim is submitted without a police report.

## Expected behavior

Validation should mark the run as NEEDS_REVIEW because third-party claims require or strongly recommend police evidence.

## Human review

A ReviewTask should be created with status PENDING.

## Reviewer action

Reviewer should request a police report or supporting incident documentation before approval.
