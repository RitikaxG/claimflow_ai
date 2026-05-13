"use client";

import { create } from "zustand";
import axios from "axios";

export type RunStatus = 
    | "UPLOADED"
    | "EXTRACTING"
    | "VALIDATING"
    | "COMPLETED"
    | "NEEDS_REVIEW"
    | "FAILED";

export type ReviewTaskStatus = 
    | "PENDING"
    | "IN_REVIEW"
    | "APPROVED"
    | "EDITED_AND_APPROVED"
    | "REJECTED"
    | "NEEDS_MORE_INFO";

export type ReviewPriority = "LOW" | "NORMAL" | "HIGH";

export type ReviewDecisionRecord = {
    id : string,
    taskId : string,
    decision : string,
    coorectedJson : unknown | null,
    notes : string | null,
    reviewerName : string | null,
    createdAt : string,
};

export type ReviewEventRecord = {
    id : string,
    taskId : string,
    type : string,
    message : string,
    metadata : unknown | null,
    createdAt : string,
};

export type ReviewTaskRecord = {
    id : string,
    runId : string,
    status : ReviewTaskStatus,
    priority : ReviewPriority,
    reasonJson : unknown,
    assignedTo : string | null,
    startedAt : string | null,
    completedAt : string | null,
    createdAt : string,
    updatedAt : string,

    run : ExtractionEventRecord,
    decisions : ReviewDecisionRecord[],
    events : ReviewEventRecord[],
};

type ReviewTasksResponse = {
    reviewTasks : ReviewTaskRecord[],
}

type ReviewTaskResponse = {
    reviewTask : ReviewTaskRecord,
}

export type DocumentSourceType = "PDF" | "EMAIL_TEXT" | "IMAGE";

export type DocumentRecord = {
    id : string,
    filename : string,
    mimeType : string,
    sizeBytes : number,
    storagePath : string | null,
    contentText : string | null,
    sourceUrl : string | null,
    sourceType : DocumentSourceType,
    contentHash : string | null,
    deletedAt : string | null,
    deletedReason : string | null,
    createdAt : string,
    updatedAt : string,
};

export type ExtractionEventRecord = {
    id : string,
    document : DocumentRecord,
    runId : string,
    type : string,
    message : string,
    metadata : unknown,
    createdAt : string,
};

export type ExtractionRunRecord = {
    id : string,
    documentId : string,
    status : RunStatus,

    model : string | null,
    promptVersion : string | null,
    schemaVersion : string,

    rawModelOutput : unknown | null,
    extractedJson : unknown | null,
    validationJson : unknown | null,
    missingFieldsJson : unknown | null,
    confidenceJson : unknown | null,

    errorMessage : string | null,
    createdAt : string,
    updatedAt : string,

    document : DocumentRecord,
    events : ExtractionEventRecord[],
};

type UploadResponse = {
    duplicate? : boolean,
    restored? : boolean,
    message? : string,
    document : DocumentRecord,
    run : ExtractionRunRecord | null,
    event? : ExtractionEventRecord,
};

type RunsResponse = {
    runs : ExtractionRunRecord[],
};

type RunResponse = {
    run : ExtractionRunRecord,
};

type DeleteDocumentResponse = {
    document : DocumentRecord,
    affectedRunIds : string[],
    alreadyDeleted? : boolean,
    message? : string,
}

type DashboardStore = {
    runs : ExtractionRunRecord[],

    reviewTasks : ReviewTaskRecord[],
    selectedReviewTask : ReviewTaskRecord | null,

    selectedRun : ExtractionRunRecord | null,

    isFetchingRuns : boolean,
    isFetchingRun : boolean,

    isFetchingReviewTasks : boolean,
    isFetchingReviewTask : boolean,
    
    isUploadingPdf : boolean,
    isSubmittingEmail : boolean,

    isExtractingRun : boolean,
    isValidatingRun : boolean,

    deletingDocumentId : string | null,

    error : string | null,
    successMessage : string | null,

    fetchRuns : () => Promise<void>;
    fetchRun : (runId : string) => Promise<void>;

    fetchReviewTasks : () => Promise<void>;
    fetchReviewTask : (taskId : string) => Promise<void>;
    
    uploadPdf : (file : File) => Promise<void>;
    submitEmailText : (contentText : string) => Promise<void>;
    clearMessages : () => void;
    
    extractRun : (runId : string) => Promise<void>;
    validateRun : (runId : string) => Promise<void>;
    deleteDocument : (documentId : string, deletedReason? : string) => Promise<void>;
};

