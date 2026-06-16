export const EVAL_SUITE_DETAILS: Record<
  string,
  {
    evaluated: string;
    passBasis: string;
    whyItMatters: string;
  }
> = {
  WEEK1_EXTRACTION: {
    evaluated:
      "Synthetic claim documents are compared against expected extracted JSON and validation output.",
    passBasis:
      "Fields, required evidence, missing fields, conflicts, warnings, and final validation status must match expected results.",
    whyItMatters:
      "This proves the intake layer produces reliable structured claim data before review or agent steps begin.",
  },
  WEEK2_REVIEW: {
    evaluated:
      "Review workflow packets are uploaded, extracted, validated, routed to review, and optionally acted on by a reviewer.",
    passBasis:
      "Run status, review task creation, review priority, review events, and reviewer decision outcomes must match expected workflow behavior.",
    whyItMatters:
      "This proves risky or incomplete claims are routed to humans instead of being silently completed.",
  },
  WEEK3_RAG: {
    evaluated:
      "Coverage questions are answered using retrieved policy clauses and citation validation.",
    passBasis:
      "Expected clauses must be retrieved, coverage decision must match, citations must be present and supported, and unsupported cases must refuse or route to review.",
    whyItMatters:
      "This proves policy answers are grounded in retrieved evidence instead of unsupported model guesses.",
  },
  WEEK4_AGENT: {
    evaluated:
      "Agent action packets test which workflow tool the agent chooses for each claim state.",
    passBasis:
      "The chosen action, guardrail decision, final simulated workflow status, post-actions, and unsafe-action blocking must match expectations.",
    whyItMatters:
      "This proves the agent does not act freely. It routes work through allowed tools and guardrails.",
  },
  WEEK5_MEMORY: {
    evaluated:
      "Workflow memory packets test memory writing, retrieval, safe use, feedback updates, conflicts, and pattern creation.",
    passBasis:
      "Expected memories must be created or retrieved, unsafe memory use must be blocked, and memory updates must match expected state changes.",
    whyItMatters:
      "This proves memory helps the workflow without replacing current document or policy evidence.",
  },
  WEEK6_GATEWAY_OBSERVABILITY: {
    evaluated:
      "Synthetic gateway cases test model timeout, invalid JSON, provider error, cost limit, latency spike, trace generation, and version governance.",
    passBasis:
      "Gateway status, failure type, retryability, trace ID, prompt version, model version, latency, cost, and dashboard visibility must match expected output.",
    whyItMatters:
      "This proves AI calls are observable, governed, and production-debuggable.",
  },
};