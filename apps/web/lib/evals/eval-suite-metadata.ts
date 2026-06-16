export const EVAL_SUITES = [
  {
    suite: "WEEK1_EXTRACTION",
    title: "Week 1 Extraction",
    description: "Structured claim extraction and validation failures.",
  },
  {
    suite: "WEEK2_REVIEW",
    title: "Week 2 Review Workflow",
    description: "Human review routing, review task creation, and reviewer decisions.",
  },
  {
    suite: "WEEK3_RAG",
    title: "Week 3 Policy RAG",
    description: "Policy retrieval, citation support, refusal, and false approval checks.",
  },
  {
    suite: "WEEK4_AGENT",
    title: "Week 4 Agent Actions",
    description: "Agent tool routing, guardrails, unsafe action blocking, and post-actions.",
  },
  {
    suite: "WEEK5_MEMORY",
    title: "Week 5 Workflow Memory",
    description: "Memory write, retrieval, safety, update, and semantic pattern checks.",
  },
  {
    suite: "WEEK6_GATEWAY_OBSERVABILITY",
    title: "Week 6 Gateway Observability",
    description: "AI gateway failures, cost, latency, trace, model, and prompt governance.",
  },
] as const;