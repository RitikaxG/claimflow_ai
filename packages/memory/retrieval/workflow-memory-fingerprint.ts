import { getStringArray } from "../utils/json";

type FingerprintMemory = {
  id: string;
  kind: string;
  entityType: string | null;
  tags: unknown;
};

const WORKFLOW_PROFILE_TAG_PREFIXES = [
  "claim_type:",
  "loss_type:",
  "damage_type:",
  "missing_field:",
  "required_evidence:",
  "evidence_profile:",
  "validation_pattern:",
  "review_outcome:",
];

export function getWorkflowMemoryDisplayKey(
  memory: FingerprintMemory,
): string {
  if (
    memory.kind !== "PRIOR_REVIEW_DECISION" ||
    memory.entityType !== "WORKFLOW"
  ) {
    return `memory:${memory.id}`;
  }

  const profileTags = getStringArray(memory.tags)
    .filter((tag) =>
      WORKFLOW_PROFILE_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix)),
    )
    .sort();

  return profileTags.length > 0
    ? `reviewed-workflow:${profileTags.join("|")}`
    : `memory:${memory.id}`;
}
