import { CoverageAnswerSchema, type CoverageAnswer } from "@repo/shared/schemas";
import { getGeminiClient, GEMINI_MODEL } from "../client/gemini-client";
import { COVERAGE_ANSWER_RESPONSE_SCHEMA } from "./response-schema";
import { toRawModelOutput } from "../utils/raw-model-output";

export const COVERAGE_ANSWER_PROMPT_VERSION = "coverage_answer_v1";

type CoverageRetrievedChunk = {
    chunkId : string;
    policyDocumentId : string;
    policyTitle : string;
    clauseId : string | null;
    sectionTitle : string | null;
    text : string;
    similarity : number;
    bestIntent? : string; 
};

export type CoverageRetrievalResultForAnswer = {
    retrievalStatus : "ENOUGH_EVIDENCE" | "INSUFFICIENT_EVIDENCE";
    reason : string;
    matches : CoverageRetrievedChunk[];
};

export type GenerateCoverageAnswerInput = {
    question : string;
    claimContext : unknown;
    retrievalResult : CoverageRetrievalResultForAnswer
};

export type GenerateCoverageAnswerResult = {
    model : string;
    promptVersion : string;
    rawModelOutput : unknown;
    answer : CoverageAnswer;
}

function safeJson(value : unknown) : string {
    return JSON.stringify(value,null,2);
};

function formatRetrievedClauses(matches : CoverageRetrievedChunk[]){
    return matches.map((match,index) => {
        return [
            `[${index+1}]`,
            `chunkId: ${match.chunkId}`,
            `policyDocumentId: ${match.policyDocumentId}`,
            `policyTitle: ${match.policyTitle}`,
            `clauseId: ${match.clauseId ?? "UNKNOWN"}`,
            `sectionTitle: ${match.sectionTitle ?? "Untitled section"}`,
            `similarity: ${match.similarity.toFixed(4)}`,
            `bestIntent: ${match.bestIntent ?? "unknown"}`,
            "text:",
            match.text,
        ].join("\n");
    })
    .join("\n\n---\n\n");
};

function buildCoverageAnswerPrompt(input: GenerateCoverageAnswerInput) {
  return `
    You are a policy coverage assistant for ClaimFlow AI.

    You must answer only using the retrieved policy clauses below.
    Do not use outside insurance knowledge.
    If the clauses do not contain enough evidence, return NEEDS_REVIEW.
    Every coverage reason must cite at least one clauseId and chunkId from the retrieved clauses.
    Do not cite a clause or chunk that is not present in the retrieved clauses.
    If required evidence is missing, list it in missingEvidence.

    Decision rules:
    - First classify the user question:
        - If the question asks whether a loss type is covered under the policy in general, answer the policy coverage status.
        - If the question asks whether a specific claim can be approved, answer claim readiness using required evidence and exclusions.

    - Use COVERED for a general policy coverage question when a retrieved coverage clause clearly covers the loss type.
    - Do not downgrade COVERED to PARTIALLY_COVERED only because the clause says coverage is subject to policy terms, deductible, exclusions, or required evidence.
    - Required evidence should be listed in missingEvidence only when the claim context shows that the evidence is missing or the question asks about approval/readiness.

    - Use NOT_COVERED only when retrieved exclusion clauses clearly apply to the question or claim context.

    - Use PARTIALLY_COVERED only when retrieved clauses show that:
        - only part of the claimed loss is covered,
        - a specific policy limit applies to part of the claim,
        - an add-on/endorsement is required but missing,
        - or some claimed items are outside coverage.
    - Do not use PARTIALLY_COVERED for a simple “is this loss type covered?” question when the retrieved coverage clause supports coverage.

    - Use NEEDS_REVIEW when:
        - retrieved clauses are insufficient or contradictory,
        - the question asks whether a specific claim can be approved and required claim evidence is missing,
        - the claim context shows missing required evidence,
        - or a human/insurer review clause applies before final approval.

    - A repair estimate alone is not a denial. If LIMIT-RP-001 says insurer review is required before final approval, return NEEDS_REVIEW, not NOT_COVERED.

    - Every cited quote must be copied from one of the retrieved policy clause texts.
    - When claimJson and validationJson disagree, trust claimJson and the corrected validation fields. Do not infer missing evidence from stale extraction metadata.

    USER QUESTION:
    ${input.question}

    CLAIM CONTEXT:
    ${safeJson(input.claimContext)}

    RETRIEVAL STATUS:
    ${input.retrievalResult.retrievalStatus}

    RETRIEVAL REASON:
    ${input.retrievalResult.reason}

    RETRIEVED POLICY CLAUSES:
    ${formatRetrievedClauses(input.retrievalResult.matches)}

    Return only valid JSON matching the response schema.
    `.trim();
}

export async function generateCoverageAnswer(
    input : GenerateCoverageAnswerInput,
) : Promise<GenerateCoverageAnswerResult> {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
        model : GEMINI_MODEL,
        contents : [
            {
                text: buildCoverageAnswerPrompt(input)
            }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema : COVERAGE_ANSWER_RESPONSE_SCHEMA,
        }
    });

    if(!response.text){
        throw new Error("Gemini returned an empty coverage answer response.");
    }

    const parsed = JSON.parse(response.text);
    const answer = CoverageAnswerSchema.parse(parsed);

    return {
        model : GEMINI_MODEL,
        promptVersion : COVERAGE_ANSWER_PROMPT_VERSION,
        rawModelOutput : toRawModelOutput(response),
        answer,
    }
}