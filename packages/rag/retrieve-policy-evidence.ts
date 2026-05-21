import { buildRetrievalQueryPlan } from "./build-retrieval-query-plan";
import { evaluateRetrievalStatus } from "./evaluate-retrieval-status";
import { mergeRetrievedChunks } from "./merge-retrieval-results";
import type { PolicyRetrievalResult } from "./retrieval-types";
import { retrievePolicyChunks } from "./retrieve-policy-chunks";

const DEFAULT_TOP_K_FINAL = 8;

/*
High Level Retrieval Orchestrator

-> build query plan
-> run vector search for every planned query
-> merge duplicate chunks
-> keep final top K
-> evaluate threshold
-> return clean retrieval result

*/

export async function retrievePolicyEvidence(input : {
    question : string;
    claimContext? : unknown;
    topKFinal? : number;
}) : Promise<PolicyRetrievalResult>{
    
    const queryPlan = buildRetrievalQueryPlan(input);

    const retrievalBatches = await Promise.all(
        queryPlan.map((item) => 
            retrievePolicyChunks({
                query : item.query,
                intent : item.intent,
                topK : item.topK
            }),
        )
    );

    const merged = mergeRetrievedChunks(retrievalBatches.flat());

    const finalMatches = merged.slice(0,input.topKFinal ?? DEFAULT_TOP_K_FINAL);

    const status = evaluateRetrievalStatus(finalMatches);

    return {
        question : input.question,
        queryPlan,
        matches : finalMatches,
        retrievalStatus : status.retrievalStatus,
        reason : status.reason,
    }
} 