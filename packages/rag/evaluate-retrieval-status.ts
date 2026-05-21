import type { RetrievalStatus } from "@repo/db";
import type { MergedRetrievedPolicyChunk } from "./retrieval-types";

export const MIN_SIMILARITY = 0.65;
export const MIN_MATCHES = 1;

export type RetrievalStatusEvaluation = {
    retrievalStatus : RetrievalStatus;
    reason : string;
};

export function evaluateRetrievalStatus(
    matches : MergedRetrievedPolicyChunk[],
): RetrievalStatusEvaluation {
    if(matches.length < MIN_MATCHES){
        return {
            retrievalStatus : "INSUFFICIENT_EVIDENCE",
            reason : "No policy chunks were retrieved",
        }
    }

    const topMatch = matches[0];
    const topSimilarity = topMatch?.similarity ?? 0;

    if(topSimilarity < MIN_SIMILARITY){
        return {
            retrievalStatus : "INSUFFICIENT_EVIDENCE",
            reason : `Top similarity ${topSimilarity.toFixed(4)} is below threshold ${MIN_SIMILARITY}`,
        }
    }

    return {
        retrievalStatus : "ENOUGH_EVIDENCE",
        reason : "At least one retrieved policy chunk is above the similarity threshold.",
    }
}