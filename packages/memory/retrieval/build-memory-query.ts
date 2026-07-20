import { MemoryClaimStateSchema, type MemoryClaimState } from "../types";
import { getStringArray, isRecord, getString } from "../utils/json";


export type BuildMemoryQuery = {
    runId : string | null,
    claimantId : string | null,
    policyId : string | null,
    vendorId : string | null,

    missingFields : string[],
    requiredEvidence : string[],

    fieldPaths : string[],
    tags : string[],

    claimType : string | null,
    lossType : string | null,
    damageType : string | null,
    evidenceProfile : string,
    validationPattern : string,

    canWriteHits : boolean,
}

function uniqueStrings(values : string[]) : string[] {
    return Array.from(
        new Set(
            values
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        )
    )
}

function getNestedValues(value : unknown, path : string[]) : unknown {
    let current : unknown = value;

    for(const key of path){
        if(!isRecord(current)){
            return null;
        }

        current = current[key];
    }

    return current;
}

function firstStringAtPaths(value : unknown, paths : string[][]) : string | null {
    for(const path of paths){
        const found = getString(getNestedValues(value, path));

        if(found){
            return found;
        }
    }

    return null;
}

function getStringArrayAtPath(value : unknown, path : string[]) : string[] {
    return getStringArray(getNestedValues(value, path));
}

