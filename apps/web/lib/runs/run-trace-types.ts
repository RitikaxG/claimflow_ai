export type RunTraceSource =
  | "document"
  | "extraction"
  | "gateway"
  | "rag"
  | "agent"
  | "memory"
  | "review"
  | "followup";

export type RunTraceTimelineItem = {
  id: string;
  timestamp: string;
  source: RunTraceSource;
  title: string;
  description: string;
  status: string | null;
  metadata: unknown | null;
};

export type GatewayCallTraceRecord = {
  id: string;
  traceId: string;
  kind: string;
  status: string;
  provider: string;
  model: string;
  modelVersion: string | null;
  promptVersion: string | null;
  schemaVersion: string | null;
  errorType: string | null;
  errorMessage: string | null;
  retryable: boolean;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  createdAt: string;
};

export type AgentActionTraceRecord = {
  id: string;
  action: string;
  status: string;
  rationale: string | null;
  guardrailDecision: string | null;
  blockedReason: string | null;
  toolName: string | null;
  toolInputJson: unknown | null;
  toolOutputJson: unknown | null;
  memoryHitCount: number;
  createdAt: string;
};

export type MemoryHitTraceRecord = {
  id: string;
  memoryId: string;
  kind: string;
  riskLevel: string;
  status: string;
  confidence: number;
  summary: string;
  safeUse: string;
  mustNotDo: string[];
  score: number;
  matchedOn: unknown;
  retrievalReason: string | null;
  usedByAgent: boolean;
  agentActionLogId: string | null;
  agentAction: string | null;
  createdAt: string;
};

export type RunTraceResponse = {
  run: {
    id: string;
    status: string;
    model: string | null;
    promptVersion: string | null;
    schemaVersion: string;
    errorMessage: string | null;
    createdAt: string;
    updatedAt: string;
  };
  document: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sourceType: string;
    contentHash: string | null;
    createdAt: string;
  };
  traceId: string | null;
  summary: {
    totalAiCalls: number;
    failedAiCalls: number;
    retryableFailures: number;
    totalAgentActions: number;
    blockedAgentActions: number;
    totalMemoryHits: number;
    usedMemoryHits: number;
    totalCostUsd: number;
    totalLatencyMs: number;
    reviewStatus: string | null;
    finalRunStatus: string;
  };
  gatewayCalls: GatewayCallTraceRecord[];
  agentActions: AgentActionTraceRecord[];
  memoryHits: MemoryHitTraceRecord[];
  timeline: RunTraceTimelineItem[];
};