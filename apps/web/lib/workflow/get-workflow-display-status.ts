export function getWorkflowDisplayStatus(run : {
    status : string;
    reviewTask? : { status : string } | null;
}){
    if(run.status === "FAILED") return "FAILED";
    if(run.status === "COMPLETED") return "AI_COMPLETED";
    if(run.status === "UPLOADED") return "UPLOADED";
    if(run.status === "EXTRACTING") return "EXTRACTING";
    if(run.status === "VALIDATING") return "VALIDATING";

    if(run.status === "NEEDS_REVIEW"){
        if(!run.reviewTask) return "NEEDS_REVIEW";

        if(run.reviewTask.status === "PENDING") return "REVIEW_PENDING";
        if(run.reviewTask.status === "IN_REVIEW") return "IN_HUMAN_REVIEW";
        if(run.reviewTask.status === "APPROVED") return "HUMAN_APPROVED";
        if(run.reviewTask.status === "EDITED_AND_APPROVED"){
            return "HUMAN_EDITED_AND_APPROVED";
        }
        if(run.reviewTask.status === "REJECTED") return "HUMAN_REJECTED";
        if(run.reviewTask.status === "NEEDS_MORE_INFO") return "NEEDS_MORE_INFO";
    }

    return run.status;
}