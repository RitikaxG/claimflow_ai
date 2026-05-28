import { tool } from "langchain";
import { z } from "zod";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const NoActionInputSchema = z.object({
  runId: z.string().min(1),
  reason: z.string().min(5).max(2000).optional(),
});

export const noActionTool = tool(
  async ({ runId, reason }) => {
    try {
      return okToolResult({
        action: "NO_ACTION",
        runId,
        message: "No workflow action is needed for this claim state.",
        data: {
          reason: reason ?? "Agent determined no safe or necessary action is needed.",
          skipped: true,
          unsafeFinalActionPerformed: false,
        },
      });
    } catch (error) {
      return failedToolResult({
        action: "NO_ACTION",
        runId,
        message: "No action tool failed.",
        error: getErrorMessage(error),
      });
    }
  },
  {
    name: "no_action",
    description:
      "Use when the review is already final or when no safe workflow action is needed. This does not mutate claim, review, or document state.",
    schema: NoActionInputSchema,
  },
);