import { generateCoverageAnswer } from "@repo/ai";
import { Prisma, prisma, ReviewDecisionType, ReviewTaskStatus } from "@repo/db";
import { retrievePolicyEvidence, validateCoverageCitations } from "@repo/rag";
import type { CoverageAnswer } from "@repo/shared/schemas";
import { NextResponse } from "next/server";


export const runtime = "nodejs";

type Params = {
    params : Promise<{
        runId : string
    }>;
}

type CoverageAnswerRequestBody = {
    question? : unknown;
}

function toPrismaJson(value : unknown) : Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getErrorMessage(error : unknown){
    if(error instanceof Error){
        return error.message;
    }

    return "Unknown coverage answer error."
};

function isPlainObject(value : unknown) : value is Record<string,unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeCoverageQuestion(question: string) {
  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCoverageAnswerJson(value: unknown): value is {
  decision: string;
  answer: string;
  citedClauses: unknown[];
  missingEvidence: unknown[];
  confidence: number;
  generation?: unknown;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.decision === "string" &&
    typeof record.answer === "string" &&
    Array.isArray(record.citedClauses) &&
    Array.isArray(record.missingEvidence) &&
    typeof record.confidence === "number"
  );
}

function isRetrievalJson(value: unknown): value is {
  reason?: unknown;
  queryPlan?: unknown;
  matches?: unknown;
  guardrailReasons?: unknown;
  forcedNeedsReview?: unknown;
} {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequestBody(body : unknown): {
    question : string
}{
    if(!isPlainObject(body)){
        throw new Error("Request body must be a JSON object.");
    }

    const typedBody = body as CoverageAnswerRequestBody;

    if(typeof typedBody.question !== "string"){
        throw new Error("question must be a string.")
    }

    const question = typedBody.question.trim();

    if(question.length < 5){
        throw new Error("question must be atleast 5 characters");
    }

    if(question.length > 1000){
        throw new Error("question must be atmost 1000 characters");
    }

    return {
        question
    };
}

function buildInsufficientEvidenceAnswer(reason : string) : CoverageAnswer {
    return {
        decision : "NEEDS_REVIEW",
        answer : 
            "The retrieved policy evidence was not strong enough to make a supported coverage decision. A human reviewer should verify the claim against the policy clauses.",
        citedClauses : [],
        missingEvidence : [reason,"Human coverage review required"],
        confidence : 0.25,
    };
}

function buildNormalizeQuery(input : {
    queryPlan: Array<{
        intent : string;
        query : string;
    }>
}){
    return input.queryPlan
    .map((item) => `[${item.intent}] ${item.query}`)
    .join("\n");
}

function getLatestApprovedDecision(
    decisions : Array<{
        decision : ReviewDecisionType;
        correctedJson : unknown | null;
        correctedValidationJson : unknown | null;
        reviewerName: string | null;
        notes: string | null;
        createdAt: Date
    }>
){
    return decisions.find((decision) => {
        const isApprovedDecision = 
        decision.decision === ReviewDecisionType.APPROVE_AS_IS ||
        decision.decision === ReviewDecisionType.EDIT_AND_APPROVE;

        return isApprovedDecision && decision.correctedJson !== null;
    })
}

function getArrayFieldFromValidation(input: {
  validationJson: unknown;
  field: "missingFields" | "requiredEvidence" | "warnings" | "conflicts";
}) {
  if (
    typeof input.validationJson !== "object" ||
    input.validationJson === null ||
    Array.isArray(input.validationJson)
  ) {
    return [];
  }

  const value = (input.validationJson as Record<string, unknown>)[input.field];

  return Array.isArray(value) ? value : [];
}

function buildClaimContext(input: {
  run: {
    id: string;
    status: string;
    schemaVersion: string;
    model: string | null;
    promptVersion: string | null;
    extractedJson: unknown | null;
    validationJson: unknown | null;
    missingFieldsJson: unknown | null;
    confidenceJson: unknown | null;
    document: {
      id: string;
      filename: string;
      sourceType: string;
      mimeType: string;
      contentHash: string | null;
    };
    reviewTask: {
      status: ReviewTaskStatus;
      decisions: Array<{
        decision: ReviewDecisionType;
        correctedJson: unknown | null;
        correctedValidationJson: unknown | null;
        reviewerName: string | null;
        notes: string | null;
        createdAt: Date;
      }>;
    } | null;
  };
}) {
  const latestApprovedDecision = getLatestApprovedDecision(
    input.run.reviewTask?.decisions ?? [],
  );

  const claimJson =
    latestApprovedDecision?.correctedJson ?? input.run.extractedJson;

  const validationJson =
    latestApprovedDecision?.correctedValidationJson ?? input.run.validationJson;

  const missingFieldsJson = latestApprovedDecision
    ? getArrayFieldFromValidation({
        validationJson,
        field: "missingFields",
      })
    : input.run.missingFieldsJson;

  const requiredEvidenceJson = getArrayFieldFromValidation({
    validationJson,
    field: "requiredEvidence",
  });

  return {
    claimJson,
    context: {
      claimJson,
      validationJson,

      // IMPORTANT:
      // For reviewed claims, do not use stale extractionRun.missingFieldsJson.
      missingFieldsJson,
      requiredEvidenceJson,

      confidenceJson: input.run.confidenceJson,
      claimSource: latestApprovedDecision
        ? "reviewDecision.correctedJson"
        : "extractionRun.extractedJson",
      run: {
        id: input.run.id,
        status: input.run.status,
        schemaVersion: input.run.schemaVersion,
        model: input.run.model,
        promptVersion: input.run.promptVersion,
      },
      document: {
        id: input.run.document.id,
        filename: input.run.document.filename,
        sourceType: input.run.document.sourceType,
        mimeType: input.run.document.mimeType,
        contentHash: input.run.document.contentHash,
      },
      review: input.run.reviewTask
        ? {
            status: input.run.reviewTask.status,
            latestApprovedDecision: latestApprovedDecision
              ? {
                  decision: latestApprovedDecision.decision,
                  reviewerName: latestApprovedDecision.reviewerName,
                  notes: latestApprovedDecision.notes,
                  createdAt: latestApprovedDecision.createdAt,
                }
              : null,
          }
        : null,
    },
  };
}

async function findReusableCoverageQuestion(input: {
  runId: string;
  normalizedQuestion: string;
}) {
  const existingQuestions = await prisma.coverageQuestion.findMany({
    where: {
      runId: input.runId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return (
    existingQuestions.find((item) => {
      return normalizeCoverageQuestion(item.question) === input.normalizedQuestion;
    }) ?? null
  );
}

function buildReusableCoverageResponse(
  coverageQuestion: Awaited<ReturnType<typeof findReusableCoverageQuestion>>,
) {
  if (!coverageQuestion) {
    return null;
  }

  if (!isCoverageAnswerJson(coverageQuestion.answerJson)) {
    return null;
  }

  const retrievalJson = isRetrievalJson(coverageQuestion.retrievalJson)
    ? coverageQuestion.retrievalJson
    : {};

  return {
    coverageQuestionId: coverageQuestion.id,
    reused: true,
    decision: coverageQuestion.answerJson.decision,
    answer: coverageQuestion.answerJson.answer,
    citedClauses: coverageQuestion.answerJson.citedClauses,
    missingEvidence: coverageQuestion.answerJson.missingEvidence,
    confidence: coverageQuestion.answerJson.confidence,
    retrievalStatus: coverageQuestion.retrievalStatus ?? "INSUFFICIENT_EVIDENCE",
    retrievalReason:
      typeof retrievalJson.reason === "string" ? retrievalJson.reason : "",
    queryPlan: Array.isArray(retrievalJson.queryPlan)
      ? retrievalJson.queryPlan
      : [],
    matches: Array.isArray(retrievalJson.matches) ? retrievalJson.matches : [],
    guardrailReasons: Array.isArray(retrievalJson.guardrailReasons)
      ? retrievalJson.guardrailReasons
      : [],
    forcedNeedsReview:
      typeof retrievalJson.forcedNeedsReview === "boolean"
        ? retrievalJson.forcedNeedsReview
        : false,
    model:
      typeof coverageQuestion.answerJson.generation === "object" &&
      coverageQuestion.answerJson.generation !== null &&
      "model" in coverageQuestion.answerJson.generation
        ? (coverageQuestion.answerJson.generation as { model?: string }).model
        : undefined,
    promptVersion:
      typeof coverageQuestion.answerJson.generation === "object" &&
      coverageQuestion.answerJson.generation !== null &&
      "promptVersion" in coverageQuestion.answerJson.generation
        ? (
            coverageQuestion.answerJson.generation as {
              promptVersion?: string;
            }
          ).promptVersion
        : undefined,
  };
}

async function saveCoverageQuestion(input: {
    runId: string;
    question: string;
    retrievalResult: Awaited<ReturnType<typeof retrievePolicyEvidence>>;
    finalAnswer: CoverageAnswer;
    guardrailReasons: string[];
    forcedNeedsReview: boolean;
    generationMeta? : {
        model : string;
        promptVersion: string;
        rawModelOutput : unknown;
    }
}){
    return prisma.coverageQuestion.create({
        data : {
            runId : input.runId,
            question: input.question,
            normalizedQuery: buildNormalizeQuery({
                queryPlan: input.retrievalResult.queryPlan
            }),
            retrievalStatus: input.retrievalResult.retrievalStatus,
            retrievalJson: toPrismaJson({
                reason: input.retrievalResult.reason,
                queryPlan: input.retrievalResult.queryPlan,
                matches: input.retrievalResult.matches,
                guardrailReasons: input.guardrailReasons,
                forcedNeedsReview: input.forcedNeedsReview,
            }),
            answerJson: toPrismaJson({
                ...input.finalAnswer,
                generation: input.generationMeta
                ? {
                    model: input.generationMeta.model,
                    promptVersion : input.generationMeta.promptVersion,
                    rawModelOutput: input.generationMeta.rawModelOutput
                }
                : null
            }),
            finalDecision: input.finalAnswer.decision
        }
    });
}

export async function POST(request: Request, { params } : Params ){
    const { runId } = await params;

    try{
        const body = await request.json();
        const { question } = validateRequestBody(body);
        const normalizedQuestion = normalizeCoverageQuestion(question);

        const run = await prisma.extractionRun.findUnique({
            where : {
                id: runId
            },
            include: {
                document: true,
                reviewTask: {
                    include: {
                        decisions: {
                            orderBy: {
                                createdAt: "desc"
                            }
                        }
                    }
                }
            }
        });

        if(!run){
            return NextResponse.json(
                { error : "Run not found" },
                { status : 404 },
            )
        }

        if(run.document.deletedAt){
            return NextResponse.json(
                { error : "This document has been deleted and cannot be used for coverage answering.",},
                { status : 400 },
            )
        }

        if(run.status !== "COMPLETED" && run.status !== "NEEDS_REVIEW"){
            return NextResponse.json(
                { error : `Coverage answering can only run for COMPLETED or NEEDS_REVIEW runs. Current status: ${run.status}`,},
                { status : 400 },
            )
        }

        const { claimJson, context: claimContext} = buildClaimContext({ run });
        if(!claimJson){
            return NextResponse.json({
                error : "Run does not have extractedJson or approved correctedJson for coverage answering.",
            },
            { status : 400 })
        }

        const reusableCoverageQuestion = await findReusableCoverageQuestion({
            runId: run.id,
            normalizedQuestion,
        });

        const reusableResponse = buildReusableCoverageResponse(reusableCoverageQuestion);

        if (reusableResponse) {
            return NextResponse.json(reusableResponse);
        }

        const retrievalResult = await retrievePolicyEvidence({
            question,
            claimContext,
            topKFinal: 5,
        });

        if(retrievalResult.retrievalStatus === "INSUFFICIENT_EVIDENCE"){
            const finalAnswer = buildInsufficientEvidenceAnswer(retrievalResult.reason);
        

            const guardrailReasons = [
                "Retrieval returned INSUFFICIENT_EVIDENCE, so generation was skipped.",
                retrievalResult.reason
            ];

            const coverageQuestion = await saveCoverageQuestion({
                runId : run.id,
                question,
                retrievalResult,
                finalAnswer,
                guardrailReasons,
                forcedNeedsReview: true
            });

            return NextResponse.json({
                coverageQuestionId: coverageQuestion.id,
                decision: finalAnswer.decision,
                answer: finalAnswer.answer,
                citedClauses: finalAnswer.citedClauses,
                missingEvidence: finalAnswer.missingEvidence,
                confidence: finalAnswer.confidence,
                retrievalStatus: retrievalResult.retrievalStatus,
                retrievalReason: retrievalResult.reason,
                queryPlan: retrievalResult.queryPlan,
                matches: retrievalResult.matches,
                guardrailReasons,
                forcedNeedsReview: true,
            })
        }

        const generated = await generateCoverageAnswer({
            question,
            claimContext,
            retrievalResult,
        });

        const citationValidation = validateCoverageCitations({
            answer : generated.answer,
            retrievalResult,
            question,
            claimContext,
        });

        const finalAnswer = citationValidation.answer;

        const coverageQuestion = await saveCoverageQuestion({
            runId: run.id,
            question,
            retrievalResult,
            finalAnswer,
            guardrailReasons: citationValidation.guardrailReasons,
            forcedNeedsReview: citationValidation.forcedNeedsReview,
            generationMeta: {
                model: generated.model,
                promptVersion: generated.promptVersion,
                rawModelOutput: generated.rawModelOutput,
            },
        })

        return NextResponse.json({
            coverageQuestionId: coverageQuestion.id,
            decision: finalAnswer.decision,
            answer: finalAnswer.answer,
            citedClauses: finalAnswer.citedClauses,
            missingEvidence: finalAnswer.missingEvidence,
            confidence: finalAnswer.confidence,
            retrievalStatus: retrievalResult.retrievalStatus,
            retrievalReason: retrievalResult.reason,
            queryPlan: retrievalResult.queryPlan,
            matches: retrievalResult.matches,
            guardrailReasons: citationValidation.guardrailReasons,
            forcedNeedsReview: citationValidation.forcedNeedsReview,
            model: generated.model,
            promptVersion: generated.promptVersion,
        })
    } catch(error){
        console.error("Coverage answer API failed", error);

        const message = getErrorMessage(error);
        const isValidationError = 
            message.includes("question") || message.includes("Request body");

        return NextResponse.json(
            { error : message },
            { status: isValidationError ? 400 : 500 },
        )
    }
}