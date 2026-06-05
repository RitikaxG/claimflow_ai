export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getString(item))
    .filter((item): item is string => item !== null);
}

export function normalizeNullableString(value: unknown): string | null {
  return getString(value);
}

function normalizeForStableStringify(
  value: unknown,
  seen: WeakSet<object>,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "undefined") {
    return "__undefined__";
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableStringify(item, seen));
  }

  if (isRecord(value)) {
    if (seen.has(value)) {
      return "__circular__";
    }

    seen.add(value);

    const sorted: Record<string, unknown> = {};

    for (const key of Object.keys(value).sort()) {
      sorted[key] = normalizeForStableStringify(value[key], seen);
    }

    seen.delete(value);

    return sorted;
  }

  return String(value);
}

export function stableJsonStringify(value: unknown): string {
  const normalized = normalizeForStableStringify(value, new WeakSet<object>());
  const stringified = JSON.stringify(normalized);

  return typeof stringified === "string" ? stringified : String(stringified);
}

export type JsonSafeValue =
  | string
  | number
  | boolean
  | null
  | JsonSafeValue[]
  | { [key: string]: JsonSafeValue };

export function toJsonSafeValue(value: unknown): JsonSafeValue {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafeValue(item));
  }

  if (isRecord(value)) {
    const output: Record<string, JsonSafeValue> = {};

    for (const [key, item] of Object.entries(value)) {
      output[key] = toJsonSafeValue(item);
    }

    return output;
  }

  return String(value);
}