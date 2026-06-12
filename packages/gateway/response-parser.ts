import { z } from "zod";

export function parseJsonResponse<T>(
  responseText: string,
  schema: z.ZodType<T>,
): T {
  const parsed = JSON.parse(responseText);
  return schema.parse(parsed);
}