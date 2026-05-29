import { prisma } from "@repo/db";
import { tool } from "langchain";
import { z } from "zod";
import { assertReviewTaskIsNotFinal, serializeReviewTask } from "./review-task-helpers";
import { toPrismaJson } from "./prisma-json";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const MarkNeedsMoreInfoInputSchema = z
  .object({
    runId: z.string().min(1),
    missingEvidence: z.array(z.string().min(1)).default([]),
    missingFields: z.array(z.string().min(1)).default([]),
    note: z.string().max(2000).optional(),
  })
  .refine(
    (value) => value.missingEvidence.length > 0 || value.missingFields.length > 0,
    {
      message: "At least one missing field or missing evidence item is required.",
    },
  );

function assertAgentCanMarkNeedsMoreInfo(input: { status: string }) {
  const allowedStatuses = new Set(["PENDING", "IN_REVIEW", "NEEDS_MORE_INFO"]);

  if (!allowedStatuses.has(input.status)) {
    throw new Error(
      `Agent cannot mark review task as NEEDS_MORE_INFO from status ${input.status}.`,
    );
  }
}

export const markNeedsMoreInfoTool = tool(
  async ({ runId, missingEvidence, missingFields, note }) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const run = await tx.extractionRun.findUnique({
          where: { id: runId },
          include: {
            reviewTask: true,
          },
        });

        if (!run) {
          throw new Error(`Extraction run not found: ${runId}`);
        }

        const reasonJson = {
          source: "claimflow_agent_tool",
          sourceToolName: "mark_needs_more_info",
          missingEvidence,
          missingFields,
          note: note ?? null,
          runStatus: run.status,
        };

        if (run.reviewTask) {
          assertReviewTaskIsNotFinal({
            status: run.reviewTask.status,
            toolName: "mark_needs_more_info",
          });

          assertAgentCanMarkNeedsMoreInfo({
            status: run.reviewTask.status,
          });

          const updatedTask = await tx.reviewTask.update({
            where: {
              id: run.reviewTask.id,
            },
            data: {
              status: "NEEDS_MORE_INFO",
              completedAt: new Date(),
              reasonJson: toPrismaJson(reasonJson),
            },
          });

          await tx.reviewEvent.create({
            data: {
              taskId: updatedTask.id,
              type: "REVIEW_MORE_INFO_REQUESTED",
              message:
                "Agent marked this review task as needing more information.",
              metadata: toPrismaJson({
                ...reasonJson,
                previousStatus: run.reviewTask.status,
                newStatus: "NEEDS_MORE_INFO",
              }),
            },
          });

          return {
            reviewTask: updatedTask,
            reused: true,
            previousStatus: run.reviewTask.status,
          };
        }

        const createdTask = await tx.reviewTask.create({
          data: {
            runId,
            status: "NEEDS_MORE_INFO",
            priority: "NORMAL",
            reasonJson: toPrismaJson(reasonJson),
            completedAt: new Date(),
            events: {
              create: {
                type: "REVIEW_MORE_INFO_REQUESTED",
                message:
                  "Agent created a review task that needs more information.",
                metadata: toPrismaJson({
                  ...reasonJson,
                  previousStatus: null,
                  newStatus: "NEEDS_MORE_INFO",
                }),
              },
            },
          },
        });

        return {
          reviewTask: createdTask,
          reused: false,
          previousStatus: null,
        };
      });

      return okToolResult({
        action: "MARK_NEEDS_MORE_INFO",
        runId,
        message: "Review workflow marked as needing more information.",
        data: {
          reusedReviewTask: result.reused,
          previousStatus: result.previousStatus,
          newStatus: "NEEDS_MORE_INFO",
          reviewTask: serializeReviewTask(result.reviewTask),
          missingEvidence,
          missingFields,
          note: note ?? null,
        },
      });
    } catch (error) {
      return failedToolResult({
        action: "MARK_NEEDS_MORE_INFO",
        runId,
        message: "Mark needs more information tool failed.",
        error: getErrorMessage(error),
      });
    }
  },
  {
    name: "mark_needs_more_info",
    description:
      "Mark the review workflow as NEEDS_MORE_INFO when required claim fields or evidence are missing. This is not a final claim decision.",
    schema: MarkNeedsMoreInfoInputSchema,
  },
);