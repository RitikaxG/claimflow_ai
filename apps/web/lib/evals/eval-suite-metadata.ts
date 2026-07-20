export const EVAL_SUITES = [
  {
    suite: "WEEK1_EXTRACTION",
    title: "Claim intake and preparation",
    description: "Reliable claim facts, completeness checks, and clear validation outcomes.",
  },
  {
    suite: "WEEK2_REVIEW",
    title: "Human review workflow",
    description: "Reliable review routing, reviewer tasks, and final decision outcomes.",
  },
  {
    suite: "WEEK3_RAG",
    title: "Policy guidance",
    description: "Grounded policy answers, supporting evidence, and safe uncertainty handling.",
  },
  {
    suite: "WEEK4_AGENT",
    title: "Guarded AI assistance",
    description: "Safe next-step guidance, action boundaries, and human approval controls.",
  },
  {
    suite: "WEEK5_MEMORY",
    title: "Similar-claim guidance",
    description: "Relevant past workflow guidance, safety boundaries, and reviewer feedback.",
  },
  {
    suite: "WEEK6_GATEWAY_OBSERVABILITY",
    title: "AI reliability and observability",
    description: "Visible failures, operational limits, and reviewable workflow history.",
  },
] as const;
