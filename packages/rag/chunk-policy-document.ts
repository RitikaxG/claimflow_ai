import type { ParsedPolicyClause, PolicyChunkInput } from "./types";

/*
estimateTokenCount("The claim requires a police report")
Word count is 6.

Estimated token count:
ceil(6 * 1.3) = ceil(7.8) = 8

So this function says: “This text probably uses about 8 tokens.”

 You may store tokenCount on each PolicyChunk to know how much text you 
 are sending into embedding or answer-generation prompts.
*/
function estimateTokenCount(text : string){
    return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

export function chunkPolicyClauses(
    clauses : ParsedPolicyClause[],
) : PolicyChunkInput[] {
    return clauses.map((clause, index) => ({
        chunkIndex : index,
        clauseId : clause.clauseId,
        sectionTitle : clause.sectionTitle,
        text : clause.text,
        tokenCount : estimateTokenCount(clause.text),
    }))
}