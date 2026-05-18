# Week 03 — Policy RAG + Citations Failure Dataset

This dataset tests whether ClaimFlow AI can answer coverage questions using retrieved policy clauses with citations.

## Product behavior

Policy question
→ retrieve relevant policy clause
→ answer with citation
→ refuse or return NEEDS_REVIEW when evidence is missing

## What this dataset tests

- coverage allowed
- coverage excluded
- coverage ambiguous
- missing evidence
- policy clause not found
- multiple possible clauses
- claim requires human review
- unsupported approval prevention

## Dataset rule

Synthetic policy markdown files are the deterministic test corpus.

Public policy PDFs may be used as anchor/reference material, but they are not the source of truth for expected eval answers yet.

## Eval metrics

- retrieval_hit_rate
- citation_present_rate
- citation_support_rate
- unsupported_answer_rate
- coverage_decision_match_rate
- false_approval_rate

## Safety

All claim packets are synthetic. Do not commit real customer claims, private policy documents, real vehicle numbers, real phone numbers, real emails, or API keys.