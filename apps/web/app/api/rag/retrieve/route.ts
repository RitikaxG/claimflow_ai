import { retrievePolicyEvidence } from "@repo/rag";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RagRetrieveRequestBody = {
    question? : unknown;
    claimContext? : unknown;
    topKFinal? : unknown;
};

function isPlainObject(value : unknown) : value is Record<string, unknown>{
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRetrieveRequestBody(body : unknown): {
    question : string;
    claimContext? : unknown;
    topKFinal? : number;
}{
    if(!isPlainObject(body)){
        throw new Error("Request body must be a JSON object");
    }

    const typedBody = body as RagRetrieveRequestBody;

    if(typeof typedBody.question !== "string"){
        throw new Error("question must be a string");
    }

    const question = typedBody.question.trim();
    if(question.length < 5){
        throw new Error("question must be atleast 5 characters");
    }

    if(question.length > 1000){
        throw new Error("question must be at most 1000 characters");
    }

    let topKFinal : number | undefined;

    if(typedBody.topKFinal !== undefined){
        if(
            typeof typedBody.topKFinal !== "number" ||
            !Number.isInteger(typedBody.topKFinal)
        ){
            throw new Error("topKFinal must be an integer");
        }

        if(typedBody.topKFinal < 1 || typedBody.topKFinal > 20){
            throw new Error("topKFinal must be between 1 and 20");
        }

        topKFinal = typedBody.topKFinal;
    }
    return {
        question,
        claimContext: typedBody.claimContext,
        topKFinal
    }
}

export async function POST(req : Request){
    try{
        const body = await req.json();
        const input = validateRetrieveRequestBody(body);

        const result = await retrievePolicyEvidence({
            question : input.question,
            claimContext : input.claimContext,
            topKFinal : input.topKFinal ?? 5,
        });

        return NextResponse.json(
            {
                question : result.question,
                retrievalStatus : result.retrievalStatus,
                reason : result.reason,
                queryPlan : result.queryPlan,
                matches : result.matches,
            },
            { status : 200 },
        )
    }catch(error){
        console.error("Policy retrieval API failed",error);

        const message = error instanceof Error
            ? error.message
            : "Failed to retrieve policy evidence";

        const isValidationError =
            message.includes("question") ||
            message.includes("topKFinal") || 
            message.includes("Request body");

        return NextResponse.json(
            { error : message },
            { status : isValidationError ? 400 : 500 },
        )
    }
}