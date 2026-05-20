import type { RetrievalStatus } from "@repo/db";

// Tells the system : Why a query exists ?
export type RetrievalIntent = "coverage" | "evidence" | "exclusion" | "limit" | "general";

// One planeed retrieval query
export type RetrievalQueryPlanItem = {
    intent : RetrievalIntent;
    query : string;
    topK : number;
};

// One raw result from vector search. Used before deduplication.
export type RetrievedPolicyChunk = {
    chunkId : string;
    policyDocumentId : string;
    policyTitle : string;
    clauseId : string | null;
    sectionTitle : string | null;
    text : string;
    similarity : number;
    sourceQuery : string;
    sourceIntent : RetrievalIntent;
};

// Represents a chunk after deduplication.
/*
    Same chunk may be retrieved by multiple queries.
    Instead of returning same chunk multiple times, you merge it into one object.
*/
export type MergedRetrievedPolicyChunk = Omit<
RetrievedPolicyChunk,
"sourceQuery" | "sourceIntent"
> & {
    matchedQueries: Array<{
        intent : RetrievalIntent;
        query : string;
        similarity : number;
    }>;
    bestIntent : RetrievalIntent;
};

export type PolicyRetrievalResult = {
    question : string;
    queryPlan : RetrievalQueryPlanItem[];
    matches : MergedRetrievedPolicyChunk[],
    retrievalStatus : RetrievalStatus;
    reason : string;
}