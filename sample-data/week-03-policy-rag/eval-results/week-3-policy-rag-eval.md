# Week 3 Policy RAG Eval

Generated at: 2026-05-25T11:23:10.240Z

## Summary

| Metric | Value |
| --- | --- |
| Total cases | 1 |
| Passed | 1 |
| Failed | 0 |
| Retrieval hit rate | 100.0% |
| Decision match rate | 100.0% |
| Citation present rate | 100.0% |
| Citation support rate | 100.0% |
| Unsupported refusal rate | 100.0% |
| False approval rate | 0.0% |

## Cases

### ✅ W3-COV-006

Question: Is accidental own damage covered under this policy?

Packet: none

Expected decision: `COVERED`

Actual decision: `COVERED`

Expected clauses: ["COV-OD-001","EV-OD-001"]

Retrieved clauses: ["COV-OD-001","COV-TP-001","EV-FLD-001","EV-OD-001","EV-TH-001","EX-WEAR-001"]

Retrieval status: `ENOUGH_EVIDENCE`

Top similarity: 0.8373

Citation count: 1

Forced NEEDS_REVIEW: no

