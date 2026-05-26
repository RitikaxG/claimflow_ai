export type ClaimflowToolResult<TData = unknown> = {
    ok: boolean;
    action : string;
    runId : string;
    message : string;
    data : TData;
    error? : string;
};

export function toolJson<TData>(result : ClaimflowToolResult<TData>) : string {
    return JSON.stringify(result,null,2);
};

export function okToolResult<TData>(input : {
    action : string;
    runId : string;
    message : string;
    data: TData;
}): string {
    return toolJson({
        ok : true,
        action : input.action,
        runId : input.runId,
        message : input.message,
        data : input.data,
    });
}

export function failedToolResult<TData>(input : {
    action : string;
    runId : string;
    message : string;
    error: string;
    data? : TData;
}) : string {
    return toolJson({
        ok : false,
        action : input.action,
        runId : input.runId,
        message : input.message,
        error : input.error,
        data : input.data ?? null,
    })
}

export function getErrorMessage(error : unknown) : string {
    return error instanceof Error ? error.message : "Unknown tool execution error.";
}