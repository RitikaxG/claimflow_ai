/*
run.extractedJson + reviewDecision.correctedJson
→ list of changed fields
*/

import { isRecord, stableJsonStringify } from "../utils/json";

export type CorrectedJsonDiff = {
  fieldPath: string;
  beforeValue: unknown;
  afterValue: unknown;
  changeType: "ADDED" | "REMOVED" | "CHANGED";
};

const IGNORED_KEYS = new Set(["id", "createdAt", "updatedAt"]);

function shouldIgnoreKey(key: string): boolean {
  return IGNORED_KEYS.has(key);
}

function isTerminalValue(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value)
  );
}

function flattenJson(
  value: unknown,
  currentPath = "",
  output = new Map<string, unknown>(),
): Map<string, unknown> {
  if (typeof value === "undefined") {
    return output;
  }

  if (isTerminalValue(value)) {
    if (currentPath.length > 0) {
      output.set(currentPath, value);
    }

    return output;
  }

  if (!isRecord(value)) {
    if (currentPath.length > 0) {
      output.set(currentPath, value);
    }

    return output;
  }

  for (const key of Object.keys(value).sort()) {
    if (shouldIgnoreKey(key)) {
      continue;
    }

    const childPath = currentPath.length > 0 ? `${currentPath}.${key}` : key;

    flattenJson(value[key], childPath, output);
  }

  return output;
}

function valuesAreEqual(left: unknown, right: unknown): boolean {
  return stableJsonStringify(left) === stableJsonStringify(right);
}

export function diffCorrectedJson(
  beforeJson: unknown,
  afterJson: unknown,
): CorrectedJsonDiff[] {
  const beforeFlat = flattenJson(beforeJson);
  const afterFlat = flattenJson(afterJson);

  const allPaths = Array.from(
    new Set([...beforeFlat.keys(), ...afterFlat.keys()]),
  ).sort();

  const diffs: CorrectedJsonDiff[] = [];

  for (const fieldPath of allPaths) {
    const beforeHasPath = beforeFlat.has(fieldPath);
    const afterHasPath = afterFlat.has(fieldPath);

    const beforeValue = beforeFlat.get(fieldPath);
    const afterValue = afterFlat.get(fieldPath);

    if (!beforeHasPath && afterHasPath) {
      diffs.push({
        fieldPath,
        beforeValue: null,
        afterValue,
        changeType: "ADDED",
      });

      continue;
    }

    if (beforeHasPath && !afterHasPath) {
      diffs.push({
        fieldPath,
        beforeValue,
        afterValue: null,
        changeType: "REMOVED",
      });

      continue;
    }

    if (!valuesAreEqual(beforeValue, afterValue)) {
      diffs.push({
        fieldPath,
        beforeValue,
        afterValue,
        changeType: "CHANGED",
      });
    }
  }

  return diffs;
}