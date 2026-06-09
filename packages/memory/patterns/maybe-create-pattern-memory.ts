import {
  findRepeatedMemoryPatterns,
  type FindRepeatedMemoryPatternsInput,
} from "./find-repeated-memory-patterns";
import {
  consolidatePatternMemory,
  type ConsolidatePatternMemoryResult,
} from "./consolidate-pattern-memory";

export type MaybeCreatePatternMemoryInput = FindRepeatedMemoryPatternsInput & {
  limit?: number;
};

export type MaybeCreatePatternMemoryResult = {
  candidatesFound: number;
  patternsCreated: number;
  patternsStrengthened: number;
  results: ConsolidatePatternMemoryResult[];
};

export async function maybeCreatePatternMemory(
  input: MaybeCreatePatternMemoryInput = {},
): Promise<MaybeCreatePatternMemoryResult> {
  const candidates = await findRepeatedMemoryPatterns(input);
  const limitedCandidates = candidates.slice(0, input.limit ?? 10);

  const results: ConsolidatePatternMemoryResult[] = [];

  for (const candidate of limitedCandidates) {
    const result = await consolidatePatternMemory(candidate);
    results.push(result);
  }

  return {
    candidatesFound: candidates.length,
    patternsCreated: results.filter((result) => result.created).length,
    patternsStrengthened: results.filter((result) => !result.created).length,
    results,
  };
}