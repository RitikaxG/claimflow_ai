import { readFile } from "node:fs/promises";
import { getGeminiClient } from "./gemini-client";
import { GEMINI_MODEL } from "./gemini-client";
import { CLAIM_EXTRACTION_SYSTEM_PROMPT } from "./prompt";

const ai = getGeminiClient();

export async function extractClaimFromPdf(filePath : string){
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

    const response = (await ai).models.generateContent({
        model : GEMINI_MODEL,
        contents : contents,
    });

    return response;
}

export async function extractClaimFromEmailText(contentText : string){
    const response = (await ai).models.generateContent({
        model : GEMINI_MODEL,
        contents : contentText,
    })

    return response;
}