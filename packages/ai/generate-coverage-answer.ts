import { CoverageAnswerSchema, type CoverageAnswer } from "@repo/shared/schemas";
import { getGeminiClient, GEMINI_MODEL } from "./gemini-client";
import { COVERAGE_ANSWER_RESPONSE_SCHEMA } from "./coverage-answer-response-schema";

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

function toRawModelOutput(response : {
    text? : string;
    candidates? : unknown;
    usageMetadata? : unknown;
}){
    return {
        text : response.text ?? null,
        candidates : response.candidates ?? null,
        usageMetadata : response.usageMetadata ?? null,
    }
}

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
    - Use COVERED only when retrieved clauses clearly support coverage and required evidence is present.
    - Use NOT_COVERED when retrieved exclusions clearly apply.
    - Use PARTIALLY_COVERED when coverage exists but limits, missing add-ons, or partial evidence affect the decision.
    - Use NEEDS_REVIEW when the retrieved clauses are insufficient, contradictory, or required claim evidence is missing.
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