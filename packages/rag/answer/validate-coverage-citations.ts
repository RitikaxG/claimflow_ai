import { CoverageAnswerSchema, type CitedCoverageClause, type CoverageAnswer } from "@repo/shared/schemas"
import type { MergedRetrievedPolicyChunk, PolicyRetrievalResult } from "../retrieval/retrieval-types";

export type CoverageCitationValidationResult = {
    answer : CoverageAnswer;
    forcedNeedsReview : boolean;
    guardrailReasons : string[];
};

type ValidateCoverageCitationsInput = {
    answer : CoverageAnswer;
    retrievalResult : PolicyRetrievalResult;
};

function normalizeText(value : string){
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function quoteExistsInChunk(input : {
    quote : string;
    chunkText : string;
}){
    const normalizedQuote = normalizeText(input.quote);
    const normalizedChunkText = normalizeText(input.chunkText);

    if(normalizedQuote.length < 8){
        return false;
    }

    return normalizedChunkText.includes(normalizedQuote);
};

function uniqueStrings(values : string[]){
    return Array.from(new Set(values));
}

function hasCoverageIntent(match : MergedRetrievedPolicyChunk){
    if(match.bestIntent === "coverage"){
        return true;
    }
    return match.matchedQueries.some((query) => query.intent === "coverage");
};

function isOnlyExclusionOrEvidenceGap(matches : MergedRetrievedPolicyChunk[]){
    if(matches.length === 0){
        return false;
    }

    return matches.every((match) => {
        const intents = new Set([
            match.bestIntent,
            ...match.matchedQueries.map((query) => query.intent),
        ]);

        const hasCoverage = intents.has("coverage");
        const hasLimit = intents.has("limit");

        if(hasCoverage || hasLimit){
            return false;
        }

        return intents.has("exclusion") || intents.has("evidence");
    });
}

function validateSingleCitation(input : {
    citation : CitedCoverageClause;
    chunksById : Map<string,MergedRetrievedPolicyChunk>
}) : {
    valid : boolean,
    reason? : string,
}{
    const chunk = input.chunksById.get(input.citation.chunkId);

    if(!chunk){
        return {
            valid : false,
            reason : `Citation chunkId ${input.citation.chunkId} was not in retrieved chunks`,
        };
    }

    if(!chunk.clauseId){
        return {
            valid : false,
            reason : `Retrieved chunk ${input.citation.chunkId} does not have a clauseId`
        };
    }

    if(chunk.clauseId !== input.citation.clauseId){
        return {
            valid : false,
            reason : `Citation cluaseId ${input.citation.clauseId} does not match retrived chunk ${input.citation.chunkId}`,
        };
    }

    if(
        !quoteExistsInChunk({
            quote : input.citation.quote,
            chunkText : chunk.text,
        })
    ){
        return {
            valid : false,
            reason : `Citation quote for chunk ${input.citation.chunkId} was not found in the retrived chunk text`,
        }
    }
    return {
        valid : true
    };
}

function forceNeedsReviewAnswer(input : {
    originalAnswer : CoverageAnswer;
    validCitations : CitedCoverageClause[];
    guardrailReasons : string[];
}) : CoverageAnswer {
    const missingEvidence = uniqueStrings([
        ...input.originalAnswer.missingEvidence,
        "Human coverage review required"
    ]);

    return CoverageAnswerSchema.parse({
        decision : "NEEDS_REVIEW",
        answer : "The retrived policy evidence was not strong enough to make a supported coverage decision. A human reviewer should verify the claim against the policy clauses.",
        citedClauses : input.validCitations,
        missingEvidence,
        confidence : Math.min(input.originalAnswer.confidence,0.35),
    });
}

export function validateCoverageCitations(
    input : ValidateCoverageCitationsInput,
): CoverageCitationValidationResult {
    const parsedAnswer = CoverageAnswerSchema.parse(input.answer);
    const guardrailReasons : string[] = [];

    const chunksById = new Map(
        input.retrievalResult.matches.map((match) => [match.chunkId,match])
    );

    const validCitations : CitedCoverageClause[] = [];

    for(const citation of parsedAnswer.citedClauses){
        const result = validateSingleCitation({
            citation,
            chunksById,
        });

        if(result.valid){
            validCitations.push(citation);
        } 
        else if(result.reason){
            guardrailReasons.push(result.reason);
        }
    }

    let shouldForceNeedsReview = false;

    if(input.retrievalResult.retrievalStatus === "INSUFFICIENT_EVIDENCE"){
        shouldForceNeedsReview = true;
        guardrailReasons.push(
            "Retrieval status was INSUFFICIENT_EVIDENCE, so a coverage decision cannot be trusted."
        )
    }

    if(validCitations.length === 0){
        shouldForceNeedsReview = true;
        guardrailReasons.push(
            "Coverage answer did not contain any valid citations to retrieved chunks.",
        )
    }

    if(parsedAnswer.decision === "COVERED"){
        const hasAnyCoverageIntent = input.retrievalResult.matches.some(hasCoverageIntent);

        if(!hasAnyCoverageIntent){
            shouldForceNeedsReview = true;
            guardrailReasons.push(
                "Model returned COVERED but no retrieved chunk came from a coverage-intent query.",
            )
        }

        if(isOnlyExclusionOrEvidenceGap(input.retrievalResult.matches)){
            shouldForceNeedsReview = true;
            guardrailReasons.push(
                "Model returned COVERED but retrieved evidence was only exclusion/evidence-gap oriented.",
            )
        }
    }

    if(shouldForceNeedsReview){
        return {
            answer : forceNeedsReviewAnswer({
                originalAnswer : parsedAnswer,
                validCitations,
                guardrailReasons,
            }),
            forcedNeedsReview : true,
            guardrailReasons,
        }
    }

    return {
        answer : CoverageAnswerSchema.parse({
            ...parsedAnswer,
            citedClauses : validCitations,
        }),
        forcedNeedsReview : false,
        guardrailReasons,
    }
}