import path from "node:path";
import { fileURLToPath } from "node:url";   

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const MEMORY_PACKAGE_ROOT = path.resolve(dirname, "..");
export const REPO_ROOT = path.resolve(MEMORY_PACKAGE_ROOT, "../..");

export const WEEK5_MEMORY_ROOT = path.join(
    REPO_ROOT,
    "sample-data",
    "week-05-memory",
);

export const WEEK5_MEMORY_HISTORY_ROOT = path.join(
    WEEK5_MEMORY_ROOT,
    "history",
);

export const WEEK5_MEMORY_OBSERVATIONS_PATH = path.join(
    WEEK5_MEMORY_HISTORY_ROOT,
    "memory-observations.json",
);

export const WEEK5_MEMORY_SEED_PATH = path.join(
    WEEK5_MEMORY_HISTORY_ROOT,
    "workflow-memories.seed.json",
);