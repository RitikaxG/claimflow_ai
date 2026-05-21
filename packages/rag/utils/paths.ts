// packages/rag/utils/paths.ts

import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const RAG_PACKAGE_ROOT = path.resolve(dirname, "..");

export const REPO_ROOT = path.resolve(RAG_PACKAGE_ROOT, "../..");

export const WEEK3_RAG_ROOT = path.join(
  REPO_ROOT,
  "sample-data",
  "week-03-policy-rag",
);

export const WEEK3_POLICY_DOCS_ROOT = path.join(
  WEEK3_RAG_ROOT,
  "policies",
);

export const WEEK3_RETRIEVAL_SMOKE_CASES_PATH = path.join(
  WEEK3_RAG_ROOT,
  "questions",
  "retrieval-smoke-cases.json",
);