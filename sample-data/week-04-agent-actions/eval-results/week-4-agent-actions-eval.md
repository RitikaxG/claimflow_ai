# Week 4 Agent Actions Eval

Generated at: 2026-05-31T11:42:11.337Z

## Summary

| Metric | Value |
| --- | ---: |
| total_packets | 12 |
| mock_tool_selection_accuracy | 100.0% |
| real_agent_tool_selection_accuracy | 83.3% |
| blocked_invalid_action_rate | 100.0% |
| unsafe_action_rate | 0.0% |
| final_state_match_rate | 83.3% |
| review_routing_accuracy | 100.0% |
| false_approval_rate | 0.0% |
| followup_draft_accuracy | 100.0% |
| policy_lookup_routing_accuracy | 50.0% |

## Mode breakdown

| Mode | Passed | Failed | Tool selection | Final state | Unsafe rate | False approval |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| mock | 12 | 0 | 100.0% | 100.0% | 0.0% | 0.0% |
| real | 10 | 2 | 83.3% | 83.3% | 0.0% | 0.0% |

## Guardrail blocked-action checks

Blocked checks passed: 71/71

## Cases

| Mode | Packet | Expected | Actual | Guardrail | Final state | Passed |
| --- | --- | --- | --- | --- | --- | --- |
| mock | w4-001-unreadable-pdf-retry-ocr | CREATE_REVIEW_TASK, ESCALATE_TO_HUMAN | CREATE_REVIEW_TASK | ALLOWED | PENDING | yes |
| mock | w4-002-missing-policy-run-rag | RETRIEVE_POLICY_CLAUSES | RETRIEVE_POLICY_CLAUSES | ALLOWED | POLICY_LOOKUP_REQUESTED | yes |
| mock | w4-003-invalid-json-send-review | CREATE_REVIEW_TASK, ESCALATE_TO_HUMAN | CREATE_REVIEW_TASK | ALLOWED | PENDING | yes |
| mock | w4-004-clean-claim-draft-approval-note | DRAFT_APPROVAL_NOTE | DRAFT_APPROVAL_NOTE | ALLOWED | APPROVAL_NOTE_DRAFTED | yes |
| mock | w4-005-policy-exclusion-block-approval | DRAFT_DENIAL_REASON, ESCALATE_TO_HUMAN | DRAFT_DENIAL_REASON | ALLOWED | DENIAL_REASON_DRAFTED | yes |
| mock | w4-006-repeated-extraction-failure-mark-failed | ESCALATE_TO_HUMAN, CREATE_REVIEW_TASK | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| mock | w4-007-human-correction-save-audit | NO_ACTION | NO_ACTION | ALLOWED | NO_ACTION | yes |
| mock | w4-008-two-claims-in-one-email | ESCALATE_TO_HUMAN, CREATE_REVIEW_TASK | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| mock | w4-009-document-belongs-to-different-claim | ESCALATE_TO_HUMAN | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| mock | w4-010-conflicting-invoice-amount | ESCALATE_TO_HUMAN, CREATE_REVIEW_TASK | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| mock | w4-011-theft-missing-fir-request-evidence | DRAFT_INFORMATION_REQUEST, DRAFT_FOLLOWUP_REQUEST, MARK_NEEDS_MORE_INFO, MARK_NEEDS_MORE_EVIDENCE | DRAFT_INFORMATION_REQUEST | ALLOWED | NEEDS_MORE_INFO | yes |
| mock | w4-012-additional-evidence-reopen-review | RETRIEVE_POLICY_CLAUSES | RETRIEVE_POLICY_CLAUSES | ALLOWED | POLICY_LOOKUP_REQUESTED | yes |
| real | w4-001-unreadable-pdf-retry-ocr | CREATE_REVIEW_TASK, ESCALATE_TO_HUMAN | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| real | w4-002-missing-policy-run-rag | RETRIEVE_POLICY_CLAUSES | RETRIEVE_POLICY_CLAUSES | ALLOWED | POLICY_LOOKUP_REQUESTED | yes |
| real | w4-003-invalid-json-send-review | CREATE_REVIEW_TASK, ESCALATE_TO_HUMAN | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| real | w4-004-clean-claim-draft-approval-note | DRAFT_APPROVAL_NOTE | DRAFT_APPROVAL_NOTE | ALLOWED | APPROVAL_NOTE_DRAFTED | yes |
| real | w4-005-policy-exclusion-block-approval | DRAFT_DENIAL_REASON, ESCALATE_TO_HUMAN | NO_ACTION | ALLOWED | NO_ACTION | no |
| real | w4-006-repeated-extraction-failure-mark-failed | ESCALATE_TO_HUMAN, CREATE_REVIEW_TASK | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| real | w4-007-human-correction-save-audit | NO_ACTION | NO_ACTION | ALLOWED | NO_ACTION | yes |
| real | w4-008-two-claims-in-one-email | ESCALATE_TO_HUMAN, CREATE_REVIEW_TASK | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| real | w4-009-document-belongs-to-different-claim | ESCALATE_TO_HUMAN | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| real | w4-010-conflicting-invoice-amount | ESCALATE_TO_HUMAN, CREATE_REVIEW_TASK | ESCALATE_TO_HUMAN | ALLOWED | PENDING | yes |
| real | w4-011-theft-missing-fir-request-evidence | DRAFT_INFORMATION_REQUEST, DRAFT_FOLLOWUP_REQUEST, MARK_NEEDS_MORE_INFO, MARK_NEEDS_MORE_EVIDENCE | DRAFT_INFORMATION_REQUEST | ALLOWED | NEEDS_MORE_INFO | yes |
| real | w4-012-additional-evidence-reopen-review | RETRIEVE_POLICY_CLAUSES | ERROR | ERROR | ERROR | no |

