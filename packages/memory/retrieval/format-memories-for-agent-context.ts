import type { RelevantMemory } from "../types";

function truncateWords(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return value.trim();
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

export function formatRelevantMemoryForAgent(memory: RelevantMemory) {
  return {
    memoryId: memory.memoryId,
    kind: memory.kind,
    riskLevel: memory.riskLevel,
    confidence: memory.confidence,
    score: memory.score,
    summary: truncateWords(memory.summary, 35),
    safeUse: truncateWords(memory.safeUse, 35),
    mustNotDo: memory.mustNotDo.slice(0, 5),
    matchedOn: memory.matchedOn,
  };
}

export function formatMemoriesForAgentContext(
  memories: RelevantMemory[],
): string {
  if (memories.length === 0) {
    return "No relevant workflow memories were retrieved.";
  }

  return memories
    .slice(0, 5)
    .map((memory, index) => {
      return [
        `Memory ${index + 1}:`,
        `Type: ${memory.kind}`,
        `Risk: ${memory.riskLevel}`,
        `Score: ${memory.score}`,
        `Summary: ${truncateWords(memory.summary, 40)}`,
        `Safe use: ${truncateWords(memory.safeUse, 40)}`,
        `Must not do: ${memory.mustNotDo.join("; ")}`,
        `Matched on: ${memory.matchedOn
          .map((item) => item.type)
          .join(", ")}`,
      ].join("\n");
    })
    .join("\n\n");
}