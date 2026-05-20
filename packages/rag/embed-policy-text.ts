import { getGeminiClient } from "@repo/ai";

/*
Gemini recommends asymmetric retrieval formatting where 
documents use title: {title} | text: {content} 
and 
question-answering queries use task: question answering | query: {content}.
*/

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 768;

export function formatPolicyChunkForEmbedding(input : {
    title : string;
    clauseId : string | null;
    sectionTitle : string | null;
    text : string;
}) {
    const clauseLabel = input.clauseId ? `Clause ${input.clauseId}` : "Clause unknown";
    const section = input.sectionTitle ?? "Untitled section";

    return `title: ${input.title} | text: ${clauseLabel} — ${section}\n\n${input.text}`;
}

export function formatQuestionForEmbedding(question : string){
    return `task : question answering | query : ${question}`;
}

export async function embedText(text : string) : Promise<number[]> {
    const ai = getGeminiClient();

    const response = await ai.models.embedContent({
        model : EMBEDDING_MODEL,
        contents : text,
        config : {
            outputDimensionality : EMBEDDING_DIMENSIONS,
        }
    });

    const values = response.embeddings?.[0]?.values;

    if(!values || values.length !== EMBEDDING_DIMENSIONS){
        throw new Error(`Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${values?.length ?? 0}`);
    }
    return values;
}