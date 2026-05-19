import type { ParsedPolicyClause, PolicyDocumentMetadata } from "./types";

type ParsePolicyDocumentInput = {
    markdown : string;
    sourcePath : string;
    contentHash : string;
}

type ParsedPolicyDocument = {
    metadata : PolicyDocumentMetadata;
    clauses : ParsedPolicyClause[];
}

function readMetadataValue(markdown : string, key : string) : string | null {
    const pattern = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m");
    const match = markdown.match(pattern);
    return match?.[1]?.trim() ?? null;
}

function normalizeSourceType (
    rawSourceType : string | null,
) : PolicyDocumentMetadata["sourceType"] {
    if(!rawSourceType) return "SYNTHETIC_MARKDOWN";

    const normalized = rawSourceType.trim().toUpperCase();

    if(normalized === "SYNTHETIC") return "SYNTHETIC_MARKDOWN";
    if(normalized === "SYNTHETIC_MARKDOWN") return "SYNTHETIC_MARKDOWN";
    if(normalized === "PUBLIC_PDF") return "PUBLIC_PDF";
    if(normalized === "PUBLIC_WEB") return "PUBLIC_WEB";
    if(normalized === "TEXT") return "TEXT";

    throw new Error(`Unsupported policy SOURCE_TYPE : ${rawSourceType}`);
}

function parseTitle(markdown : string) : string {
    const titleMatch = markdown.match(/^#(?!#)\s+(.+?)\s*$/m);

    if(!titleMatch?.[1]){
        throw new Error("Policy document is missing a top level # title");
    }

    return titleMatch[1].trim();
}

function parseClauses(markdown : string) : ParsedPolicyClause[] {
    const clauseHeadingPattern = /^##\s+CLAUSE\s+([A-Z0-9-]+):\s+(.+)$/gm;

    const matches = [...markdown.matchAll(clauseHeadingPattern)];
    if(matches.length === 0){
        throw new Error("Policy Document does not contain any clause sections");
    }

    return matches.map((match, index) => {
        const clauseId = match[1]?.trim();
        const sectionTitle = match[2]?.trim();

        if(!clauseId || !sectionTitle){
            throw new Error("Invalid clause heading found in policy document.");
        }

        const startIndex = match.index ?? 0;
        const nextMatch = matches[index + 1];
        const endIndex = nextMatch?.index ?? markdown.length;

        const fullClauseText = markdown.slice(startIndex, endIndex).trim();

        return {
            clauseId,
            sectionTitle,
            text : fullClauseText,
        }
    });
}

export function parsePolicyDocument({
    markdown,
    sourcePath,
    contentHash,
}: ParsePolicyDocumentInput)  : ParsedPolicyDocument {
    const title = parseTitle(markdown);

    const policyId = readMetadataValue(markdown,"POLICY_ID");
    const productType = readMetadataValue(markdown, "PRODUCT_TYPE");
    const version = readMetadataValue(markdown,"VERSION");
    const rawSourceType = readMetadataValue(markdown,"SOURCE_TYPE");

    if(!productType){
        throw new Error(`Policy Document ${sourcePath} is missing PRODUCT_TYPE.`);
    }

    if(!version){
        throw new Error(`Policy Document ${sourcePath} is missing version`);
    }

    const metadata : PolicyDocumentMetadata = {
        title,
        policyId,
        productType,
        version,
        sourceType : normalizeSourceType(rawSourceType),
        sourcePath,
        contentHash,
    };

    return {
        metadata,
        clauses : parseClauses(markdown),
    }
}