import { readFile } from "node:fs/promises";
import { getGeminiClient, GEMINI_MODEL } from "../client/gemini-client";
import { CLAIM_EXTRACTION_SYSTEM_PROMPT, CLAIM_EXTRACTION_PROMPT_VERSION } from "./prompt";
import { ClaimExtractionSchema, type ClaimExtraction } from "@repo/shared/schemas";
import { CLAIM_EXTRACTION_RESPONSE_SCHEMA } from "./response-schema";
import { toRawModelOutput } from "../utils/raw-model-output";

export type ClaimExtractionResult = {
    model : string,
    promptVersion : string,
    rawModelOutput : unknown,
    extractedJson : ClaimExtraction,
    confidenceJson : {
        overallConfidence : number,
    }
};

function parseGeminiClaimResponse(responseText : string): ClaimExtraction{
    const parsed = JSON.parse(responseText);
    return ClaimExtractionSchema.parse(parsed);
}

function toClaimExtractionResult(params : {
    responseText : string,
    rawModelOutput : unknown,
}) : ClaimExtractionResult {
    const extractedJson = parseGeminiClaimResponse(params.responseText);

    return{
        model : GEMINI_MODEL,
        promptVersion : CLAIM_EXTRACTION_PROMPT_VERSION,
        rawModelOutput : params.rawModelOutput,
        extractedJson,
        confidenceJson : {
            overallConfidence : extractedJson.overallConfidence,
        },
    };
}


export async function extractClaimFromPdf(
    filePath : string
): Promise<ClaimExtractionResult>{
    const ai = getGeminiClient();
    const pdfBuffer = await readFile(filePath);

    const contents = [
        { text : CLAIM_EXTRACTION_SYSTEM_PROMPT },
        {
            inlineData : {
                mimeType : 'application/pdf',
                data : pdfBuffer.toString("base64"),
            }
        }
    ];

    const response = await ai.models.generateContent({
        model : GEMINI_MODEL,
        contents : contents,
        config : {
            responseMimeType : "application/json",
            responseSchema : CLAIM_EXTRACTION_RESPONSE_SCHEMA,
        }
    });

    if(!response.text){
        throw new Error("Gemini returned an empty extraction response");
    }

    return toClaimExtractionResult({
        responseText : response.text,
        rawModelOutput : toRawModelOutput(response),
    });
}

export async function extractClaimFromEmailText(
    contentText : string
): Promise<ClaimExtractionResult>{
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
        model : GEMINI_MODEL,
        contents : [
            { text : `${CLAIM_EXTRACTION_SYSTEM_PROMPT}
            Email Text:
            ${contentText}
            `},
        ],
        config: {
            responseMimeType : "application/json",
            responseSchema : CLAIM_EXTRACTION_RESPONSE_SCHEMA,
        }
    });

    if(!response.text){
        throw new Error("Gemini returned an empty extraction response");
    }

    return toClaimExtractionResult({
        responseText : response.text,
        rawModelOutput : toRawModelOutput(response),
    });
}