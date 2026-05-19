export type PolicyDocumentMetadata = {
    title : string,
    policyId : string | null,
    productType : string,
    version : string,
    sourceType : "SYNTHETIC_MARKDOWN" | "PUBLIC_PDF" | "PUBLIC_WEB" | "TEXT",
    sourcePath : string,
    contentHash : string,
};

export type ParsedPolicyClause = {
    clauseId : string,
    sectionTitle : string,
    text : string,
}

export type PolicyChunkInput = {
    chunkIndex : number,
    clauseId : string,
    sectionTitle : string,
    text : string,
    tokenCount : number,
}