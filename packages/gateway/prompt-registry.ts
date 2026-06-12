export const PROMPT_REGISTRY = {
  extraction: {
    kind: "EXTRACTION",
    promptVersion: "claim_extraction_v1",
    schemaVersion: "auto_claim_v1",
  },
  coverageAnswer: {
    kind: "RAG_ANSWER",
    promptVersion: "coverage_answer_v1",
    schemaVersion: "coverage_answer_v1",
  },
  agentPlanner: {
    kind: "AGENT_PLANNER",
    promptVersion: "claimflow_agent_v1",
    schemaVersion: "agent_action_v1",
  },
  syntheticGatewayTest: {
    kind: "SYNTHETIC_GATEWAY_TEST",
    promptVersion: "synthetic_gateway_test_v1",
    schemaVersion: "gateway_log_v1",
  },
} as const;