import type { ProposedAgentAction } from "@repo/shared/schemas";
import { claimflowTools } from "../tools";

// This executes only the parsed, already-allowed tool. It does not call LangChain.

type ClaimflowToolExecutable = {
    name : string;
    invoke : (input : unknown) => Promise<unknown> | unknown;
};

export async function executeAgentTool(
    proposedAction : ProposedAgentAction,
): Promise<unknown> {
    if(!proposedAction.toolName){
        return {
            ok : true,
            skipped : true,
            message : "No tool call to execute.",
            data : null,
        };
    }

    const executableTools = claimflowTools as readonly unknown[] as readonly ClaimflowToolExecutable[];

    const selectedTool = executableTools.find(
        (tool) => tool.name === proposedAction.toolName
    );

    if(!selectedTool){
        throw new Error(`No ClaimFlow tool registered for ${proposedAction.toolName}`)
    };

    const toolInput = proposedAction.toolInputJson &&
                    typeof proposedAction.toolInputJson === "object"
                    ? proposedAction.toolInputJson
                    : {};

    return selectedTool.invoke(toolInput);
};