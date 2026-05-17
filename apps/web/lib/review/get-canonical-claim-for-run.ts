type ReviewDecisionForCanonicalClaim = {
    decision : string,
    correctedJson : unknown;
    createdAt : Date | string;
};

type RunForCanonicalClaim = {
    extractedJson : unknown;
    reviewTask? : {
        decisions: ReviewDecisionForCanonicalClaim[]
    } | null;
};

function sortNewestFirst(decisions : ReviewDecisionForCanonicalClaim[]){
    return [...decisions].sort((a,b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

export function getCanonicalClaimForRun(run : RunForCanonicalClaim){
    const decisions = sortNewestFirst(run.reviewTask?.decisions ?? []);

    const latestApprovedDecision = decisions.find((decision) => {
        const isApprovedDecision =
            decision.decision === "APPROVE_AS_IS" ||
            decision.decision === "EDIT_AND_APPROVE";

        return isApprovedDecision && decision.correctedJson;
    })

    if(latestApprovedDecision){
        return latestApprovedDecision.correctedJson;
    }

    return run.extractedJson;
}

export function getCanonicalClaimWithSourceForRun(run : RunForCanonicalClaim){
    const decisions = sortNewestFirst(run.reviewTask?.decisions ?? []);

    const latestApprovedDecision = decisions.find((decision) => {
        const isApprovedDecision =
        decision.decision === "APPROVE_AS_IS" ||
        decision.decision === "EDIT_AND_APPROVE";

        return isApprovedDecision && decision.correctedJson;
    });

    if (latestApprovedDecision) {
        return {
            claim: latestApprovedDecision.correctedJson,
            source: "HUMAN_REVIEW_DECISION" as const,
            decision: latestApprovedDecision.decision,
        };
    }

    return {
        claim: run.extractedJson,
        source: "AI_EXTRACTION_RUN" as const,
        decision: null,
    };
}