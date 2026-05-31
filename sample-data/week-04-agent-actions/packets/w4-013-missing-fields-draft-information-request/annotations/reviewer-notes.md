# Missing fields information request

This packet tests the newer generalized `DRAFT_INFORMATION_REQUEST` tool.

The claim is not missing a document. It is missing extracted field values:

- policyNumber
- incidentDate

The correct behavior is:

1. Draft an information request.
2. Deterministically mark the review as needing more information.
3. Do not retrieve policy clauses yet.
4. Do not draft approval or denial notes.