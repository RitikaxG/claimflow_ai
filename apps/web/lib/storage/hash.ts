import { createHash } from "node:crypto";

export function createSha256Hash(buffer : Buffer){
    return createHash("sha256").update(buffer).digest("hex");
}

export function normalizeEmailText(text : string){
    return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function createEmailTextHash(text : string){
    const normalizedText = normalizeEmailText(text);
    return createSha256Hash(Buffer.from(normalizedText, "utf-8"));
}