function normalizeTagToken(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function capitalizeToken(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function tokenizeFieldPath(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function lowerCamelFromTokens(tokens: string[]): string | null {
  const [first, ...rest] = tokens;

  if (!first) {
    return null;
  }

  return [
    first.toLowerCase(),
    ...rest.map((token) => capitalizeToken(token.toLowerCase())),
  ].join("");
}

function dottedCamelFromTokens(tokens: string[]): string | null {
  const [first, ...rest] = tokens;

  if (!first || rest.length === 0) {
    return null;
  }

  return `${first.toLowerCase()}.${lowerCamelFromTokens(rest)}`;
}

function fieldPathAliases(fieldPath: string): string[] {
  const trimmed = fieldPath.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const tokens = tokenizeFieldPath(trimmed);
  const lowerCamel = lowerCamelFromTokens(tokens);
  const dottedCamel = dottedCamelFromTokens(tokens);
  const snakeCase = normalizeTagToken(trimmed);

  return uniqueStrings([
    trimmed,
    lowerCamel ?? "",
    dottedCamel ?? "",
    snakeCase,
  ]);
}

function expandFieldPathAliases(fieldPaths: string[]): string[] {
  return uniqueStrings(fieldPaths.flatMap((fieldPath) => fieldPathAliases(fieldPath)));
}

function requiredEvidenceToFieldPaths(requiredEvidence : string[]): string[]{
    return requiredEvidence.flatMap((item) => {
        const trimmed = item.trim();

        if(trimmed.length === 0){
            return [];
        }

        if(trimmed.startsWith("requiredEvidence.")){
            return [trimmed];
        }

        return [trimmed,`requiredEvidence.${trimmed}`];
    });
}

function collectMissingFields(claimState : MemoryClaimState) : string[] {
    return uniqueStrings([
        ...claimState.missingFields,
        ...getStringArrayAtPath(claimState.validationJson,["missingFields"]),
    ]);
}

function collectRequiredEvidence(claimState : MemoryClaimState) : string[] {
    return uniqueStrings([
        ...claimState.requiredEvidence,
        ...getStringArrayAtPath(claimState.validationJson,["requiredEvidence"]),
    ]);
}

function collectRiskSignalTags(validationJson : unknown): string[]{
    return getStringArrayAtPath(validationJson,["riskSignals"]).map(
        (signal) => `risk_signal:${normalizeTagToken(signal)}`
    )
}

function hasNonEmptyValueAtPaths(value: unknown, paths: string[][]): boolean {
  return paths.some((path) => {
    const found = getNestedValues(value, path);

    if (Array.isArray(found)) {
      return found.length > 0;
    }

    if (typeof found === "string") {
      return found.trim().length > 0;
    }

    return isRecord(found) && Object.keys(found).length > 0;
  });
}

function buildEvidenceProfile(requiredEvidence: string[]): string {
  if (requiredEvidence.length === 0) {
    return "evidence_complete";
  }

  return uniqueStrings(requiredEvidence.map(normalizeTagToken))
    .sort()
    .join("+");
}

function buildValidationPattern(input: {
  missingFields: string[];
  requiredEvidence: string[];
  validationJson: unknown;
}): string {
  const pattern: string[] = [];

  if (input.missingFields.length > 0) {
    pattern.push("missing_fields");
  }

  if (input.requiredEvidence.length > 0) {
    pattern.push("evidence_required");
  }

  if (
    hasNonEmptyValueAtPaths(input.validationJson, [
      ["conflicts"],
      ["fieldConflicts"],
      ["validationConflicts"],
    ])
  ) {
    pattern.push("conflicts");
  }

  if (
    hasNonEmptyValueAtPaths(input.validationJson, [
      ["warnings"],
      ["validationWarnings"],
      ["riskSignals"],
    ])
  ) {
    pattern.push("review_signals");
  }

  return pattern.length > 0 ? pattern.sort().join("+") : "clean";
}

function collectFieldPaths(input : {
    missingFields : string[],
    requiredEvidence : string[],
}) : string[] {
    return expandFieldPathAliases([
        ...input.missingFields,
        ...(input.missingFields.length > 0 ? ["missingFields"] : []),
        ...requiredEvidenceToFieldPaths(input.requiredEvidence),
        ...(input.requiredEvidence.length > 0 ? ["requiredEvidence"] : []),
    ]);
}

function collectTags(input : {
    missingFields : string[],
    requiredEvidence : string[],
    claimType : string | null,
    lossType : string | null,
    damageType : string | null,
    evidenceProfile : string,
    validationPattern : string,
    validationJson : unknown,
}) : string[] {
    const missingFieldTags = input.missingFields.flatMap((field) => {
        const normalized = normalizeTagToken(field);

        return [`missing_field:${normalized}`, `${normalized}_missing`];
    });

    const requiredEvidenceTags = input.requiredEvidence.flatMap((evidence) => {
        const normalized = normalizeTagToken(evidence);

        return [`required_evidence:${normalized}`, `${normalized}_required`];
    });

    const lossTypeTags = input.lossType
        ? [`loss_type:${normalizeTagToken(input.lossType)}`]
        : [];

    const claimTypeTags = input.claimType
        ? [`claim_type:${normalizeTagToken(input.claimType)}`]
        : [];

    const damageTypeTags = input.damageType
        ? [`damage_type:${normalizeTagToken(input.damageType)}`]
        : [];

    return uniqueStrings([
        ...missingFieldTags,
        ...requiredEvidenceTags,
        ...claimTypeTags,
        ...lossTypeTags,
        ...damageTypeTags,
        `evidence_profile:${input.evidenceProfile}`,
        `validation_pattern:${input.validationPattern}`,
        ...collectRiskSignalTags(input.validationJson),
    ]);
}

function getClaimantId(claimState: MemoryClaimState): string | null {
  return (
    getString(claimState.customerId) ??
    getString(claimState.claimantId) ??
    firstStringAtPaths(claimState.extractedJson, [
      ["customerId"],
      ["claimantId"],
      ["claimant", "customerId"],
      ["claimant", "claimantId"],
      ["insured", "customerId"],
    ])
  );
}

function getPolicyId(claimState : MemoryClaimState) : string | null {
    return (
        getString(claimState.policyId) ??
        firstStringAtPaths(claimState.extractedJson,[
            ["policyId"],
            ["policyNumber"],
            ["policy","policyId"],
            ["policy","policyNumber"],
        ])
    )
}

function getVendorId(claimState : MemoryClaimState) : string | null {
    return (
        getString(claimState.vendorId) ??
        firstStringAtPaths(claimState.extractedJson,[
            ["vendorId"],
            ["vendor","vendorId"],
            ["repairVendorId"],
            ["repairVendor","vendorId"],
            ["invoice","vendorId"],
        ])
    );
}

function getLossType(claimState : MemoryClaimState) : string | null {
    return firstStringAtPaths(claimState.extractedJson,[
        ["lossType"],
        ["claim","lossType"],
        ["incident","lossType"],
    ]);
}

function getClaimType(claimState: MemoryClaimState): string | null {
  const explicitClaimType = firstStringAtPaths(claimState.extractedJson, [
    ["claimType"],
    ["claim", "claimType"],
    ["claim", "type"],
    ["policy", "claimType"],
    ["policy", "productType"],
    ["insuranceType"],
  ]);

  if (explicitClaimType) {
    return explicitClaimType;
  }

  const hasVehicleDetails = hasNonEmptyValueAtPaths(claimState.extractedJson, [
    ["vehicle"],
    ["vehicleRegistrationNumber"],
    ["registrationNumber"],
  ]);

  return hasVehicleDetails ? "motor_claim" : null;
}

function getDamageType(claimState : MemoryClaimState) : string | null {
    return firstStringAtPaths(claimState.extractedJson,[
        ["damageType"],
        ["claim","damageType"],
        ["incident","damageType"],
    ]);
}

export function buildMemoryQuery(input : {
    runId? : string | null,
    claimState? : MemoryClaimState | unknown,
    canWriteHits? : boolean,
}) : BuildMemoryQuery {
    const claimState = MemoryClaimStateSchema.parse(input.claimState ?? {});

    const runId = input.runId ?? claimState.runId ?? null;
    const missingFields = collectMissingFields(claimState);
    const requiredEvidence = collectRequiredEvidence(claimState);
    const claimType = getClaimType(claimState);
    const lossType = getLossType(claimState);
    const damageType = getDamageType(claimState);
    const evidenceProfile = buildEvidenceProfile(requiredEvidence);
    const validationPattern = buildValidationPattern({
        missingFields,
        requiredEvidence,
        validationJson: claimState.validationJson,
    });

    const fieldPaths = collectFieldPaths({
        missingFields,
        requiredEvidence,
    });

    const tags = collectTags({
        missingFields,
        requiredEvidence,
        claimType,
        lossType,
        damageType,
        evidenceProfile,
        validationPattern,
        validationJson: claimState.validationJson,
    });

    return {
        runId,
        claimantId: getClaimantId(claimState),
        policyId: getPolicyId(claimState),
        vendorId : getVendorId(claimState),
        missingFields,
        requiredEvidence,   
        fieldPaths,
        tags,
        claimType,
        lossType,
        damageType,
        evidenceProfile,
        validationPattern,
        canWriteHits: input.canWriteHits ?? false,
    }
}
