import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { ClaimExtractionResult } from "@repo/ai";
import { ClaimExtractionSchema } from "@repo/shared/schemas";

type MockBehaviour = "RETURN_GOLD_EXTRACTION" | "THROW_EXTRACTION_ERROR";

type MockManifest = {
    packetId : string;
    sourceType : "EMAIL_TEXT" | "PDF";
    documentPath : string;
    mockBehaviour : MockBehaviour;
}

type mockDocument = {
    filename : string;
    sourceType : "EMAIL_TEXT" | "PDF" | "IMAGE";
    contentText : string | null;
}

function getRepoRoot() {
    return process.cwd().endsWith("apps/web") 
    ? path.resolve(process.cwd(),"../..")
    : process.cwd();
}

function getDatasetRoot(){
    return path.resolve(
        getRepoRoot(),
        process.env.MOCK_DATASET_ROOT ??
        "sample-data/week-02-review-failures/packets"
    );
}

function extractPacketIdFromEmail(contentText : string | null){
    if(!contentText) return null;

    const match = contentText.match(/CLAIMFLOW_PACKET_ID:\s*(w2-[a-z0-9-]+)/i);
    return match?.[1] ?? null;
}

async function findPacketManifest(document : mockDocument){
    const datasetRoot = getDatasetRoot();
    const packetIdFromContent = extractPacketIdFromEmail(document.contentText);

    const packetDirs = await readdir(datasetRoot,{ withFileTypes : true });

    for(const dir of packetDirs){
        if(!dir.isDirectory()) continue;

        const packetDir = path.join(datasetRoot,dir.name);
        const manifestPath = path.join(packetDir,"manifest.json");

        const manifest = JSON.parse(
            await readFile(manifestPath,"utf-8"),
        ) as MockManifest;

        if(packetIdFromContent && manifest.packetId === packetIdFromContent){
            return { packetDir, manifest };
        }

        const expectedFilename = path.basename(document.filename);

        if(document.sourceType === "PDF" &&
            manifest.sourceType === "PDF" &&
            document.filename === expectedFilename
        ){
            return { packetDir, manifest };
        }
        
    }
    return null;
}

export async function maybeLoadMockExtractionResult(
    document : mockDocument,
): Promise<ClaimExtractionResult | null>{
    if(process.env.USE_MOCK_EXTRACTION !== "true"){
        return null;
    }

    const packet = await findPacketManifest(document);
    if(!packet){
        return null;
    }

    const { packetDir, manifest } = packet;
    if(manifest.mockBehaviour === "THROW_EXTRACTION_ERROR"){
        throw new Error(
            `Mock extraction failed: unreadable document for packet ${manifest.packetId}`,
        );
    }

    if(manifest.mockBehaviour !== "RETURN_GOLD_EXTRACTION"){
        throw new Error(
            `Unsupported mockBehavior ${manifest.mockBehaviour} for packet ${manifest.packetId}`,
        )
    }

    const goldPath = path.join(packetDir, "gold/extraction.gold.json");
    const goldRaw = JSON.parse(await readFile(goldPath,"utf-8"));

    const extractedJson = ClaimExtractionSchema.parse(goldRaw);

    return {
        model : "mock-extractor-v1",
        promptVersion : "mock-week-2-review-failures",
        rawModelOutput : {
            source: "week-02-review-failures",
            packetId : manifest.packetId,
            mockBehaviour : manifest.mockBehaviour,
            goldPath : path.relative(getRepoRoot(),goldPath),
        },
        extractedJson,
        confidenceJson:{
            overallConfidence : extractedJson.overallConfidence,
        }
    }
}