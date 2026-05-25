# Week 3 Policy RAG Eval

Generated at: 2026-05-25T06:37:44.068Z

## Summary

| Metric | Value |
| --- | --- |
| Total cases | 12 |
| Passed | 5 |
| Failed | 7 |
| Retrieval hit rate | 66.7% |
| Decision match rate | 58.3% |
| Citation present rate | 66.7% |
| Citation support rate | 66.7% |
| Unsupported refusal rate | 100.0% |
| False approval rate | 0.0% |

## Cases

### ✅ W3-COV-001

Question: Is this theft claim ready for approval if the FIR number is missing?

Packet: w3-001-theft-missing-fir-policy-question

Expected decision: `NEEDS_REVIEW`

Actual decision: `NEEDS_REVIEW`

Expected clauses: ["COV-TH-001","EV-TH-001"]

Retrieved clauses: ["COV-OD-001","COV-TH-001","EV-OD-001","EV-TH-001","EV-TP-001","LIMIT-RP-001"]

Retrieval status: `ENOUGH_EVIDENCE`

Top similarity: 0.8369

Citation count: 2

Forced NEEDS_REVIEW: no

### ✅ W3-COV-002

Question: Can this third-party claim be approved without police report evidence?

Packet: w3-002-third-party-police-report-question

Expected decision: `NEEDS_REVIEW`

Actual decision: `NEEDS_REVIEW`

Expected clauses: ["COV-TP-001","EV-TP-001"]

Retrieved clauses: ["COV-OD-001","COV-TH-001","COV-TP-001","EV-FLD-001","EV-OD-001","EV-TH-001","EV-TP-001"]

Retrieval status: `ENOUGH_EVIDENCE`

Top similarity: 0.8369

Citation count: 2

Forced NEEDS_REVIEW: no

### ❌ W3-COV-003

Question: Can this high repair estimate be approved directly?

Packet: w3-003-repair-estimate-coverage-limit

Expected decision: `NEEDS_REVIEW`

Actual decision: `NOT_COVERED`

Expected clauses: ["LIMIT-RP-001","EV-OD-001"]

Retrieved clauses: ["COV-OD-001","COV-TH-001","COV-TP-001","EV-FLD-001","EV-OD-001","EV-TH-001","EV-TP-001","LIMIT-RP-001"]

Retrieval status: `ENOUGH_EVIDENCE`

Top similarity: 0.8373

Citation count: 1

Forced NEEDS_REVIEW: no

Blockers:

- Decision mismatch. Expected NEEDS_REVIEW, got NOT_COVERED.

### ✅ W3-COV-004

Question: Does the policy cover damage if the private vehicle was used for commercial delivery?

Packet: w3-004-excluded-commercial-use

Expected decision: `NOT_COVERED`

Actual decision: `NOT_COVERED`

Expected clauses: ["EX-COM-001"]

Retrieved clauses: ["COV-OD-001","COV-TH-001","EV-OD-001","EV-TH-001","EX-ALC-001","EX-COM-001","EX-LIC-001","EX-WEAR-001"]

Retrieval status: `ENOUGH_EVIDENCE`

Top similarity: 0.8408

Citation count: 1

Forced NEEDS_REVIEW: no

### ❌ W3-COV-005

Question: Is this flood damage claim covered?

Packet: w3-005-ambiguous-flood-damage

Expected decision: `NEEDS_REVIEW`

Actual decision: `NEEDS_REVIEW`

Expected clauses: ["COV-OD-001","EV-FLD-001"]

Retrieved clauses: ["COV-OD-001","COV-TH-001","EV-FLD-001","EV-TH-001","EX-ALC-001","EX-COM-001","EX-LIC-001","EX-WEAR-001"]

Retrieval status: `ENOUGH_EVIDENCE`

Top similarity: 0.8369

Citation count: 2

Forced NEEDS_REVIEW: no

Blockers:

- Answer did not mention required missing evidence terms: ["inspection evidence"].

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

### ❌ W3-COV-007

Question: Is theft covered when police evidence is submitted?

Packet: none

Expected decision: `COVERED`

Actual decision: `PARTIALLY_COVERED`

