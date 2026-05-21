import crypto from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@repo/db";
import { chunkPolicyClauses } from "../parsing/chunk-policy-document";
import { parsePolicyDocument } from "../parsing/parse-policy-document";
import { WEEK3_POLICY_DOCS_ROOT, WEEK3_RAG_ROOT } from "../paths";

const FORCE_POLICY_RELOAD = process.env.FORCE_POLICY_RELOAD === "true";

function toPosixPath(filePath : string){
    return filePath.split(path.sep).join("/");
};

function createContentHash(content : string){
    return crypto.createHash("sha256").update(content).digest("hex");
}

function getRepoRelativeSourcePath(filePath: string) {
  const repoRoot = path.resolve(WEEK3_RAG_ROOT, "../..");
  return toPosixPath(path.relative(repoRoot, filePath));
}

async function listPolicyMarkdownFiles(){
    const entries = await readdir(WEEK3_POLICY_DOCS_ROOT,{
        withFileTypes : true,
    });

    return entries
        .filter((entry) => entry.isFile())
        .filter((entry) => entry.name.endsWith(".md"))
        .filter((entry) => entry.name !== "public-policy-anchor-sources.md")
        .map((entry) => path.join(WEEK3_POLICY_DOCS_ROOT,entry.name))
        .sort();
}

async function loadPolicyFile(filePath : string){
    const markdown = await readFile(filePath,"utf-8");
    const contentHash = createContentHash(markdown);
    const sourcePath = getRepoRelativeSourcePath(filePath);

    const parsedPolicy = parsePolicyDocument({
        markdown,
        sourcePath,
        contentHash,
    });

    const chunks = chunkPolicyClauses(parsedPolicy.clauses);

    return prisma.$transaction(async (tx) => {
        const existingPolicyDocument = await tx.policyDocument.findFirst({
            where : {
                sourcePath,
            }
        });

        if(
            existingPolicyDocument &&
            existingPolicyDocument.contentHash === contentHash &&
            !FORCE_POLICY_RELOAD
        ){
            const existingChunkCount = await tx.policyChunk.count({
                where : {
                    policyDocumentId : existingPolicyDocument.id
                }
            });

            if(existingChunkCount > 0){
                return {
                    policyDocument : existingPolicyDocument,
                    chunkCount : existingChunkCount,
                    skipped : true,
                    reason : "UNCHANGED_CONTENT_HASH"
                }
            }
        }

        const policyDocument = existingPolicyDocument 
        ? await tx.policyDocument.update({
            where : {
                id : existingPolicyDocument.id
            },
            data : {
                title : parsedPolicy.metadata.title,
                insurerName : null,
                productType : parsedPolicy.metadata.productType,
                version : parsedPolicy.metadata.version,
                sourceType : parsedPolicy.metadata.sourceType,
                contentHash : parsedPolicy.metadata.contentHash,
            }
        })
        : await tx.policyDocument.create({
            data : {
                title : parsedPolicy.metadata.title,
                insurerName : null,
                productType : parsedPolicy.metadata.productType,
                version : parsedPolicy.metadata.version,
                sourcePath : parsedPolicy.metadata.sourcePath,
                sourceType : parsedPolicy.metadata.sourceType,
                contentHash : parsedPolicy.metadata.contentHash,
            }
        });

        await tx.policyChunk.deleteMany({
            where : {
                policyDocumentId : policyDocument.id
            }
        })

        if(chunks.length > 0){
            await tx.policyChunk.createMany({
                data : chunks.map((chunk) => ({
                    policyDocumentId : policyDocument.id,
                    chunkIndex : chunk.chunkIndex,
                    clauseId : chunk.clauseId,
                    sectionTitle : chunk.sectionTitle,
                    text : chunk.text,
                    tokenCount : chunk.tokenCount,
                }))
            })
        }

        return {
            policyDocument,
            chunkCount : chunks.length,
            skipped : false,
            reason : existingPolicyDocument ?
            "CONTENT_CHANGED_OR_FORCE_RELOAD"
            : "NEW_POLICY_DOCUMENT"
        }
    })
}

async function main(){
    const files = await listPolicyMarkdownFiles();

    if(files.length === 0){
        throw new Error(`No policy markdown files found in ${WEEK3_POLICY_DOCS_ROOT}`);
    }

    let documentCount = 0;
    let chunkCount = 0;
    let skippedCount = 0;
    let rebuiltCount = 0;

    console.log("Policy loading started");
    console.log(`FORCE_POLICY_RELOAD : ${FORCE_POLICY_RELOAD}`);
    console.log("");

    for(const filePath of files){
        const result = await loadPolicyFile(filePath);

        documentCount += 1;
        chunkCount += result.chunkCount;

        if(result.skipped){
            skippedCount += 1;
        }else{
            rebuiltCount += 1;
        }

        console.log(
            `${result.skipped ? "Skipped" : "Loaded"} policy : ${result.policyDocument.title}`,
        );
        
        console.log(`sourcePath : ${result.policyDocument.sourcePath}`);
        console.log(`chunks : ${result.chunkCount}`);
        console.log(`reason : ${result.reason}`)
        console.log("");
    }

    console.log("Policy loading complete.");
    console.log(`documents: ${documentCount}`);
    console.log(`chunks : ${chunkCount}`);
    console.log(`skipped : ${skippedCount}`);
    console.log(`Rebuilt : ${rebuiltCount}`);

    if(skippedCount > 0){
        console.log("");
        console.log("Unchanged policies were skipped, so existing chunk embeddings were preserved.")
    }
}

main()
    .catch((error) => {
        console.error("Failed to load policy documents.");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    })