type ApiErrorResponse = {
  error?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
    runs : [],
    selectedRun : null,

    reviewTasks : [],
    selectedReviewTask : null,
    

    isFetchingRuns: false,
    isFetchingRun: false,

    isFetchingReviewTasks : false,
    isFetchingReviewTask : false,

    isUploadingPdf: false,
    isSubmittingEmail: false,

    isExtractingRun : false,
    isValidatingRun : false,

    deletingDocumentId : null,

    error: null,
    successMessage: null,

    clearMessages : () => {
        set({ error : null, successMessage : null })
    },

    fetchRuns: async () => {
        set({ isFetchingRuns : true, error : null });

        try{
            const res = await axios.get<RunsResponse>("/api/extraction-runs");

            set({
                runs : res.data.runs,
                isFetchingRuns : false,
            });
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to fetch recent runs."),
                isFetchingRuns : false,
            });
        }
    },

    fetchRun : async (runId : string) => {
        set({ isFetchingRun : true, error : null });

        try{
            const res = await axios.get<RunResponse>(
                `/api/extraction-runs/${runId}`
            );

            set({
                selectedRun : res.data.run,
                isFetchingRun : false,
            });
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to fetch run."),
                isFetchingRun : false,
            });
        }
    },

    uploadPdf : async(file : File) => {
        set({ isUploadingPdf : true, error : null });

        try{
            const formData = new FormData();
            formData.append("sourceType","PDF");
            formData.append("file",file);

            const res = await axios.post<UploadResponse>("api/documents/upload",formData);

            set({
                isUploadingPdf : false,
                successMessage : res.data.message ?? "PDF uploaded. Extraction run created.",
            });

            await get().fetchRuns();
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to upload PDF."),
                isUploadingPdf : false,
            });
        }
    },

    submitEmailText : async (contentText : string) => {
        set({ isSubmittingEmail : true, error : null });

        try{
            const formData = new FormData();
            formData.append("sourceType","EMAIL_TEXT");
            formData.append("contentText", contentText);

            const res = await axios.post<UploadResponse>("api/documents/upload",formData);

            set({
                isSubmittingEmail : false,
                successMessage : res.data.message ?? "Email text submitted. Extraction run created."
            });

            await get().fetchRuns();
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to submit email text."),
                isSubmittingEmail : false,
            });
        }
    },

    extractRun : async(runId : string) => {
        set({
            isExtractingRun : true,
            error : null,
            successMessage : null,
        });

        try{
            await axios.post(`/api/extraction-runs/${runId}/extract`);

            set({
                isExtractingRun : false,
                successMessage : "Extraction Completed. Structured JSON saved.",
            })

            await get().fetchRun(runId);
            await get().fetchRuns();
        } catch(error){
            set({
                error : getErrorMessage(error, "Failed to run extraction."),
                isExtractingRun : false,
            });

            await get().fetchRun(runId);
        }
    },

    validateRun : async(runId : string) => {
        set({
            isValidatingRun : true,
            error : null,
            successMessage : null,
        })

        try{
            await axios.post(`/api/extraction-runs/${runId}/validate`);

            set({
                isValidatingRun: false,
                successMessage : "Validation completed."
            });

            await get().fetchRun(runId);
            await get().fetchRuns();
            await get().fetchReviewTasks();
        } catch(error){
            set({
                error : getErrorMessage(error, "Failed to validate run."),
                isValidatingRun : false,
            })

            await get().fetchRun(runId);
        }
    },

    fetchReviewTasks : async () => {
        set({
            isFetchingReviewTasks : true,
            error : null,
        })
        try{
            const res = await axios.get<ReviewTasksResponse>("/api/review-tasks");

            set({
                reviewTasks : res.data.reviewTasks,
                isFetchingReviewTasks : false,
            })
        }catch(error){
            set({
                error : getErrorMessage(error,"Failed to fetch review tasks"),
                isFetchingReviewTasks : false,
            })
        }
    },

    fetchReviewTask : async ( taskId : string ) => {
        set({
            isFetchingReviewTask : false,
            error : null,
        })

        try{
            const res = await axios.get<ReviewTaskResponse>(
                `/api/review-tasks/${taskId}`
            );

            set({
                selectedReviewTask : res.data.reviewTask,
                isFetchingReviewTask : false
            })
        }catch(error){
            set({
                error : getErrorMessage(error, "Failed to fetch review task."),
                isFetchingReviewTask : false
            })
        }
    },

    deleteDocument : async (
        documentId : string,
        deletedReason = "Document no longer required.",
    ) => {
        set({
            deletingDocumentId : documentId,
            error : null,
            successMessage : null,
        });

        try{
            const res = await axios.delete<DeleteDocumentResponse>(
                `/api/documents/${documentId}`,
                {
                    data : {
                        deletedReason
                    },
                },
            );

            set({
                deletingDocumentId: null,
                successMessage : res.data.message ?? "Document soft deleted successfully."
            });

            await get().fetchRuns();
            await get().fetchReviewTasks();

            const selectedRun = get().selectedRun;
            if(selectedRun?.document.id === documentId){
                await get().fetchRun(selectedRun.id);
            }
        }catch(error){
            set({
                deletingDocumentId : null,
                error : getErrorMessage(error,"Failed to delete document."),
            })
        }
    }
}));