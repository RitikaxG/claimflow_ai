import { prisma, Prisma } from "@repo/db";

type EvalCaseStatusInput = "PASSED" | "FAILED" | "WARNING";

export type RecordEvalRunInput = {
  suite:
    | "WEEK1_EXTRACTION"
    | "WEEK2_REVIEW"
    | "WEEK3_RAG"
    | "WEEK4_AGENT"
    | "WEEK5_MEMORY"
    | "WEEK6_GATEWAY_OBSERVABILITY";
  label?: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  warningCases?: number;
  passRate: number;
  averageScore?: number | null;
  metricsJson?: unknown;
  metadataJson?: unknown;
  cases: Array<{
    caseId: string;
    status: EvalCaseStatusInput;
    score?: number | null;
    expectedJson?: unknown;
    actualJson?: unknown;
    failureReason?: string | null;
    metadataJson?: unknown;
  }>;
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export async function recordEvalRun(input: RecordEvalRunInput) {
  return prisma.evalRun.create({
    data: {
      suite: input.suite,
      label: input.label,
      totalCases: input.totalCases,
      passedCases: input.passedCases,
      failedCases: input.failedCases,
      warningCases: input.warningCases ?? 0,
      passRate: input.passRate,
      averageScore: input.averageScore ?? null,
      metricsJson: toPrismaJson(input.metricsJson ?? {}),
      metadataJson: toPrismaJson(input.metadataJson ?? {}),
      cases: {
        create: input.cases.map((item) => ({
          caseId: item.caseId,
          status: item.status,
          score: item.score ?? null,
          expectedJson: toPrismaJson(item.expectedJson ?? null),
          actualJson: toPrismaJson(item.actualJson ?? null),
          failureReason: item.failureReason ?? null,
          metadataJson: toPrismaJson(item.metadataJson ?? {}),
        })),
      },
    },
  });
}