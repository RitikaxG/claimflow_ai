import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export function getGeminiClient(){
    if(!process.env.GEMINI_API_KEY){
        throw new Error("GEMINI_API_KEY is not configured");
    }

    return new GoogleGenAI({
        apiKey : process.env.GEMINI_API_KEY,
    });
}