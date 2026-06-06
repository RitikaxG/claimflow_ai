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

    lossType : string | null,
    damageType : string | null,

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

function collectFieldPaths(input : {
    missingFields : string[],
    requiredEvidence : string[],
}) : string[] {
    return uniqueStrings([
        ...input.missingFields,
        ...(input.missingFields.length > 0 ? ["missingFields"] : []),
        ...requiredEvidenceToFieldPaths(input.requiredEvidence),
        ...(input.requiredEvidence.length > 0 ? ["requiredEvidence"] : []),
    ]);
}

function collectTags(input : {
    missingFields : string[],
    requiredEvidence : string[],
    lossType : string | null,
    damageType : string | null,
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

    const damageTypeTags = input.damageType
        ? [`damage_type:${normalizeTagToken(input.damageType)}`]
        : [];

    return uniqueStrings([
        ...missingFieldTags,
        ...requiredEvidenceTags,
        ...lossTypeTags,
        ...damageTypeTags,
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
            ["policy","policyId"],
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
    const lossType = getLossType(claimState);
    const damageType = getDamageType(claimState);

    const fieldPaths = collectFieldPaths({
        missingFields,
        requiredEvidence,
    });

    const tags = collectTags({
        missingFields,
        requiredEvidence,
        lossType,
        damageType,
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
        lossType,
        damageType,
        canWriteHits: input.canWriteHits ?? false,
    }
}