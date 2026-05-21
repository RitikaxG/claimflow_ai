import path from "node:path";
import { fileURLToPath } from "node:url";

const _dirname = path.dirname(fileURLToPath(import.meta.url));

export const WEEK3_RAG_ROOT = path.resolve(
    _dirname,
    "../../sample-data/week-03-policy-rag",
);

export const WEEK3_POLICY_DOCS_ROOT = path.join(
    WEEK3_RAG_ROOT,
    "policies",
);