Expected clauses: ["COV-TH-001","EV-TH-001"]

Retrieved clauses: ["COV-OD-001","COV-TH-001","EV-OD-001","EV-TH-001","EV-TP-001"]

Retrieval status: `ENOUGH_EVIDENCE`

Top similarity: 0.8369

Citation count: 2

Forced NEEDS_REVIEW: no

Blockers:

- Decision mismatch. Expected COVERED, got PARTIALLY_COVERED.

### ❌ W3-COV-008

Question: Is the claim covered if the driver had no valid license?

Packet: none

Expected decision: `NOT_COVERED`

Actual decision: `NEEDS_REVIEW`

Expected clauses: ["EX-LIC-001"]

Retrieved clauses: []

Retrieval status: `INSUFFICIENT_EVIDENCE`

Top similarity: null

Citation count: 0

Forced NEEDS_REVIEW: yes

Guardrail reasons:

- {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash\nPlease retry in 19.586814623s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-flash"},"quotaValue":"5"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"19s"}]}}

Blockers:

- Eval execution failed: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash\nPlease retry in 19.586814623s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-flash"},"quotaValue":"5"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"19s"}]}}

### ❌ W3-COV-009

Question: Is the claim covered if the driver was intoxicated?

Packet: none

Expected decision: `NOT_COVERED`

Actual decision: `NEEDS_REVIEW`

Expected clauses: ["EX-ALC-001"]

Retrieved clauses: []

Retrieval status: `INSUFFICIENT_EVIDENCE`

Top similarity: null

Citation count: 0

Forced NEEDS_REVIEW: yes

Guardrail reasons:

- {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash\nPlease retry in 18.57054242s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-flash"},"quotaValue":"5"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"18s"}]}}

Blockers:

- Eval execution failed: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash\nPlease retry in 18.57054242s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-flash"},"quotaValue":"5"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"18s"}]}}

### ❌ W3-COV-010

Question: Does the policy cover normal wear and tear?

Packet: none

Expected decision: `NOT_COVERED`

Actual decision: `NEEDS_REVIEW`

Expected clauses: ["EX-WEAR-001"]

Retrieved clauses: []

Retrieval status: `INSUFFICIENT_EVIDENCE`

Top similarity: null

Citation count: 0

Forced NEEDS_REVIEW: yes

Guardrail reasons:

- {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash\nPlease retry in 17.601538089s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"model":"gemini-2.5-flash","location":"global"},"quotaValue":"5"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"17s"}]}}

Blockers:

- Eval execution failed: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash\nPlease retry in 17.601538089s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"model":"gemini-2.5-flash","location":"global"},"quotaValue":"5"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"17s"}]}}

### ✅ W3-COV-011

Question: Does this auto policy cover mobile phone screen damage?

Packet: none

Expected decision: `NEEDS_REVIEW`

Actual decision: `NEEDS_REVIEW`

Expected clauses: []

Retrieved clauses: ["COV-OD-001","EX-ALC-001","EX-COM-001","EX-WEAR-001"]

Retrieval status: `INSUFFICIENT_EVIDENCE`

Top similarity: 0.7054

Citation count: 0

Forced NEEDS_REVIEW: yes

Guardrail reasons:

- Retrieval returned INSUFFICIENT_EVIDENCE, so generation was skipped.
- Only a general retrieval query was generated and top similarity 0.7054 is below stricter general-only threshold 0.8.

### ❌ W3-COV-012

Question: Can the claim be approved using only a repair estimate?

Packet: none

Expected decision: `NEEDS_REVIEW`

Actual decision: `NEEDS_REVIEW`

Expected clauses: ["LIMIT-RP-001","EV-OD-001"]

Retrieved clauses: []

Retrieval status: `INSUFFICIENT_EVIDENCE`

Top similarity: null

Citation count: 0

Forced NEEDS_REVIEW: yes

Guardrail reasons:

- {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash\nPlease retry in 16.256637503s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-flash"},"quotaValue":"5"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"16s"}]}}

Blockers:

- Eval execution failed: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-2.5-flash\nPlease retry in 16.256637503s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-flash"},"quotaValue":"5"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"16s"}]}}

