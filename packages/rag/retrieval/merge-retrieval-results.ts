/*
same chunkId appears from multiple query variants
→ keep one chunk
→ store all matchedQueries
→ similarity = max similarity
→ bestIntent = intent from highest similarity

Sort after dedupe

1. highest similarity first
2. but keep relevant clause categories visible
*/

import type {
  MergedRetrievedPolicyChunk,
  RetrievalIntent,
  RetrievedPolicyChunk,
} from "./retrieval-types";

type MatchedQuery = {
  intent: RetrievalIntent;
  query: string;
  similarity: number;
};

function normalizeQuery(query: string) {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}

function getMatchedQueryKey(match: MatchedQuery) {
  return `${match.intent}:${normalizeQuery(match.query)}`;
}

export function mergeRetrievedChunks(
  chunks: RetrievedPolicyChunk[],
): MergedRetrievedPolicyChunk[] {
  const byChunkId = new Map<string, MergedRetrievedPolicyChunk>();

  for (const chunk of chunks) {
    const similarity = Number(chunk.similarity);

    if (!Number.isFinite(similarity)) {
      continue;
    }

    const matchedQuery: MatchedQuery = {
      intent: chunk.sourceIntent,
      query: chunk.sourceQuery,
      similarity,
    };

    const existing = byChunkId.get(chunk.chunkId);

    if (!existing) {
      byChunkId.set(chunk.chunkId, {
        chunkId: chunk.chunkId,
        policyDocumentId: chunk.policyDocumentId,
        policyTitle: chunk.policyTitle,
        clauseId: chunk.clauseId,
        sectionTitle: chunk.sectionTitle,
        text: chunk.text,
        similarity,
        matchedQueries: [matchedQuery],
        bestIntent: chunk.sourceIntent,
      });

      continue;
    }

    const existingQueryIndex = existing.matchedQueries.findIndex(
      (existingQuery) =>
        getMatchedQueryKey(existingQuery) === getMatchedQueryKey(matchedQuery),
    );

    if (existingQueryIndex >= 0) {
      const existingQuery = existing.matchedQueries[existingQueryIndex];

      if (existingQuery) {
        existing.matchedQueries[existingQueryIndex] = {
          intent: existingQuery.intent,
          query: existingQuery.query,
          similarity: Math.max(existingQuery.similarity, similarity),
        };
      }
    } else {
      existing.matchedQueries.push(matchedQuery);
    }

    if (similarity > existing.similarity) {
      existing.similarity = similarity;
      existing.bestIntent = chunk.sourceIntent;
    }
  }

  return Array.from(byChunkId.values())
    .map((chunk) => ({
      ...chunk,
      matchedQueries: chunk.matchedQueries.sort(
        (first, second) => second.similarity - first.similarity,
      ),
    }))
    .sort((first, second) => {
      if (second.similarity !== first.similarity) {
        return second.similarity - first.similarity; // sorts query matches inside each chunk. Highest similarity query appears first
      }

      return (first.clauseId ?? first.chunkId).localeCompare(
        second.clauseId ?? second.chunkId,
      );
    });
}