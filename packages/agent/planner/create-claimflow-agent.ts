import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { claimflowTools } from "../tools";
import { CLAIMFLOW_AGENT_SYSTEM_PROMPT } from "./agent-system-prompt";

export function createClaimflowAgent(){
    const model = new ChatGoogleGenerativeAI({
        model : process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
        temperature : 0,
        maxRetries : 2,
        apiKey : process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
    });

    return model.bindTools([...claimflowTools]); // model now knows which tools exists and can choose one
};

export function buildAgentUserMessage(input : unknown){
    return [
        "Choose the next ClaimFlow workflow tool for this claim state.",
        "",
        "Return exactly one tool call.",
        "Do not execute final claim decisions.",
        "Do not answer with prose unless no safe action exists.",
        "",
        "CLAIM_STATE:",
        JSON.stringify(input, null, 2),
    ].join("\n");
}

export { CLAIMFLOW_AGENT_SYSTEM_PROMPT };