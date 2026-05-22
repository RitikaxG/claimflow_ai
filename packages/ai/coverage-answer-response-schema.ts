import { Type } from "@google/genai";

export const COVERAGE_ANSWER_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: [
    "decision",
    "answer",
    "citedClauses",
    "missingEvidence",
    "confidence",
  ],
  properties: {
    decision: {
      type: Type.STRING,
      enum: ["COVERED", "NOT_COVERED", "PARTIALLY_COVERED", "NEEDS_REVIEW"],
    },

    answer: {
      type: Type.STRING,
    },

    citedClauses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["clauseId", "chunkId", "quote", "relevance"],
        properties: {
          clauseId: {
            type: Type.STRING,
          },
          chunkId: {
            type: Type.STRING,
          },
          quote: {
            type: Type.STRING,
          },
          relevance: {
            type: Type.STRING,
          },
        },
      },
    },

    missingEvidence: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },

    confidence: {
      type: Type.NUMBER,
    },
  },
} as const;